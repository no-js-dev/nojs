// ═══════════════════════════════════════════════════════════════════════
//  DOM HELPERS & REMOTE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════

import { _config, _log, _warn } from "./globals.js";
import { createContext } from "./context.js";
import { resolveUrl } from "./fetch.js";

// ─── Template HTML cache: url → html string ────────────────────────────────
// Avoids re-fetching the same .tpl file on repeat navigation.
// Controlled by _config.templates.cache (default: true).
// LRU-bounded (mirrors the expression cache in evaluate.js) so long-lived
// SPAs that visit many distinct template URLs don't grow the Map without limit.
// Size is governed by _config.templates.maxSize (default 200).
const _TEMPLATE_CACHE_DEFAULT_MAX = 200;
export const _templateHtmlCache = new Map();

function _templateCacheMax() {
  const m = _config.templates && _config.templates.maxSize;
  return typeof m === "number" && m > 0 ? m : _TEMPLATE_CACHE_DEFAULT_MAX;
}

// Read-with-LRU-bump: move a hit entry to the most-recently-used position.
export function _templateCacheGet(url) {
  if (!_templateHtmlCache.has(url)) return undefined;
  const v = _templateHtmlCache.get(url);
  _templateHtmlCache.delete(url);
  _templateHtmlCache.set(url, v);
  return v;
}

// Set-with-LRU-eviction: evict the oldest entry when at capacity.
export function _templateCacheSet(url, html) {
  const max = _templateCacheMax();
  if (_templateHtmlCache.has(url)) {
    _templateHtmlCache.delete(url); // refresh position before re-inserting
  } else if (_templateHtmlCache.size >= max) {
    _templateHtmlCache.delete(_templateHtmlCache.keys().next().value); // evict LRU
  }
  _templateHtmlCache.set(url, html);
}

// ─── In-flight template fetch dedup: url → Promise<string> ──────────────────
// Concurrent loaders of the same URL share a single fetch instead of each
// issuing its own request before the cache is written.
const _templateInflight = new Map();

// ─── DOMParser singleton — stateless, safe to reuse across calls ────────────
const _domParser = new DOMParser();

export function findContext(el) {
  let node = el;
  while (node) {
    if (node.__ctx) return node.__ctx;
    node = node.parentElement;
  }
  return createContext();
}

export function _clearDeclared(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) walker.currentNode.__declared = false;
}

export function _cloneTemplate(id) {
  if (!id) return null;
  const cleanId = id.startsWith("#") ? id.slice(1) : id;
  const tpl = document.getElementById(cleanId);
  if (!tpl) return null;
  return tpl.content ? tpl.content.cloneNode(true) : null;
}

// ─── SVG data URI deep-sanitization ──────────────────────────────────────────
// Strip JS vectors from raw SVG markup using DOMParser for robust sanitization.
// Regex-based approaches are bypassable via entity encoding and nested contexts.
function _sanitizeSvgContent(svg) {
  const doc = _domParser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.querySelector("parsererror") ||
      root.nodeName !== "svg" ||
      root.getElementsByTagNameNS("http://www.mozilla.org/newlayout/xml/parsererror.xml", "parsererror").length) {
    return "<svg></svg>";
  }
  function cleanAttrs(node) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) { node.removeAttribute(attr.name); continue; }
      if ((name === "href" || name === "xlink:href") &&
          attr.value.trim().toLowerCase().startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    }
  }
  for (const s of [...root.querySelectorAll("script")]) s.remove();
  cleanAttrs(root);
  for (const node of root.querySelectorAll("*")) cleanAttrs(node);
  return new XMLSerializer().serializeToString(root);
}

// base64-decode a string into a UTF-8 JS string (atob yields a Latin1 byte
// string; multibyte SVG content must be re-decoded as UTF-8).
function _b64DecodeUtf8(b64) {
  const bytes = atob(b64);
  if (typeof TextDecoder === "function") {
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new TextDecoder().decode(arr);
  }
  // Fallback: percent-decode the raw byte string into UTF-8.
  return decodeURIComponent(
    bytes.split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
  );
}

// base64-encode a UTF-8 JS string. btoa() throws on code points > 0xFF, so
// the string is first encoded to UTF-8 bytes (TextEncoder, with a percent-
// escape fallback) before being passed to btoa as a Latin1 byte string.
function _b64EncodeUtf8(str) {
  let byteStr;
  if (typeof TextEncoder === "function") {
    const arr = new TextEncoder().encode(str);
    let s = "";
    for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
    byteStr = s;
  } else {
    byteStr = unescape(encodeURIComponent(str));
  }
  return btoa(byteStr);
}

