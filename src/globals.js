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
  appId: "",
};

export const _interceptors = { request: [], response: [] };
export const _eventBus = {};
export const _stores = {};
export const _storeWatchers = new Map(); // storeName → Set<fn>, '*' = wildcard
export const _routeWatchers = new Set(); // fns watching $route expressions
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

export const _SENSITIVE_KEYS = new Set([
  'token', 'password', 'secret', 'key', 'auth', 'credential', 'session',
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

// Regex to extract the first store name from expressions like $store.cart.items
const _STORE_NAME_RE = /\$store\.(\w+)/;

export function _extractStoreName(expr) {
  if (typeof expr !== "string") return null;
  const m = _STORE_NAME_RE.exec(expr);
  return m ? m[1] : null;
}

function _notifyPartition(set) {
  // Snapshot before iterating: a watcher may synchronously add/delete watchers
  // in this same partition, which would otherwise skip or re-run listeners.
  // Isolate each listener so one throwing watcher doesn't abort the rest.
  for (const fn of [...set]) {
    if (fn._el && !fn._el.isConnected) {
      set.delete(fn);
      continue;
    }
    try {
      fn();
    } catch (err) {
      _warn("store watcher threw; continuing with remaining watchers:", err);
    }
  }
}

export function _notifyStoreWatchers(storeName) {
  if (storeName) {
    // Notify only the targeted partition + wildcards
    const partition = _storeWatchers.get(storeName);
    if (partition) _notifyPartition(partition);
    const wildcard = _storeWatchers.get("*");
    if (wildcard) _notifyPartition(wildcard);
  } else {
    // No store name — notify ALL partitions (backward compat)
    for (const set of _storeWatchers.values()) {
      _notifyPartition(set);
    }
  }
}

export function _addStoreWatcher(fn, partition) {
  let set = _storeWatchers.get(partition);
  if (!set) {
    set = new Set();
    _storeWatchers.set(partition, set);
  }
  set.add(fn);
  fn._storePartition = partition;
}

export function _deleteStoreWatcher(fn) {
  const partition = fn._storePartition;
  if (partition) {
    const set = _storeWatchers.get(partition);
    if (set) {
      set.delete(fn);
      if (set.size === 0) _storeWatchers.delete(partition);
    }
  } else {
    // Fallback: scan all partitions (legacy safety net)
    for (const [key, set] of _storeWatchers) {
      set.delete(fn);
      if (set.size === 0) _storeWatchers.delete(key);
    }
  }
}

export function _notifyRouteWatchers() {
  for (const fn of [..._routeWatchers]) {
    if (fn._el && !fn._el.isConnected) {
      _routeWatchers.delete(fn);
      continue;
    }
    try {
      fn();
    } catch (err) {
      _warn("route watcher threw; continuing with remaining watchers:", err);
    }
  }
}

export function _addRouteWatcher(fn) {
  _routeWatchers.add(fn);
}

export function _deleteRouteWatcher(fn) {
  _routeWatchers.delete(fn);
}

export function _watchExpr(expr, ctx, fn) {
  const unwatch = ctx.$watch(fn);
  _onDispose(() => {
    unwatch();
    _deleteStoreWatcher(fn);
    _deleteRouteWatcher(fn);
  });
  if (typeof expr === "string" && expr.includes("$store")) {
    const partition = _extractStoreName(expr) || "*";
    _addStoreWatcher(fn, partition);
    fn._el = _currentEl;
  }
  if (typeof expr === "string" && expr.includes("$route")) {
    _addRouteWatcher(fn);
    fn._el = _currentEl;
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
