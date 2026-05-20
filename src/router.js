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
      entry = { path, outlets: {} };
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
      const paramNames = [];
      const pattern = route.path.replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return "([^/]+)";
      });
      const regex = new RegExp("^" + pattern + "$");
      const match = path.match(regex);
      if (match) {
        const params = {};
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
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
          if (redirectPath) {
            await navigate(redirectPath, true);
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
            if (redirectPath) {
              await navigate(redirectPath, true);
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

      // Set view-transition-name on outlets that declare a transition
      for (const el of outletEls) {
        if (el.getAttribute("transition")) {
          el.style.viewTransitionName = "route-content";
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

    listeners.forEach((fn) => fn(current));

    _devtoolsEmit("route:navigate", {
      path: current.path,
      params: current.params,
      query: current.query,
      hash: current.hash,
    });

    // Scroll to anchor if hash is present (e.g. route="/docs#cheatsheet")
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
      script.textContent = _interpolateRaw(jsonldAttr, ctx);
    }
  }

  async function _renderRoute(matched) {
    const outletEls = document.querySelectorAll("[route-view]");
    for (const outletEl of outletEls) {
      // Determine outlet name ("" or missing attribute value → "default")
      const outletAttr = outletEl.getAttribute("route-view");
      const outletName = outletAttr && outletAttr.trim() !== "" ? outletAttr.trim() : "default";

      // Find the template for this outlet in the matched route
      let tpl = matched?.route?.outlets?.[outletName];

      // ── File-based routing: auto-resolve from route-view[src] or config ──
      const configTemplates = _config.router.templates || "";
      if (!tpl && (outletEl.hasAttribute("src") || configTemplates)) {
        const rawSrc = outletEl.getAttribute("src") || configTemplates;
        const baseSrc = rawSrc.replace(/\/?$/, "/");
        const ext = outletEl.getAttribute("ext") || _config.router.ext || ".tpl" || ".html";
        const indexName = outletEl.getAttribute("route-index") || "index";
        const segment = current.path === "/" ? indexName : current.path.replace(/^\//, "");
        const fullSrc = baseSrc + segment + ext;
        const cacheKey = outletName + ":" + fullSrc;

        if (_autoTemplateCache.has(cacheKey)) {
          tpl = _autoTemplateCache.get(cacheKey);
        } else {
          tpl = document.createElement("template");
          tpl.setAttribute("src", fullSrc);
          tpl.setAttribute("route", current.path);
          document.body.appendChild(tpl);
          _autoTemplateCache.set(cacheKey, tpl);
          _log("[ROUTER] File-based route:", current.path, "→", fullSrc);
        }

        // Auto i18n namespace (convention: filename = namespace)
        if (outletEl.hasAttribute("i18n-ns") && !tpl.getAttribute("i18n-ns")) {
          tpl.setAttribute("i18n-ns", segment);
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
        const fullSrc = baseSrc + segment + ext;
        const cacheKey = outletName + ":" + fullSrc;
        if (_autoTemplateCache.has(cacheKey)) continue;

        const tpl = document.createElement("template");
        tpl.setAttribute("src", fullSrc);
        tpl.setAttribute("route", path);
        document.body.appendChild(tpl);
        _autoTemplateCache.set(cacheKey, tpl);
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