// Sanitize a data:image/svg+xml URI — handles both base64 and URL-encoded forms.
function _sanitizeSvgDataUri(str) {
  try {
    const b64 = str.match(/^data:image\/svg\+xml;base64,(.+)$/i);
    if (b64) {
      const clean = _sanitizeSvgContent(_b64DecodeUtf8(b64[1]));
      return "data:image/svg+xml;base64," + _b64EncodeUtf8(clean);
    }
    const comma = str.indexOf(",");
    if (comma === -1) return "#";
    const header = str.slice(0, comma + 1);
    const clean = _sanitizeSvgContent(decodeURIComponent(str.slice(comma + 1)));
    return header + encodeURIComponent(clean);
  } catch (_e) {
    return "#";
  }
}

// Structural HTML sanitizer — uses DOMParser to parse the markup before cleaning.
// Regex-based sanitizers are bypassable via SVG/MathML event handlers, nested
// srcdoc attributes, and HTML entity encoding (e.g. &#x6A;avascript:).
// DOMParser resolves entities and builds a real DOM tree, making all vectors
// uniformly detectable by a single attribute-name/value check.
//
// Custom hook: set _config.sanitizeHtml to a function to plug in an external
// sanitizer (e.g. DOMPurify) without bundling it as a hard dependency.
const _BLOCKED_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed',
  'base', 'form', 'meta', 'link', 'noscript',
  'svg', 'math', 'template', 'xmp', 'applet',
]);

export function _sanitizeHtml(html) {
  if (_config.dangerouslyDisableSanitize || !_config.sanitize) {
    _warn('HTML sanitization is DISABLED. This exposes your app to XSS attacks. Only disable for trusted content.');
    return html;
  }
  if (typeof _config.sanitizeHtml === 'function') return _config.sanitizeHtml(html);

  const doc = _domParser.parseFromString(html, 'text/html');

  function _clean(node) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType !== 1) continue; // text and comment nodes are safe
      if (_BLOCKED_TAGS.has(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }
      for (const attr of [...child.attributes]) {
        const n = attr.name.toLowerCase();
        const v = attr.value.toLowerCase().trimStart();
        const isUrlAttr = n === 'href' || n === 'src' || n === 'action' || n === 'xlink:href'
          || n === 'formaction' || n === 'poster' || n === 'data';
        const isDangerousScheme = v.startsWith('javascript:') || v.startsWith('vbscript:') || (isUrlAttr && v.startsWith('blob:'));
        const isDangerousData = isUrlAttr && v.startsWith('data:') && !/^data:image\//.test(v);
        if (n.startsWith('on') || isDangerousScheme || isDangerousData) {
          child.removeAttribute(attr.name);
        } else if (isUrlAttr && v.startsWith('data:image/svg+xml')) {
          // Deep-sanitize SVG data URIs to strip embedded <script> and on* handlers
          child.setAttribute(attr.name, _sanitizeSvgDataUri(attr.value));
        }
      }
      _clean(child);
    }
  }

  _clean(doc.body);
  return doc.body.innerHTML;
}

// Resolve a template src path.
// - "./foo.tpl"  → relative to the parent template's folder (__srcBase)
// - "/foo.tpl"   → absolute from server root (kept as-is for fetch)
// - "foo.tpl"    → relative to page URL (kept as-is for fetch)
function _resolveTemplateSrc(src, tpl) {
  if (src.startsWith("./")) {
    // Walk up to find the nearest ancestor with __srcBase
    let node = tpl.parentNode;
    while (node) {
      if (node.__srcBase) {
        return node.__srcBase + src.slice(2);
      }
      node = node.parentNode;
    }
    // No ancestor base found — strip "./" and resolve against the page URL via
    // resolveUrl so the result is an absolute URL. Returning a bare relative
    // string here would defeat _warnIfInsecureTemplateUrl's http:// check.
    return resolveUrl(src.slice(2), tpl);
  }
  // Absolute or plain relative — use the existing resolveUrl logic
  return resolveUrl(src, tpl);
}

// Warn when a template URL uses plain HTTP from an HTTPS page (mixed content / MITM risk).
// The optional pageProtocol parameter enables testing without mutating jsdom's
// non-configurable window.location.protocol property.
export function _warnIfInsecureTemplateUrl(resolvedUrl, src, pageProtocol) {
  const proto = pageProtocol !== undefined
    ? pageProtocol
    : (typeof window !== 'undefined' && window.location ? window.location.protocol : '');
  if (resolvedUrl.startsWith('http://') && proto === 'https:') {
    _warn('Template "' + src + '" is loaded over insecure HTTP from an HTTPS page. Use HTTPS to prevent tampering.');
  }
}

