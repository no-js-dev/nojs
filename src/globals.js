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
  router: { useHash: false, base: "/", scrollBehavior: "top", templates: "pages", ext: ".tpl", suppressHashWarning: false, focusBehavior: "none" },
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

// Phase 6: bulk disposal flag — when true, _cleanupDeps skips per-key
// removal from keyListeners Sets since the entire context will be GC'd.
export let _bulkDisposing = false;
export function _setBulkDisposing(v) { _bulkDisposing = v; }
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

// ─── Per-key dependency tracking (Task 3.1) ─────────────────────────────────
// When set, the active watcher being evaluated — Proxy get traps register deps.
export let _currentWatcher = null;
export function _setCurrentWatcher(w) { _currentWatcher = w; }

// ─── Watcher microtask batching (Task 3.2) ───────────────────────────────────
// Dirty watchers are queued here and flushed once per microtask.
const _microQueue = new Set();
let _microScheduled = false;

function _flushMicroQueue() {
  _microScheduled = false;
  if (_microQueue.size === 0) return;
  // Copy and clear before iterating (watchers may re-queue during flush)
  const fns = [..._microQueue];
  _microQueue.clear();
  // Sort: parent watchers before child watchers (lower depth first)
  fns.sort((a, b) => (a._depth || 0) - (b._depth || 0));
  for (const fn of fns) {
    if (fn._el && !fn._el.isConnected) continue;
    if (fn._tracked) _runTracked(fn);
    else fn();
  }
}

export function _queueWatcher(fn) {
  _microQueue.add(fn);
  if (!_microScheduled) {
    _microScheduled = true;
    queueMicrotask(_flushMicroQueue);
  }
}

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
  // Task 3.1: Annotate fn for per-key dep tracking.
  // The notify system in context.js will call _runTracked(fn) which
  // sets _currentWatcher so proxy get traps record dependencies.
  fn._deps = new Set();          // Set of { keyListeners: Map, key: string }
  fn._ctx = ctx;
  fn._tracked = true;            // flag for tracked execution

  // Task 1.4: When expr is a compiled function, store it on fn so
  // callers can use fn._exprFn(ctx) instead of evaluate(expr, ctx).
  // The function accesses properties on the Proxy ctx, so dep tracking
  // via _runTracked still works through the get trap.
  if (typeof expr === "function") {
    fn._exprFn = expr;
  }

  // Phase 6: use cached context depth instead of walking the parent chain
  fn._depth = ctx.__raw ? (ctx.__raw.__depth ?? 0) : 0;

  const unwatch = ctx.$watch(fn);
  _onDispose(() => {
    unwatch();
    _cleanupDeps(fn);
    _storeWatchers.delete(fn);
  });

  // Detect $store usage: for string expressions, check the text directly;
  // for compiled functions, inspect the function source via toString().
  const usesStore = typeof expr === "string"
    ? expr.includes("$store")
    : typeof expr === "function" && expr.toString().includes("$store");

  if (usesStore) {
    _storeWatchers.add(fn);
    fn._el = _currentEl;
    // Self-cleanup when the element is removed without going through dispose
    const el = _currentEl;
    if (el && el.parentElement) {
      const ro = new MutationObserver(() => {
        if (!el.isConnected) {
          _storeWatchers.delete(fn);
          unwatch();
          _cleanupDeps(fn);
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

// Execute a tracked watcher: clean old deps, set as _currentWatcher, run, unset
export function _runTracked(fn) {
  _cleanupDeps(fn);
  const prev = _currentWatcher;
  _setCurrentWatcher(fn);
  try {
    fn();
  } finally {
    _setCurrentWatcher(prev);
  }
}

// Remove a watcher from all keyListeners it was registered in
export function _cleanupDeps(watcher) {
  if (!watcher._deps) return;
  // Phase 6: during bulk disposal the entire context and its keyListeners
  // will be GC'd, so skip the expensive per-key removal from Sets.
  if (_bulkDisposing) {
    watcher._deps = null;
    return;
  }
  for (const dep of watcher._deps) {
    const set = dep.keyListeners.get(dep.key);
    if (set) {
      set.delete(watcher);
      if (set.size === 0) dep.keyListeners.delete(dep.key);
    }
  }
  watcher._deps.clear();
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

// ─── Compiler namespace (Task 2.4 / 2.5 / 2.7) ────────────────────────────
// Shared arrays for pre-compiled expressions and template factories.
// Populated by compiler-generated <script> tags; consumed by directives.
// _watchExpr is already exported above — factories receive it as a parameter.
export const _compiledFns = [];
export const _factories = {};
