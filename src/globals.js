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
  templates: { cache: true, pageRelative: false },
  router: { useHash: false, base: "/", scrollBehavior: "top", templates: "pages", ext: ".tpl", suppressHashWarning: false, focusBehavior: "none", viewTransition: true },
  i18n: { defaultLocale: "en", fallbackLocale: "en", detectBrowser: false, loadPath: null, ns: [], supportedLocales: [], cache: true, persist: false, escapeParams: false, strictLocale: false },
  debug: false,
  devtools: false,
  sanitize: true,
  dangerouslyDisableSanitize: false,
  sanitizeHtml: null,
  exprCacheSize: 500,
  maxEventListeners: 100,
  appId: "",
  // Opt-in hardening flags. Defaults keep v1.21.1 behavior.
  scopeHeaders: false,
  strictRedaction: false,
  strictDirectives: false,
  strictDevtools: false,
  strictJsonld: false,
  strictBindings: false,
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

// Name matcher for the opt-in strict redaction paths (strictDevtools,
// strictRedaction). The name is split into words (camelCase and any
// non-alphanumeric separator) and matched by word, not by substring:
// "accessToken", "api_key", "X-Session-Id" and "sessionid" match, while
// "author", "keyboard", "keywords", "sort_key", "monkey", "tokenCount" and
// "sessionCount" do not. The default paths keep _SENSITIVE_KEYS.
const _SENSITIVE_LAST_WORDS = new Set([
  'token', 'tokens', 'password', 'passwords', 'passwd', 'secret', 'secrets',
  'auth', 'authorization', 'credential', 'credentials', 'cookie', 'cookies',
  'jwt', 'session', 'signature',
]);
const _SENSITIVE_ANY_WORDS = new Set([
  'password', 'passwords', 'passwd', 'secret', 'secrets', 'credential',
  'credentials', 'authorization', 'apikey',
]);
const _SENSITIVE_KEY_QUALIFIERS = new Set([
  'api', 'private', 'secret', 'access', 'signing', 'encryption', 'auth',
  'session', 'license', 'client', 'master',
]);
const _SENSITIVE_WHOLE_NAMES = new Set([
  'key', 'sig', 'apikey', 'sessionid', 'accesstoken', 'refreshtoken', 'idtoken',
  'csrftoken', 'xsrftoken',
]);

export function _isSensitiveName(name) {
  if (typeof name !== 'string' || !name) return false;
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!words.length) return false;
  const last = words[words.length - 1];
  const prev = words.length > 1 ? words[words.length - 2] : '';
  if (_SENSITIVE_WHOLE_NAMES.has(words.join(''))) return true;
  if (_SENSITIVE_LAST_WORDS.has(last)) return true;
  if (last === 'key' && _SENSITIVE_KEY_QUALIFIERS.has(prev)) return true;
  if (last === 'id' && prev === 'session') return true;
  for (const w of words) {
    if (_SENSITIVE_ANY_WORDS.has(w)) return true;
  }
  return false;
}

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

// Every `$store` reference, with the store name when written `$store.name`.
const _STORE_REF_RE = /\$store(?:\.(\w+))?/g;

// Distinct store names an expression references, in order of appearance:
// `$store.auth.user = x; $store.ui.mode = y` → ["auth", "ui"]. Returns null
// when a reference cannot be named statically (`$store[key]`, bare `$store`)
// or there is none — callers then fall back to every partition (notify) or
// the wildcard partition (watch), as _extractStoreName's null did.
export function _extractStoreNames(expr) {
  if (typeof expr !== "string") return null;
  let names = null;
  _STORE_REF_RE.lastIndex = 0;
  let m;
  while ((m = _STORE_REF_RE.exec(expr)) !== null) {
    if (!m[1]) {
      _STORE_REF_RE.lastIndex = 0;
      return null;
    }
    if (!names) names = [m[1]];
    else if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

// `seen` dedupes a watcher registered in several partitions (an expression
// reading two stores) when one notification walks more than one partition.
function _notifyPartition(set, seen) {
  // Snapshot before iterating: a watcher may synchronously add/delete watchers
  // in this same partition, which would otherwise skip or re-run listeners.
  // Isolate each listener so one throwing watcher doesn't abort the rest.
  for (const fn of [...set]) {
    if (seen) {
      if (seen.has(fn)) continue;
      seen.add(fn);
    }
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

// storeName: a store name, an array of names (_extractStoreNames), or
// nothing to notify every partition.
export function _notifyStoreWatchers(storeName) {
  if (Array.isArray(storeName)) {
    if (storeName.length > 1) {
      // One expression wrote several stores: each named partition, then the
      // wildcard, each watcher at most once.
      const seen = new Set();
      for (const name of storeName) {
        const partition = _storeWatchers.get(name);
        if (partition) _notifyPartition(partition, seen);
      }
      const wildcard = _storeWatchers.get("*");
      if (wildcard) _notifyPartition(wildcard, seen);
      return;
    }
    storeName = storeName[0];
  }
  if (storeName) {
    // Notify only the targeted partition + wildcards. A watcher lives in "*"
    // or in named partitions, never both, so no dedupe is needed here.
    const partition = _storeWatchers.get(storeName);
    if (partition) _notifyPartition(partition);
    const wildcard = _storeWatchers.get("*");
    if (wildcard) _notifyPartition(wildcard);
  } else {
    // No store name — notify ALL partitions (backward compat)
    const seen = new Set();
    for (const set of _storeWatchers.values()) {
      _notifyPartition(set, seen);
    }
  }
}

function _addToPartition(fn, partition) {
  let set = _storeWatchers.get(partition);
  if (!set) {
    set = new Set();
    _storeWatchers.set(partition, set);
  }
  set.add(fn);
}

function _removeFromPartition(fn, partition) {
  const set = _storeWatchers.get(partition);
  if (set) {
    set.delete(fn);
    if (set.size === 0) _storeWatchers.delete(partition);
  }
}

// partition: a store name, "*", or an array of store names — a watcher that
// reads several stores joins each of their partitions.
export function _addStoreWatcher(fn, partition) {
  if (Array.isArray(partition)) {
    if (partition.length === 0) partition = "*";
    else if (partition.length === 1) partition = partition[0];
  }
  if (Array.isArray(partition)) {
    for (const p of partition) _addToPartition(fn, p);
  } else {
    _addToPartition(fn, partition);
  }
  fn._storePartition = partition;
}

export function _deleteStoreWatcher(fn) {
  const partition = fn._storePartition;
  if (Array.isArray(partition)) {
    for (const p of partition) _removeFromPartition(fn, p);
  } else if (partition) {
    _removeFromPartition(fn, partition);
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
    _addStoreWatcher(fn, _extractStoreNames(expr) || "*");
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
