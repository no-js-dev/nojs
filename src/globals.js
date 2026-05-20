// ═══════════════════════════════════════════════════════════════════════
//  SHARED STATE & UTILITIES
// ═══════════════════════════════════════════════════════════════════════

export const _config = {
  baseApiUrl: "",
  headers: {},
  timeout: 10000,
  retries: 0,
  retryDelay: 1000,
  credentials: "same-origin",
  csrf: null,
  cache: { strategy: "none", ttl: 300000 },
  templates: { cache: true },
  router: { useHash: false, base: "/", scrollBehavior: "top", templates: "pages", ext: ".tpl", suppressHashWarning: false, focusBehavior: "none", viewTransition: true },
  i18n: { defaultLocale: "en", fallbackLocale: "en", detectBrowser: false, loadPath: null, ns: [], cache: true, persist: false },
  debug: false,
  devtools: false,
  sanitize: true,
  dangerouslyDisableSanitize: false,
  sanitizeHtml: null,
  exprCacheSize: 500,
  maxEventListeners: 100,
};

export const _interceptors = { request: [], response: [] };
export const _eventBus = {};
export const _stores = {};
export const _storeWatchers = new Set();
export const _filters = {};
export const _validators = {};
export const _cache = new Map();
export const _refs = {};
export let _routerInstance = null;

// ─── Plugin system shared state ─────────────────────────────────────────────
export const _plugins = new Map();                    // name → { plugin, options }
export const _globals = Object.create(null);          // name → reactive value (prototype-free)
export const _globalOwners = Object.create(null);     // name → plugin name (collision tracking)
export let _disposing = false;
// Internal: used by index.js dispose() only — plugins receive the NoJS API, not module imports
export function _setDisposing(v) { _disposing = v; }
export let _currentPluginName = null;
export function _setCurrentPluginName(v) { _currentPluginName = v; }

export const _SENSITIVE_HEADERS = new Set([
  'authorization', 'x-api-key', 'x-auth-token', 'cookie',
  'proxy-authorization', 'set-cookie', 'x-csrf-token',
]);

export const _SENSITIVE_RESPONSE_HEADERS = new Set([
  'set-cookie', 'x-csrf-token', 'x-auth-token',
  'www-authenticate', 'proxy-authenticate',
]);

// ─── Lifecycle: tracks the element being processed by processElement ────────
// Used by ctx.$watch and _onDispose to transparently tag watchers/disposers
// with the owning DOM element — no changes needed in directive files.
export let _currentEl = null;

export function _setCurrentEl(el) {
  _currentEl = el;
}

export function setRouterInstance(r) {
  _routerInstance = r;
}

export function _log(...args) {
  if (_config.debug) console.log("[No.JS]", ...args);
}

export function _warn(...args) {
  console.warn("[No.JS]", ...args);
}

export function _notifyStoreWatchers() {
  for (const fn of _storeWatchers) {
    if (fn._el && !fn._el.isConnected) {
      _storeWatchers.delete(fn);
      continue;
    }
    fn();
  }
}

export function _watchExpr(expr, ctx, fn) {
  const unwatch = ctx.$watch(fn);
  _onDispose(() => {
    unwatch();
    _storeWatchers.delete(fn);
  });
  if (typeof expr === "string" && expr.includes("$store")) {
    _storeWatchers.add(fn);
    fn._el = _currentEl;
    // Self-cleanup when the element is removed without going through dispose
    const el = _currentEl;
    if (el && el.parentElement) {
      const ro = new MutationObserver(() => {
        if (!el.isConnected) {
          _storeWatchers.delete(fn);
          unwatch();
          ro.disconnect();
        }
      });
      // subtree: false — we only care about direct children of parentElement being removed
      ro.observe(el.parentElement, { childList: true, subtree: false });
      // Also disconnect via the normal disposal path to avoid a dangling MO
      _onDispose(() => ro.disconnect());
    }
  }
}

// Register a dispose callback on the element currently being processed.
// Called from directives to clean up intervals, observers, window listeners.
export function _onDispose(fn) {
  if (_currentEl) {
    _currentEl.__disposers = _currentEl.__disposers || [];
    _currentEl.__disposers.push(fn);
  }
}

export function _emitEvent(name, data) {
  (_eventBus[name] || []).forEach((fn) => fn(data));
}

// ─── Plugin sentinel symbols ────────────────────────────────────────────────
export const _CANCEL  = Symbol("nojs.cancel");
export const _RESPOND = Symbol("nojs.respond");
export const _REPLACE = Symbol("nojs.replace");
