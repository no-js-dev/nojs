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
  i18n: { defaultLocale: "en", fallbackLocale: "en", detectBrowser: false, loadPath: null, ns: [], supportedLocales: [], cache: true, persist: false },
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
export const _i18nListeners = new Set(); // fns watching $i18n expressions
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

// ─── Shared URL utility ─────────────────────────────────────────────────────
export function _stripBase(pathname) {
  const base = (_config.router.base || "/").replace(/\/$/, "");
  if (!base) return pathname || "/";
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return pathname.replace(new RegExp("^" + escaped), "") || "/";
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

export function _watchI18n(fn) {
  _i18nListeners.add(fn);
  return () => _i18nListeners.delete(fn);
}

// Root-key extractor, injected by evaluate.js at load time (avoids a
// globals ↔ evaluate import cycle). Returns Set<string> | null.
let _exprRootKeysFn = null;
export function _setExprRootKeysFn(f) { _exprRootKeysFn = f; }

export function _watchExpr(expr, ctx, fn) {
  // Key-scope the watcher: notify(key) skips fn when the changed key cannot
  // appear in the expression. null roots (calls, filters, $-specials, parse
  // failure) lock fn to unkeyed — it fires on every notification, exactly
  // the pre-scoping behavior. A fn watched under several exprs unions their
  // roots; one ambiguous expr makes it permanently unkeyed.
  if (_exprRootKeysFn && !fn._unkeyed) {
    const roots = _exprRootKeysFn(expr);
    if (roots === null) {
      fn._unkeyed = true;
      fn._keys = undefined;
    } else if (fn._keys) {
      // Union branch mutates — a fn still holding the shared memoized Set
      // must take a private copy first (copy-on-write) so every other
      // watcher of the same expression keeps its clean shared Set.
      if (fn._keysShared) {
        fn._keys = new Set(fn._keys);
        fn._keysShared = false;
      }
      for (const k of roots) fn._keys.add(k);
    } else {
      // roots is the shared memoized Set from evaluate.js — adopt it
      // directly instead of copying. The common case (one expression per
      // watcher, i.e. every loop-row binding) then shares one Set across
      // all rows; the union branch above copies lazily if a second
      // expression ever lands on this fn.
      fn._keys = roots;
      fn._keysShared = true;
    }
  }

  // Register fn on ctx and every parent context so that changes to inherited
  // variables (e.g. outer state modified from an outer button) fire fn even
  // when ctx is a nested child context. This generalises the per-directive
  // ancestor-walk proven in http.js and fixes the nested-state one-behind /
  // dead-reactivity gap (audit finding 1). Set.add is a no-op for duplicates,
  // so the same fn registered twice on the same context is harmless.
  //
  // Registration goes through __listeners directly instead of $watch: the
  // per-registration unwatch closures $watch returns (one per chain level per
  // watcher) dominated per-row watcher memory; a single dispose closure that
  // re-walks the same chain replaces them all.
  if (_currentEl) fn._el = _currentEl;
  let c = ctx;
  while (c && c.__isProxy) {
    c.__listeners.add(fn);
    c = c.$parent;
  }

  // Cleanup: registry's _disposeElement walks fn._wctx's chain deleting fn
  // (plus the store/route/i18n registries) for every fn in el.__watcherFns —
  // pure data instead of one dispose closure per watcher. Gated elements
  // still need a real disposer: gate deactivation runs __gateDisposers, not
  // element disposal.
  if (_currentEl && !_currentEl.__gatedDirs) {
    fn._wctx = ctx;
    (_currentEl.__watcherFns || (_currentEl.__watcherFns = [])).push(fn);
  } else {
    _onDispose(() => {
      let d = ctx;
      while (d && d.__isProxy) {
        d.__listeners.delete(fn);
        d = d.$parent;
      }
      _deleteStoreWatcher(fn);
      _deleteRouteWatcher(fn);
      _i18nListeners.delete(fn);
    });
  }
  if (typeof expr === "string" && expr.includes("$store")) {
    const partition = _extractStoreName(expr) || "*";
    _addStoreWatcher(fn, partition);
    fn._el = _currentEl;
  }
  if (typeof expr === "string" && expr.includes("$route")) {
    _addRouteWatcher(fn);
    fn._el = _currentEl;
  }
  if (typeof expr === "string" && expr.includes("$i18n")) {
    _watchI18n(fn);
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
