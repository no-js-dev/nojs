// ═══════════════════════════════════════════════════════════════════════
//  CLIENT-SIDE ROUTER
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _log, _warn } from "./globals.js";
import { createContext } from "./context.js";
import { evaluate } from "./evaluate.js";

// Interpolates {expr} placeholders in a raw string (used for page-jsonld).
// Uses the same JSON-safe regex as the head-management directive — skips
// { starting with " or ' to avoid consuming JSON structural braces.
function _interpolateRaw(str, ctx) {
  return str.replace(/\{([^}"'{][^}]*)\}/g, (_, expr) => {
    try {
      const val = evaluate(expr.trim(), ctx);
      return val != null ? String(val) : "";
    } catch (_) { return ""; }
  });
}
import { findContext, _clearDeclared, _loadTemplateElement, _processTemplateIncludes } from "./dom.js";

function _isSafeRedirect(path) {
  if (!path || typeof path !== "string") return false;
  return path.startsWith("/") || path.startsWith("#") || path.startsWith(".");
}
import { processTree, _disposeTree } from "./registry.js";
import { _animateIn, _injectBuiltInStyles } from "./animations.js";
import { _devtoolsEmit } from "./devtools.js";

const _BUILTIN_404_HTML = '<div style="text-align:center;padding:3rem 1rem;font-family:system-ui,sans-serif"><h1 style="font-size:4rem;margin:0;opacity:.3">404</h1><p style="font-size:1.25rem;color:#666">Page not found</p></div>';

// ── View Transition API helpers ──────────────────────────────────────────────
let _navDirection = "forward"; // track navigation direction for transition types

function _getTransitionTypes(outletEls) {
  const types = new Set();
  for (const el of outletEls) {
    const t = el.getAttribute("transition");
    if (t && t !== "true") types.add(t);
  }
  types.add(_navDirection);
  return [...types];
}

function _useViewTransition() {
  return typeof document !== "undefined"
    && typeof document.startViewTransition === "function"
    && _config.router.viewTransition !== false;
}

function _clearOutlets() {
  for (const outletEl of document.querySelectorAll("[route-view]")) {
    _disposeTree(outletEl);
    outletEl.innerHTML = "";
  }
}

function _stripBase(pathname) {
  const base = (_config.router.base || "/").replace(/\/$/, "");
  if (!base) return pathname || "/";
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return pathname.replace(new RegExp("^" + escaped), "") || "/";
}

export function _createRouter() {
  const routes = [];
  const _wildcards = new Map();
  let current = { path: "", params: {}, query: {}, hash: "" };
  const listeners = new Set();
  const _autoTemplateCache = new Map();
  const _globalHandlers = [];

  function _getOrCreateEntry(path) {
    let entry = routes.find((r) => r.path === path);
    if (!entry) {
      // Pre-compile regex and extract param names at registration time
      // so matchRoute() doesn't rebuild them on every navigation.
      const paramNames = [];
      const pattern = path.replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return "([^/]+)";
      });
      const regex = new RegExp("^" + pattern + "$");
      entry = { path, outlets: {}, regex, paramNames };
      routes.push(entry);
    }
    return entry;
  }

  function parseQuery(search) {
    const params = {};
    new URLSearchParams(search).forEach((v, k) => {
      params[k] = v;
    });
    return params;
  }

  function matchRoute(path) {
    for (const route of routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        const paramNames = route.paramNames;
        for (let i = 0; i < paramNames.length; i++) {
          params[paramNames[i]] = match[i + 1];
        }
        return { route, params };
      }
    }
    return null;
  }

  async function navigate(path, replace = false) {
    // Track navigation direction for View Transition types.
    // Programmatic navigate (push) = forward. The popstate/hashchange
    // handlers pre-set _navDirection to "backward" before calling.
    if (!replace) {
      _navDirection = "forward";
    }

    const hashIdx = path.indexOf("#");
    const hash = hashIdx >= 0 ? path.slice(hashIdx + 1) : "";
    const withoutHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
    const [cleanPath, search = ""] = withoutHash.split("?");

    // Hash-only change — update state and scroll, skip re-render
    if (cleanPath === current.path && hash) {
      current.hash = "#" + hash;
      if (_config.router.useHash) {
        const newHash = "#" + path;
        if (replace) window.location.replace(newHash);
        else window.location.hash = path;
      } else {
        const fullPath = (_config.router.base || "/").replace(/\/$/, "") + path;
        if (replace) window.history.replaceState({}, "", fullPath);
        else window.history.pushState({}, "", fullPath);
      }
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      });
      listeners.forEach((fn) => fn(current));
      return;
    }

    current = {
      path: cleanPath,
      params: {},
      query: parseQuery(search),
      hash: hash ? "#" + hash : "",
    };

    const matched = matchRoute(cleanPath);
    if (matched) {
      current.matched = true;
      current.params = matched.params;

      // Guard check
      const tpl = matched.route.outlets?.["default"];
      const guardExpr = tpl?.getAttribute("guard");
      const redirectPath = tpl?.getAttribute("redirect");

      if (guardExpr) {
        const ctx = createContext({}, null);
        ctx.__raw.$store = _stores;
        ctx.__raw.$route = current;
        const allowed = evaluate(guardExpr, ctx);
        if (!allowed) {
          if (redirectPath && _isSafeRedirect(redirectPath)) {
            await navigate(redirectPath, true);
          } else if (redirectPath) {
            _warn(`Route guard redirect blocked — "${redirectPath}" is not a relative path.`);
            _clearOutlets();
          } else {
            _warn(`Route guard failed for "${path}" but no redirect is defined. The route will not render.`);
            _clearOutlets();
          }
          return;
        }
      }
    } else {
      current.matched = false;

      // Guard check on wildcard template (default outlet)
      const wildcardTpl = _wildcards.get("default");
      if (wildcardTpl) {
        const guardExpr = wildcardTpl.getAttribute("guard");
        const redirectPath = wildcardTpl.getAttribute("redirect");
        if (guardExpr) {
          const ctx = createContext({}, null);
          ctx.__raw.$store = _stores;
          ctx.__raw.$route = current;
          const allowed = evaluate(guardExpr, ctx);
          if (!allowed) {
            if (redirectPath && _isSafeRedirect(redirectPath)) {
              await navigate(redirectPath, true);
            } else if (redirectPath) {
              _warn(`Route guard redirect blocked — "${redirectPath}" is not a relative path.`);
              _clearOutlets();
            } else {
              _warn(`Route guard failed for "${path}" but no redirect is defined. The route will not render.`);
              _clearOutlets();
            }
            return;
          }
        }
      }
    }

    // Update URL
    if (_config.router.useHash) {
      const newHash = "#" + path;
      if (replace) window.location.replace(newHash);
      else window.location.hash = path;
    } else {
      const fullPath = (_config.router.base || "/").replace(/\/$/, "") + path;
      if (replace) window.history.replaceState({}, "", fullPath);
      else window.history.pushState({}, "", fullPath);
    }

    // Render — wrap in View Transition API when available and enabled
    const outletEls = document.querySelectorAll("[route-view]");
    const hasTransition = [...outletEls].some(el => el.getAttribute("transition"));

    if (_useViewTransition() && hasTransition) {
      // Ensure View Transition CSS presets are injected
      _injectBuiltInStyles();

      // Set unique view-transition-name per outlet to avoid duplicates
      for (const el of outletEls) {
        if (el.getAttribute("transition")) {
          const name = (el.getAttribute("route-view") || "").trim();
          el.style.viewTransitionName = name && name !== "default"
            ? "route-content-" + name
            : "route-content";
        }
      }

      const types = _getTransitionTypes(outletEls);
      const vt = document.startViewTransition({
        update: async () => {
          await _renderRoute(matched);
        },
        types,
      });

      vt.finished.catch((err) => {
        if (err.name !== "AbortError") {
          _warn("View transition failed:", err);
        }
      });

      // Wait for the DOM update to complete before firing listeners
      await vt.updateCallbackDone;
    } else {
      await _renderRoute(matched);
    }

    await _loadNestedIndexRoutes();

    listeners.forEach((fn) => fn(current));

    _devtoolsEmit("route:navigate", {
      path: current.path,
      params: current.params,
      query: current.query,
      hash: current.hash,
    });

    // Scroll to anchor if hash is present
    if (current.hash) {
      const anchorId = current.hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  // ── Route head attributes ────────────────────────────────────────────────────
  // Reads page-title, page-description, page-canonical, and page-jsonld from a
  // <template route> element and updates the corresponding <head> nodes.
  // Called once per navigation from the default outlet so only one route drives
  // the page's metadata at a time.
  //
  // All four attributes accept No.JS expressions; $route and $store are in scope.
  // page-jsonld is treated as a JSON string (no expression evaluation) and is
  // injected as-is into <script type="application/ld+json" data-nojs>.
  function _applyRouteHeadAttrs(tpl, current) {
    if (!document.head) return;
    const ctx = createContext({}, null);
    ctx.__raw.$route = current;
    ctx.__raw.$store = _stores;

    // page-title
    const titleExpr = tpl.getAttribute("page-title");
    if (titleExpr) {
      const val = evaluate(titleExpr, ctx);
      if (val != null) document.title = String(val);
    }

    // page-description → <meta name="description">
    const descExpr = tpl.getAttribute("page-description");
    if (descExpr) {
      const val = evaluate(descExpr, ctx);
      if (val != null) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = "description";
          document.head.appendChild(meta);
        }
        meta.content = String(val);
      }
    }

    // page-canonical → <link rel="canonical">
    const canonicalExpr = tpl.getAttribute("page-canonical");
    if (canonicalExpr) {
      const val = evaluate(canonicalExpr, ctx);
      if (val != null) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "canonical";
          document.head.appendChild(link);
        }
        link.href = String(val);
      }
    }

    // page-jsonld → <script type="application/ld+json" data-nojs>
    // Supports {placeholder} interpolation for dynamic values (e.g. $route.params.id).
    // Uses the JSON-safe regex that skips { starting with " or ' to preserve JSON structure.
    const jsonldAttr = tpl.getAttribute("page-jsonld");
    if (jsonldAttr) {
      let script = document.querySelector('script[type="application/ld+json"][data-nojs]');
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-nojs", "");
        document.head.appendChild(script);
      }
      script.textContent = _interpolateRaw(jsonldAttr, ctx).replace(/<\//g, '<\\/');
    }
  }

  // ── Helpers: fetch or retrieve a file-based template ──────────────────────
  // Creates (or retrieves from cache) a <template> element for the given src
  // path.  Returns the element — the caller must still call _loadTemplateElement
  // if __srcLoaded is false.
  function _getOrCreateAutoTemplate(baseSrc, segment, ext, outletName, routePath) {
    const fullSrc = baseSrc + segment + ext;
    const cacheKey = outletName + ":" + fullSrc;
    if (_autoTemplateCache.has(cacheKey)) {
      return _autoTemplateCache.get(cacheKey);
    }
    const tpl = document.createElement("template");
    tpl.setAttribute("src", fullSrc);
    tpl.setAttribute("route", routePath);
    document.body.appendChild(tpl);
    _autoTemplateCache.set(cacheKey, tpl);
    return tpl;
  }

  // ── Hierarchical segment resolution ──────────────────────────────────────
  // For multi-segment paths, try loading segment-by-segment layouts before
  // falling back to the flat path.
  async function _resolveHierarchicalTemplate(outletEl, outletName) {
    const configTemplates = _config.router.templates || "";
    if (!outletEl.hasAttribute("src") && !configTemplates) return null;

    const rawSrc = outletEl.getAttribute("src") || configTemplates;
    const baseSrc = rawSrc.replace(/\/?$/, "/");
    const ext = outletEl.getAttribute("ext") || _config.router.ext || ".tpl" || ".html";
    const indexName = outletEl.getAttribute("route-index") || "index";

    // For root path or single-segment paths, use flat resolution (original behavior)
    if (current.path === "/") {
      const segment = indexName;
      const tpl = _getOrCreateAutoTemplate(baseSrc, segment, ext, outletName, current.path);
      _log("[ROUTER] File-based route:", current.path, "→", baseSrc + segment + ext);
      // Auto i18n namespace
      if (outletEl.hasAttribute("i18n-ns") && !tpl.getAttribute("i18n-ns")) {
        tpl.setAttribute("i18n-ns", segment);
      }
      return { tpl, remainingSegments: [], baseSrc, ext, indexName };
    }

    const pathSegments = current.path.replace(/^\//, "").split("/").filter(Boolean);

    // Single segment — no hierarchy needed, use flat resolution
    if (pathSegments.length <= 1) {
      const segment = pathSegments[0] || indexName;
      const tpl = _getOrCreateAutoTemplate(baseSrc, segment, ext, outletName, current.path);
      _log("[ROUTER] File-based route:", current.path, "→", baseSrc + segment + ext);
      if (outletEl.hasAttribute("i18n-ns") && !tpl.getAttribute("i18n-ns")) {
        tpl.setAttribute("i18n-ns", segment);
      }
      return { tpl, remainingSegments: [], baseSrc, ext, indexName };
    }

    // Multi-segment path — try hierarchical layout resolution.
    const firstSegment = pathSegments[0];
    const layoutCacheKey = outletName + ":layout:" + baseSrc + firstSegment + ext;

    let layoutExists;
    if (_autoTemplateCache.has(layoutCacheKey)) {
      // We've already probed this layout path — check the cached result
      const cached = _autoTemplateCache.get(layoutCacheKey);
      layoutExists = cached && !cached.__loadFailed;
    } else {
      // Probe: try to load the layout template
      const layoutTpl = _getOrCreateAutoTemplate(baseSrc, firstSegment, ext, outletName, "/" + firstSegment);
      // Also cache under the layout-specific key for future probes
      _autoTemplateCache.set(layoutCacheKey, layoutTpl);

      if (!layoutTpl.__srcLoaded) {
        await _loadTemplateElement(layoutTpl);
      }
      layoutExists = !layoutTpl.__loadFailed;
    }

    if (layoutExists) {
      // Layout exists — render it and leave remaining segments for re-scan
      const layoutTpl = _autoTemplateCache.get(layoutCacheKey)
        || _getOrCreateAutoTemplate(baseSrc, firstSegment, ext, outletName, "/" + firstSegment);
      _log("[ROUTER] Hierarchical layout:", current.path, "→ layout", baseSrc + firstSegment + ext, "remaining:", pathSegments.slice(1));
      if (outletEl.hasAttribute("i18n-ns") && !layoutTpl.getAttribute("i18n-ns")) {
        layoutTpl.setAttribute("i18n-ns", firstSegment);
      }
      return { tpl: layoutTpl, remainingSegments: pathSegments.slice(1), baseSrc, ext, indexName };
    }

    // Layout doesn't exist — fall back to flat resolution (original behavior)
    const flatSegment = pathSegments.join("/");
    const tpl = _getOrCreateAutoTemplate(baseSrc, flatSegment, ext, outletName, current.path);
    _log("[ROUTER] File-based route (flat fallback):", current.path, "→", baseSrc + flatSegment + ext);
    if (outletEl.hasAttribute("i18n-ns") && !tpl.getAttribute("i18n-ns")) {
      tpl.setAttribute("i18n-ns", flatSegment);
    }
    return { tpl, remainingSegments: [], baseSrc, ext, indexName };
  }

  // ── Route-index auto-load ────────────────────────────────────────────────
  // Scan for nested [route-view] outlets that declare a route-index and are
  // still empty (no child elements). Load their default template.
  async function _loadNestedIndexRoutes() {
    const outlets = document.querySelectorAll("[route-view][route-index]");
    for (const outlet of outlets) {
      if (outlet.children.length > 0) continue;

      const indexName = outlet.getAttribute("route-index");
      if (!indexName) continue;

      const outletName = (outlet.getAttribute("route-view") || "").trim() || "default";
      const ext = outlet.getAttribute("ext") || _config.router.ext || ".tpl";

      let rawSrc = outlet.getAttribute("src");
      if (rawSrc && rawSrc.startsWith("./")) {
        let node = outlet.parentNode;
        while (node) {
          if (node.__srcBase) {
            rawSrc = node.__srcBase + rawSrc.slice(2);
            break;
          }
          node = node.parentNode;
        }
        if (rawSrc.startsWith("./")) rawSrc = rawSrc.slice(2);
      }
      const baseSrc = rawSrc ? rawSrc.replace(/\/?$/, "/") : "";

      const tpl = _getOrCreateAutoTemplate(baseSrc, indexName, ext, outletName, "/" + indexName);
      if (tpl.getAttribute("src") && !tpl.__srcLoaded) {
        await _loadTemplateElement(tpl);
      }
      if (tpl.__loadFailed) continue;
      // Remove route attr so the prefetcher doesn't pick up this nested-index template
      tpl.removeAttribute("route");

      _log("[ROUTER] Nested index route:", baseSrc + indexName + ext);

      if (outlet.hasAttribute("i18n-ns") && !tpl.getAttribute("i18n-ns")) {
        tpl.setAttribute("i18n-ns", indexName);
      }

      _disposeTree(outlet);
      outlet.innerHTML = "";

      const i18nNs = tpl.getAttribute("i18n-ns");
      if (i18nNs) {
        const { _loadI18nNamespace } = await import("./i18n.js");
        await _loadI18nNamespace(i18nNs);
      }

      const clone = tpl.content.cloneNode(true);
      const routeCtx = createContext({ $route: current }, findContext(outlet));
      const wrapper = document.createElement("div");
      wrapper.style.display = "contents";
      wrapper.__ctx = routeCtx;
      if (tpl.content.__srcBase) wrapper.__srcBase = tpl.content.__srcBase;
      wrapper.appendChild(clone);
      outlet.appendChild(wrapper);

      _processTemplateIncludes(wrapper);
      const nestedTpls = [...wrapper.querySelectorAll("template[src]")];
      await Promise.all(nestedTpls.map(_loadTemplateElement));

      _clearDeclared(wrapper);
      processTree(wrapper);
    }
  }

  // ── Post-render outlet re-scan ──────────────────────────────────────────
  // After rendering a layout, scan for newly appeared [route-view] outlets
  // and resolve remaining path segments into them. Recurses for N levels.
  async function _resolveNestedOutlets(parentEl, remainingSegments, baseSrc, ext, indexName, renderedPaths) {
    if (!remainingSegments.length) return;

    // Find NEW [route-view] outlets inside the just-rendered content
    const nestedOutlets = [...parentEl.querySelectorAll("[route-view]")];
    if (!nestedOutlets.length) return;

    const nextSegment = remainingSegments[0];
    const childRemaining = remainingSegments.slice(1);

    for (const nestedOutlet of nestedOutlets) {
      const nestedName = (nestedOutlet.getAttribute("route-view") || "").trim() || "default";

      // Use the nested outlet's own src if present, otherwise inherit baseSrc.
      // Resolve "./" relative paths against the parent template's __srcBase.
      let nestedRawSrc = nestedOutlet.getAttribute("src");
      if (nestedRawSrc && nestedRawSrc.startsWith("./")) {
        let node = nestedOutlet.parentNode;
        while (node) {
          if (node.__srcBase) {
            nestedRawSrc = node.__srcBase + nestedRawSrc.slice(2);
            break;
          }
          node = node.parentNode;
        }
        if (nestedRawSrc.startsWith("./")) nestedRawSrc = nestedRawSrc.slice(2);
      }
      const nestedBaseSrc = nestedRawSrc
        ? nestedRawSrc.replace(/\/?$/, "/")
        : baseSrc;
      const nestedExt = nestedOutlet.getAttribute("ext") || ext;

      // Guard against infinite loops: same outlet + same segment = stop
      const loopKey = nestedName + ":" + nestedBaseSrc + nextSegment;
      if (renderedPaths.has(loopKey)) {
        _warn("[ROUTER] Infinite loop detected for nested outlet:", loopKey);
        continue;
      }
      renderedPaths.add(loopKey);

      // Determine whether this segment is a layout (has further segments)
      // or a leaf template
      let tpl;
      let segmentRemaining = childRemaining;

      if (childRemaining.length > 0) {
        // More segments remain — try this segment as a layout first
        const layoutCacheKey = nestedName + ":layout:" + nestedBaseSrc + nextSegment + nestedExt;
        if (!_autoTemplateCache.has(layoutCacheKey)) {
          const layoutTpl = _getOrCreateAutoTemplate(nestedBaseSrc, nextSegment, nestedExt, nestedName, "/" + nextSegment);
          _autoTemplateCache.set(layoutCacheKey, layoutTpl);
          if (!layoutTpl.__srcLoaded) {
            await _loadTemplateElement(layoutTpl);
          }
        }
        const cached = _autoTemplateCache.get(layoutCacheKey);
        if (cached && !cached.__loadFailed) {
          tpl = cached;
          _log("[ROUTER] Nested layout:", nextSegment, "→", nestedBaseSrc + nextSegment + nestedExt);
        } else {
          // No layout — try flat path with all remaining segments
          const flatSegment = [nextSegment, ...childRemaining].join("/");
          tpl = _getOrCreateAutoTemplate(nestedBaseSrc, flatSegment, nestedExt, nestedName, current.path);
          segmentRemaining = [];
          _log("[ROUTER] Nested flat fallback:", nextSegment, "→", nestedBaseSrc + flatSegment + nestedExt);
        }
      } else {
        // Leaf segment — load directly
        tpl = _getOrCreateAutoTemplate(nestedBaseSrc, nextSegment, nestedExt, nestedName, current.path);
        _log("[ROUTER] Nested leaf:", nextSegment, "→", nestedBaseSrc + nextSegment + nestedExt);
      }

      // Load template if needed
      if (tpl.getAttribute("src") && !tpl.__srcLoaded) {
        await _loadTemplateElement(tpl);
      }

      if (tpl.__loadFailed) {
        // Try wildcard, then built-in 404
        const wildcardTpl = _wildcards.get(nestedName)
          || (nestedName !== "default" ? _wildcards.get("default") : null);
        if (wildcardTpl && !wildcardTpl.__loadFailed) {
          tpl = wildcardTpl;
          if (tpl.getAttribute("src") && !tpl.__srcLoaded) {
            await _loadTemplateElement(tpl);
          }
        }
        if (!tpl || tpl.__loadFailed) {
          _disposeTree(nestedOutlet);
          nestedOutlet.innerHTML = _BUILTIN_404_HTML;
          continue;
        }
      }

      // Render template into the nested outlet
      _disposeTree(nestedOutlet);
      nestedOutlet.innerHTML = "";

      // i18n namespace loading
      const i18nNs = tpl.getAttribute("i18n-ns");
      if (i18nNs) {
        const { _loadI18nNamespace } = await import("./i18n.js");
        await _loadI18nNamespace(i18nNs);
      }

      const clone = tpl.content.cloneNode(true);
      const routeCtx = createContext(
        { $route: current },
        findContext(nestedOutlet),
      );
      const wrapper = document.createElement("div");
      wrapper.style.display = "contents";
      wrapper.__ctx = routeCtx;
      if (tpl.content.__srcBase) wrapper.__srcBase = tpl.content.__srcBase;
      wrapper.appendChild(clone);
      nestedOutlet.appendChild(wrapper);

      _processTemplateIncludes(wrapper);
      const nestedTpls = [...wrapper.querySelectorAll("template[src]")];
      await Promise.all(nestedTpls.map(_loadTemplateElement));

      _clearDeclared(wrapper);
      processTree(wrapper);

      // Recurse — resolve further segments into outlets introduced by this template
      if (segmentRemaining.length > 0) {
        await _resolveNestedOutlets(wrapper, segmentRemaining, nestedBaseSrc, nestedExt, indexName, renderedPaths);
      }
    }
  }

  async function _renderRoute(matched) {
    // Snapshot existing outlets BEFORE rendering
    const outletEls = document.querySelectorAll("[route-view]");
    for (const outletEl of outletEls) {
      // Skip outlets detached from the DOM (cleared by a previous iteration)
      if (!outletEl.isConnected) continue;

      // Skip nested outlets — they are handled by _resolveNestedOutlets or _loadNestedIndexRoutes
      if (outletEl.parentElement && outletEl.parentElement.closest("[route-view]")) continue;

      // Determine outlet name ("" or missing attribute value → "default")
      const outletAttr = outletEl.getAttribute("route-view");
      const outletName = outletAttr && outletAttr.trim() !== "" ? outletAttr.trim() : "default";

      // Find the template for this outlet in the matched route
      let tpl = matched?.route?.outlets?.[outletName];

      // ── File-based routing: hierarchical segment resolution ──
      let remainingSegments = [];
      let resolvedBaseSrc = "";
      let resolvedExt = "";
      let resolvedIndexName = "index";
      const configTemplates = _config.router.templates || "";
      if (!tpl && (outletEl.hasAttribute("src") || configTemplates)) {
        const resolved = await _resolveHierarchicalTemplate(outletEl, outletName);
        if (resolved) {
          tpl = resolved.tpl;
          remainingSegments = resolved.remainingSegments;
          resolvedBaseSrc = resolved.baseSrc;
          resolvedExt = resolved.ext;
          resolvedIndexName = resolved.indexName;
        }
      }

      // ── Wildcard / 404 fallback when no template matched ──
      if (!tpl || tpl.__loadFailed) {
        // Only apply wildcard fallback when no explicit route matched
        // or when a file-based template failed to load.
        // When an explicit route matched but doesn't cover this outlet, just clear it.
        if (!matched || tpl?.__loadFailed) {
          const wildcardTpl = _wildcards.get(outletName)
            || (outletName !== "default" ? _wildcards.get("default") : null);
          if (wildcardTpl) {
            tpl = wildcardTpl;
          }
        }
      }

      // Always clear first — dispose watchers/listeners before wiping DOM
      _disposeTree(outletEl);
      outletEl.innerHTML = "";

      if (tpl && !tpl.__loadFailed) {
        // Load template on-demand if not yet fetched
        if (tpl.getAttribute("src") && !tpl.__srcLoaded) {
          _log("Loading route template on demand:", tpl.getAttribute("src"));
          await _loadTemplateElement(tpl);
        }

        // If template load failed, try wildcard fallback
        if (tpl.__loadFailed) {
          const wildcardTpl = _wildcards.get(outletName)
            || (outletName !== "default" ? _wildcards.get("default") : null);
          if (wildcardTpl && !wildcardTpl.__loadFailed) {
            tpl = wildcardTpl;
            if (tpl.getAttribute("src") && !tpl.__srcLoaded) {
              await _loadTemplateElement(tpl);
            }
          }
          // If still failed (no usable wildcard, or wildcard itself failed), use built-in
          if (!tpl || tpl.__loadFailed) {
            outletEl.innerHTML = _BUILTIN_404_HTML;
            continue;
          }
        }

        // i18n namespace loading for route template
        const i18nNs = tpl.getAttribute("i18n-ns");
        if (i18nNs) {
          const { _loadI18nNamespace } = await import("./i18n.js");
          await _loadI18nNamespace(i18nNs);
        }

        const clone = tpl.content.cloneNode(true);

        const routeCtx = createContext(
          { $route: current },
          findContext(outletEl),
        );
        const wrapper = document.createElement("div");
        wrapper.style.display = "contents";
        wrapper.__ctx = routeCtx;
        // Preserve __srcBase so nested ./relative template paths resolve correctly.
        // cloneNode() copies DOM nodes but NOT custom JS properties, so we must
        // re-stamp it on the wrapper element (which IS in the ancestor chain).
        if (tpl.content.__srcBase) wrapper.__srcBase = tpl.content.__srcBase;
        wrapper.appendChild(clone);
        // Insert into live DOM first so nested template loading has DOM access
        // (required for loading="#id" skeleton placeholder lookups via getElementById)
        outletEl.appendChild(wrapper);

        // Process inline template includes synchronously (e.g. template[include])
        _processTemplateIncludes(wrapper);
        // Load each nested template individually via _loadTemplateElement so that:
        //   1. The loading="#id" skeleton placeholder attribute is honoured
        //   2. getElementById can resolve the skeleton (wrapper is already in live DOM)
        //   3. No batch-recursion on a live DOM node (avoids re-entrant fetch loops)
        const nestedTpls = [...wrapper.querySelectorAll("template[src]")];
        _log("[ROUTER] nested templates found in wrapper:", nestedTpls.length, nestedTpls.map(t => t.getAttribute("src") + (t.__srcLoaded ? "[LOADED]" : "[NEW]")));
        await Promise.all(nestedTpls.map(_loadTemplateElement));
        _log("[ROUTER] all nested loads done for route:", current.path);

        const transition = outletEl.getAttribute("transition");
        if (transition && !_useViewTransition()) {
          _animateIn(wrapper, null, transition);
          _warn("Class-based route transitions are deprecated. The View Transition API is now used by default. Set router.viewTransition to false to keep legacy behavior.");
        }

        _clearDeclared(wrapper);
        processTree(wrapper);

        // ── Post-render outlet re-scan ──────────────────────────────────
        // If this was a hierarchical layout render with remaining segments,
        // re-scan the just-rendered content for new [route-view] outlets and
        // resolve the remaining path segments into them.
        if (remainingSegments.length > 0) {
          const renderedPaths = new Set();
          await _resolveNestedOutlets(wrapper, remainingSegments, resolvedBaseSrc, resolvedExt, resolvedIndexName, renderedPaths);
        }

        // page-title: update document.title if the route template declares one.
        // Accepts both a static string literal and a full No.JS expression:
        //   page-title="'About Us | Site'"          ← static
        //   page-title="'Product ' + $route.params.id + ' | Store'"  ← expression
        // $route and $store are available as implicit variables.
        // Only applied from the "default" outlet to avoid overwriting with a
        // secondary outlet's (e.g. sidebar) title.
        if (outletName === "default") {
          const pageTitleExpr = tpl.getAttribute("page-title");
          if (pageTitleExpr) {
            const titleCtx = createContext({}, null);
            titleCtx.__raw.$route = current;
            titleCtx.__raw.$store = _stores;
            const title = evaluate(pageTitleExpr, titleCtx);
            if (title != null) document.title = String(title);
          }
        }
        // Update <head> metadata from route template attributes.
        if (outletName === "default") _applyRouteHeadAttrs(tpl, current);

        // Focus management: move focus to the new content when focusBehavior is "auto".
        // Only applied to the default outlet to avoid fighting with secondary outlets.
        // Placed here — after the awaits for both the main template and all nested
        // template[src] loads — so focus fires only after all async content is injected.
        // Uses requestAnimationFrame so the focus fires after the browser has painted.
        if (outletName === "default" && _config.router.focusBehavior === "auto") {
          requestAnimationFrame(() => {
            const focusTarget =
              outletEl.querySelector("[autofocus]") ||
              outletEl.querySelector('[tabindex="-1"]') ||
              outletEl.querySelector("h1") ||
              outletEl;
            if (!focusTarget.hasAttribute("tabindex")) {
              focusTarget.setAttribute("tabindex", "-1");
            }
            focusTarget.focus({ preventScroll: true });
          });
        }
      } else if (!matched || tpl?.__loadFailed) {
        // No route matched and no wildcard — inject built-in 404
        outletEl.innerHTML = _BUILTIN_404_HTML;
      }
    }

    // Update active classes
    document.querySelectorAll("[route]").forEach((link) => {
      const routePath = link.getAttribute("route");
      const activeClass = link.getAttribute("route-active") || "active";
      const exactClass = link.getAttribute("route-active-exact");

      if (exactClass) {
        link.classList.toggle(exactClass, current.path === routePath);
      } else if (activeClass && !link.hasAttribute("route-active-exact")) {
        const isActive = routePath === "/"
          ? current.path === "/"
          : current.path.startsWith(routePath);
        link.classList.toggle(activeClass, isActive);
      }
    });

    // Scroll behavior
    const scrollBehavior = _config.router.scrollBehavior;
    if (scrollBehavior === "top") {
      window.scrollTo(0, 0);
    } else if (scrollBehavior === "smooth") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // "preserve" — do nothing, keep current scroll position
  }

  function _scrollToAnchor(id, el) {
    el.scrollIntoView({ behavior: "smooth" });

    // Update active class on anchor links that point to "#<id>"
    const selector = 'a[href="#' + id + '"]';
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      if (!a.hasAttribute("route")) {
        a.classList.toggle("active", a.matches(selector));
      }
    });
  }

  function _prefetchRoutes() {
    const outletEls = document.querySelectorAll("[route-view]");
    for (const outletEl of outletEls) {
      // Skip nested outlets — they get templates loaded during navigation
      if (outletEl.parentElement && outletEl.parentElement.closest("[route-view]")) continue;
      const rawSrc = outletEl.getAttribute("src") || _config.router.templates || "";
      if (!rawSrc) continue;
      const baseSrc = rawSrc.replace(/\/?$/, "/");
      const ext = outletEl.getAttribute("ext") || _config.router.ext || ".tpl" || ".html";
      const indexName = outletEl.getAttribute("route-index") || "index";
      const outletName = (outletEl.getAttribute("route-view") || "").trim() || "default";

      // Collect routes from links, keeping most aggressive lazy level per path
      const routeLazy = new Map();
      document.querySelectorAll("[route]:not([route-view])").forEach((link) => {
        const raw = link.getAttribute("route");
        if (!raw) return;
        const path = raw.split("?")[0].split("#")[0];
        const lazy = link.getAttribute("lazy");
        const prev = routeLazy.get(path);
        if (!routeLazy.has(path) || lazy === "priority" ||
            (prev === "ondemand" && lazy !== "ondemand")) {
          routeLazy.set(path, lazy);
        }
      });

      const priorityFetches = [];
      const backgroundFetches = [];

      for (const [path, lazy] of routeLazy) {
        if (lazy === "ondemand" || path === current.path || path === "*") continue;
        const segment = path === "/" ? indexName : path.replace(/^\//, "");
        const pathSegments = path === "/" ? [] : path.replace(/^\//, "").split("/").filter(Boolean);

        // Layout-aware prefetch: when a segment is a known layout, prefetch
        // the child template instead of the flat path.
        if (pathSegments.length > 1) {
          const firstSegment = pathSegments[0];
          const layoutCacheKey = outletName + ":layout:" + baseSrc + firstSegment + ext;
          const layoutCached = _autoTemplateCache.get(layoutCacheKey);

          if (layoutCached && !layoutCached.__loadFailed) {
            // Layout is known — prefetch the child template
            const childSegment = pathSegments.join("/");
            const childTpl = _getOrCreateAutoTemplate(baseSrc, childSegment, ext, outletName, path);
            if (!childTpl.__srcLoaded) {
              _log("[ROUTER] Prefetch (layout child):", path, "→", baseSrc + childSegment + ext, lazy === "priority" ? "(priority)" : "(background)");
              if (outletEl.hasAttribute("i18n-ns")) {
                childTpl.setAttribute("i18n-ns", childSegment);
              }
              if (lazy === "priority") priorityFetches.push(childTpl);
              else backgroundFetches.push(childTpl);
            }
            // Layout itself is already cached/loaded — no need to prefetch it again
            continue;
          }
        }

        // ── Flat path prefetch (original behavior) ────────────────────────
        const fullSrc = baseSrc + segment + ext;
        const cacheKey = outletName + ":" + fullSrc;
        if (_autoTemplateCache.has(cacheKey)) continue;

        const tpl = _getOrCreateAutoTemplate(baseSrc, segment, ext, outletName, path);
        _log("[ROUTER] Prefetch:", path, "→", fullSrc, lazy === "priority" ? "(priority)" : "(background)");

        if (outletEl.hasAttribute("i18n-ns")) {
          tpl.setAttribute("i18n-ns", segment);
        }

        if (lazy === "priority") priorityFetches.push(tpl);
        else backgroundFetches.push(tpl);
      }

      if (priorityFetches.length || backgroundFetches.length) {
        Promise.all(priorityFetches.map(_loadTemplateElement)).then(() => {
          backgroundFetches.forEach(_loadTemplateElement);
        });
      }
    }
  }

  const router = {
    get current() {
      return current;
    },
    push(path) {
      return navigate(path);
    },
    replace(path) {
      return navigate(path, true);
    },
    back() {
      window.history.back();
    },
    forward() {
      window.history.forward();
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    register(path, templateEl, outlet = "default") {
      if (path === "*") {
        _wildcards.set(outlet, templateEl);
        return;
      }
      const entry = _getOrCreateEntry(path);
      entry.outlets[outlet] = templateEl;
    },
    async init() {
      // Warn when hash mode is active: hash URLs are not indexed as separate pages by search engines.
      // Suppress with: NoJS.config({ router: { suppressHashWarning: true } })
      if (_config.router.useHash && !_config.router.suppressHashWarning) {
        _warn("Router is running in hash mode (useHash: true). URLs like /#/about are not indexed as separate pages by search engines. Use useHash: false with a server-side SPA fallback (try_files) for SEO-friendly routing. See: https://github.com/ErickXavier/no-js/blob/main/docs/md/routing.md#deployment");
      }

      // Collect route templates
      document.querySelectorAll("template[route]").forEach((tpl) => {
        const path = tpl.getAttribute("route");
        const outlet = tpl.getAttribute("outlet") || "default";
        if (path === "*") {
          _wildcards.set(outlet, tpl);
          return;
        }
        const entry = _getOrCreateEntry(path);
        entry.outlets[outlet] = tpl;
      });

      // Bind route links
      const _clickHandler = (e) => {
        const link = e.target.closest("[route]");
        if (link && !link.hasAttribute("route-view")) {
          e.preventDefault();
          const path = link.getAttribute("route");
          navigate(path);
          return;
        }

        // Intercept plain anchor links (href="#id") in BOTH modes
        // so they scroll to the target element without triggering
        // route navigation or popstate re-renders.
        const anchor = e.target.closest('a[href^="#"]');
        if (anchor && !anchor.hasAttribute("route")) {
          const href = anchor.getAttribute("href");
          const id = href.slice(1);
          if (id && !id.startsWith("/")) {
            const target = document.getElementById(id);
            if (target) {
              e.preventDefault();
              _scrollToAnchor(id, target);
              // In history mode, update URL hash without triggering popstate
              if (!_config.router.useHash) {
                window.history.replaceState(null, "", "#" + id);
              }
            }
          }
        }
      };
      document.addEventListener("click", _clickHandler);
      _globalHandlers.push(() => document.removeEventListener("click", _clickHandler));

      // Listen for URL changes
      if (_config.router.useHash) {
        const _hashchangeHandler = () => {
          _navDirection = "backward"; // conservative default for hashchange/back
          const raw = window.location.hash.slice(1) || "/";
          if (!raw.startsWith("/")) {
            const el = document.getElementById(raw);
            if (el) {
              _scrollToAnchor(raw, el);
              window.history.replaceState(null, "", "#" + current.path);
            }
            return;
          }
          // Skip if path unchanged (prevents double-processing from programmatic hash set)
          const [p] = raw.split("?");
          if (p === current.path) return;
          navigate(raw, true);
        };
        window.addEventListener("hashchange", _hashchangeHandler);
        _globalHandlers.push(() => window.removeEventListener("hashchange", _hashchangeHandler));
        // Initial route
        const path = window.location.hash.slice(1) || "/";
        await navigate(path, true);
      } else {
        const _popstateHandler = () => {
          // Detect direction: popstate fires for back AND forward.
          // Use Navigation API when available; otherwise fall back to
          // comparing history.length (imperfect but sufficient).
          _navDirection = "backward"; // conservative default for popstate
          const path = _stripBase(window.location.pathname);
          // Guard: don't re-navigate if only the hash changed
          if (path === current.path) {
            const hash = window.location.hash.slice(1);
            if (hash) {
              const el = document.getElementById(hash);
              if (el) _scrollToAnchor(hash, el);
            }
            return;
          }
          navigate(path, true);
        };
        window.addEventListener("popstate", _popstateHandler);
        _globalHandlers.push(() => window.removeEventListener("popstate", _popstateHandler));
        const path = _stripBase(window.location.pathname);
        await navigate(path, true);
      }

      // Prefetch route templates declared via <a route> links
      _prefetchRoutes();
    },
    destroy() {
      _globalHandlers.forEach((fn) => fn());
      _globalHandlers.length = 0;
      listeners.clear();
    },
  };

  return router;
}