// Fetch a template's HTML, sharing in-flight requests and honoring the LRU
// cache. Returns the HTML string, or null on a non-OK / failed response.
// Concurrent callers for the same URL await the same fetch (dedup, #64).
async function _fetchTemplateHtml(resolvedUrl, useCache) {
  if (useCache) {
    const cached = _templateCacheGet(resolvedUrl);
    if (cached !== undefined) return { html: cached, hit: true };
  }
  let inflight = _templateInflight.get(resolvedUrl);
  if (!inflight) {
    inflight = (async () => {
      const res = await fetch(resolvedUrl);
      if (!res.ok) return { ok: false, status: res.status };
      const html = await res.text();
      if (useCache) _templateCacheSet(resolvedUrl, html);
      return { ok: true, html };
    })();
    _templateInflight.set(resolvedUrl, inflight);
  }
  try {
    const result = await inflight;
    if (!result.ok) return { html: null, status: result.status };
    return { html: result.html, hit: false };
  } finally {
    _templateInflight.delete(resolvedUrl);
  }
}

export async function _loadRemoteTemplates(root) {
  const scope = root || document;
  const templates = scope.querySelectorAll("template[src]");
  _log("[LRT] called on", scope === document ? "document" : scope.nodeName || "fragment", "— found", templates.length, "template[src]", [...templates].map(t => t.getAttribute("src")));
  if (!templates.length) return;
  const promises = [...templates].map(async (tpl) => {
    if (tpl.__srcLoaded) { _log("[LRT] SKIP (already loaded):", tpl.getAttribute("src")); return; }
    tpl.__srcLoaded = true;
    const src = tpl.getAttribute("src");
    const resolvedUrl = _resolveTemplateSrc(src, tpl);
    _warnIfInsecureTemplateUrl(resolvedUrl, src);
    // Track the folder of this template so children can use "./" paths
    const baseFolder = resolvedUrl.substring(0, resolvedUrl.lastIndexOf("/") + 1);
    try {
      const useCache = _config.templates.cache !== false;
      const { html, hit, status } = await _fetchTemplateHtml(resolvedUrl, useCache);
      if (html === null) {
        _warn("Failed to load template:", src, "HTTP", status);
        tpl.__loadFailed = true;
        return;
      }
      if (hit) _log("[LRT] CACHE HIT:", resolvedUrl);
      tpl.innerHTML = html;
      // Stamp the base folder onto the content so nested templates inherit it
      if (tpl.content) {
        tpl.content.__srcBase = baseFolder;
      }
      _log("Loaded remote template:", src, "→", resolvedUrl);
      // Recursively load nested remote templates
      await _loadRemoteTemplates(tpl.content || tpl);
      // Non-route templates are content-includes: replace them with
      // their loaded content so it actually renders (template elements
      // are inert — the browser never displays their .content).
      if (!tpl.hasAttribute("route") && tpl.parentNode) {
        // Transfer __srcBase to a wrapper so descendants keep the reference
        const frag = tpl.content;
        const children = [...frag.childNodes];
        const parent = tpl.parentNode;
        const ref = tpl.nextSibling;
        parent.removeChild(tpl);
        for (const child of children) {
          if (child.nodeType === 1) child.__srcBase = child.__srcBase || baseFolder;
          parent.insertBefore(child, ref);
        }
      }
    } catch (e) {
      _warn("Failed to load template:", src, e.message);
    }
  });
  await Promise.all(promises);
}

// ─── Single-element loader (core primitive) ────────────────────────────────
export async function _loadTemplateElement(tpl) {
  const src = tpl.getAttribute("src");
  if (tpl.__srcLoaded) { _log("[LTE] SKIP (already loaded):", src); return; }
  _log("[LTE] START fetch:", src, "| route:", tpl.hasAttribute("route"), "| inDOM:", document.contains(tpl), "| loading:", tpl.getAttribute("loading"));
  tpl.__srcLoaded = true;
  const resolvedUrl = _resolveTemplateSrc(src, tpl);
  _warnIfInsecureTemplateUrl(resolvedUrl, src);
  const baseFolder = resolvedUrl.substring(0, resolvedUrl.lastIndexOf("/") + 1);

  // Synchronously insert loading placeholder before the fetch begins
  let loadingMarker = null;
  const loadingId = tpl.getAttribute("loading");
  if (loadingId && tpl.parentNode) {
    const cleanId = loadingId.startsWith("#") ? loadingId.slice(1) : loadingId;
    const source = document.getElementById(cleanId);
    if (source && source.content) {
      loadingMarker = document.createElement("span");
      loadingMarker.style.cssText = "display:contents";
      loadingMarker.appendChild(source.content.cloneNode(true));
      tpl.parentNode.insertBefore(loadingMarker, tpl);
    }
  }

  try {
    const useCache = _config.templates.cache !== false;
    const { html, hit, status } = await _fetchTemplateHtml(resolvedUrl, useCache);
    if (html === null) {
      _warn("Failed to load template:", src, "HTTP", status);
      tpl.__loadFailed = true;
      if (loadingMarker) loadingMarker.remove();
      return;
    }
    if (hit) _log("[LTE] CACHE HIT:", resolvedUrl);
    tpl.innerHTML = html;
    if (tpl.content) {
      tpl.content.__srcBase = baseFolder;
    }
    _log("Loaded remote template:", src, "→", resolvedUrl);
    // Route templates: defer nested loading until after DOM insertion
    // (ensures loading="#id" placeholder lookup via getElementById works).
    // Content-include templates: load nested ones now.
    if (!tpl.hasAttribute("route")) {
      await _loadRemoteTemplates(tpl.content || tpl);
    } else if (useCache && tpl.content) {
      // Route templates: pre-warm HTML cache for nested subtemplates so
      // navigation finds cache hits instead of issuing network requests.
      // Only the HTML is fetched — no DOM processing or skeleton insertion.
      const nested = tpl.content.querySelectorAll("template[src]");
      const warmups = [...nested].map((sub) => {
        const subSrc = sub.getAttribute("src");
        const subUrl = _resolveTemplateSrc(subSrc, sub);
        // Reuse the shared cache + in-flight dedup so a warm-up and a real
        // navigation load of the same URL never double-fetch (#64).
        return _fetchTemplateHtml(subUrl, true).catch(() => {});
      });
      // Background pre-warm: intentionally non-blocking, but track the promise
      // on the element so completion/failure is observable rather than a
      // silent fire-and-forget (#79). Tests/tooling can await tpl.__warmup.
      tpl.__warmup = Promise.all(warmups);
    }
    // Remove loading placeholder once real content is ready
    if (loadingMarker) loadingMarker.remove();
    // Non-route templates are content-includes: inject content inline
    if (!tpl.hasAttribute("route") && tpl.parentNode) {
      const frag = tpl.content;
      const children = [...frag.childNodes];
      const parent = tpl.parentNode;
      const ref = tpl.nextSibling;
      parent.removeChild(tpl);
      for (const child of children) {
        if (child.nodeType === 1) child.__srcBase = child.__srcBase || baseFolder;
        parent.insertBefore(child, ref);
      }
    }
  } catch (e) {
    if (loadingMarker) loadingMarker.remove();
    _warn("Failed to load template:", src, e.message);
  }
}

// ─── Inline template includes (template[include="id"]) ────────────────────
// Synchronously clones a named inline template into every
// <template include="id"> placeholder. Called before any async fetch
// so skeleton/include content is stamped into the DOM immediately.
export function _processTemplateIncludes(root) {
  const scope = root || document;
  scope.querySelectorAll("template[include]").forEach((tpl) => {
    const id = tpl.getAttribute("include");
    const source = document.getElementById(id.startsWith("#") ? id.slice(1) : id);
    if (!source || !source.content) return;
    tpl.replaceWith(source.content.cloneNode(true));
  });
}

// ─── Phase 1 loader (priority + eager non-route + active route) ────────────
export async function _loadRemoteTemplatesPhase1(defaultRoutePath) {
  const all = [...document.querySelectorAll("template[src]")];

  // Phase 0: lazy="priority" templates — load first, regardless of route type
  const phase0 = all.filter(
    (tpl) => !tpl.__srcLoaded && tpl.getAttribute("lazy") === "priority"
  );
  await Promise.all(phase0.map(_loadTemplateElement));

  // Phase 1: non-route templates + the route matching defaultRoutePath
  // Skip lazy="ondemand" and lazy="priority" (already handled above)
  const phase1 = all.filter((tpl) => {
    if (tpl.__srcLoaded) return false;
    const lazy = tpl.getAttribute("lazy");
    if (lazy === "ondemand" || lazy === "priority") return false;
    const isRoute = tpl.hasAttribute("route");
    if (!isRoute) return true; // content-include: always Phase 1
    // Route template: only include if it matches the current default path
    return defaultRoutePath != null && tpl.getAttribute("route") === defaultRoutePath;
  });
  await Promise.all(phase1.map(_loadTemplateElement));
}

// ─── Phase 2 loader (background preload of remaining route templates) ──────
export function _loadRemoteTemplatesPhase2() {
  const all = [...document.querySelectorAll("template[src]")];
  const phase2 = all.filter((tpl) => {
    if (tpl.__srcLoaded) return false;
    if (tpl.getAttribute("lazy") === "ondemand") return false;
    return tpl.hasAttribute("route");
  });
  return Promise.all(phase2.map(_loadTemplateElement));
}
