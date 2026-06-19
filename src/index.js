// ═══════════════════════════════════════════════════════════════════════
//  No.JS — Module Entry Point
//  For npm/ESM/CJS consumers: import NoJS from 'nojs'
// ═══════════════════════════════════════════════════════════════════════

// Core modules
import {
  _config,
  _filters,
  _validators,
  _interceptors,
  _eventBus,
  _stores,
  _refs,
  _routerInstance,
  setRouterInstance,
  _log,
  _warn,
  _notifyStoreWatchers,
  _plugins,
  _globals,
  _globalOwners,
  _disposing,
  _setDisposing,
  _currentPluginName,
  _setCurrentPluginName,
  _emitEvent,
  _CANCEL,
  _RESPOND,
  _REPLACE,
  _onDispose,
  _stripBase,
} from "./globals.js";
import { _i18n, _loadI18nForLocale } from "./i18n.js";
import { createContext } from "./context.js";
import { evaluate, resolve, _execStatement } from "./evaluate.js";
import { findContext, _loadRemoteTemplates, _loadRemoteTemplatesPhase1, _loadRemoteTemplatesPhase2, _processTemplateIncludes, _cloneTemplate } from "./dom.js";
import { registerDirective, processTree, _removeCoreDirective, _disposeChildren, _disposeTree } from "./registry.js";
import { _createRouter } from "./router.js";
import { initDevtools, destroyDevtools, _devtoolsEmit } from "./devtools.js";

// Side-effect imports: register built-in filters
import "./filters.js";

// Side-effect imports: register all built-in directives
import "./directives/state.js";
import "./directives/http.js";
import "./directives/binding.js";
import "./directives/conditionals.js";
import "./directives/loops.js";
import "./directives/styling.js";
import "./directives/events.js";
import "./directives/refs.js";
import "./directives/validate-stub.js";
import "./directives/error-boundary.js";
import "./directives/i18n.js";
import "./directives/dnd-stub.js";
import "./directives/head.js";

// Lock core directives — plugins can only register NEW names
import { _freezeDirectives } from "./registry.js";
_freezeDirectives();

// ═══════════════════════════════════════════════════════════════════════
//  PLUGIN SYSTEM INTERNALS
// ═══════════════════════════════════════════════════════════════════════

let _initPromise = null;
let _configLocked = false;

// Keep in sync with context.js proxy handler $xxx variables.
// Any new $xxx context variable requires adding xxx to this list.
const _RESERVED_GLOBAL_NAMES = new Set([
  "store", "route", "router", "i18n", "refs", "form", "parent",
  "watch", "set", "notify", "raw", "isProxy", "listeners",
  "app", "config", "env", "debug", "version", "plugins", "globals",
  "el", "event", "self", "this", "super", "window", "document",
  "toString", "valueOf", "hasOwnProperty",
]);

const _DANGEROUS_REFS = typeof window !== "undefined"
  ? new Set([eval, Function, window.eval, window.Function].filter(Boolean))
  : new Set();

function _isUnsafeGlobalValue(value) {
  return _DANGEROUS_REFS.has(value);
}

const _FORBIDDEN_GLOBAL_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Built-in filter names — prevent user code from overwriting core filters
const _BUILTIN_FILTER_NAMES = new Set([
  "uppercase", "lowercase", "capitalize", "truncate", "trim", "stripHtml",
  "slugify", "nl", "nl2br", "encodeUri", "number", "currency", "percent",
  "filesize", "ordinal", "count", "first", "last", "join", "reverse",
  "unique", "sortBy", "where", "pluck", "keys", "values", "json", "debug",
  "default", "date", "datetime", "relative", "fromNow",
]);

// Built-in validator names — prevent user code from overwriting core validators
// (core validators are registered by @no-js-dev/nojs-elements)
const _BUILTIN_VALIDATOR_NAMES = new Set([
  "required", "email", "url", "min", "max", "minlength", "maxlength",
  "pattern", "match", "number", "integer", "alpha", "alphanumeric",
]);
function _deepCheckUnsafe(obj, seen = new Set()) {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return;
  seen.add(obj);
  for (const key of Object.keys(obj)) {
    if (_FORBIDDEN_GLOBAL_KEYS.has(key)) {
      _warn("NoJS.global(): value contains a forbidden key: " + key);
      throw new Error("unsafe_global");
    }
  }
  for (const val of Object.values(obj)) {
    if (_isUnsafeGlobalValue(val)) {
      _warn("NoJS.global(): value contains a forbidden reference (eval/Function).");
      throw new Error("unsafe_global");
    }
    if (val && typeof val === "object") _deepCheckUnsafe(val, seen);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

function _getDefaultRoutePath() {
  if (typeof window === "undefined") return null;
  const routerCfg = _config.router || {};
  if (routerCfg.useHash) {
    return window.location.hash.slice(1) || "/";
  }
  return _stripBase(window.location.pathname);
}

const NoJS = {
  get baseApiUrl() {
    return _config.baseApiUrl;
  },
  set baseApiUrl(v) {
    _config.baseApiUrl = v;
  },

  get locale() {
    return _i18n.locale;
  },
  set locale(v) {
    _i18n.locale = v;
  },

  config(opts = {}) {
    // Block security-critical config changes after init
    if (_configLocked) {
      const locked = ["sanitize", "dangerouslyDisableSanitize", "sanitizeHtml"];
      for (const key of locked) {
        if (key in opts) {
          _warn(`config.${key} cannot be changed after init()`);
          delete opts[key];
        }
      }
    }
    // Save nested objects before shallow assign overwrites them
    const prevHeaders = { ..._config.headers };
    const prevCache = { ..._config.cache };
    const prevTemplates = { ..._config.templates };
    const prevRouter = { ..._config.router };
    const prevI18n = { ..._config.i18n };
    if ("csp" in opts) {
      _warn("csp config option removed — No.JS is now CSP-safe by default");
      delete opts.csp;
    }
    if (opts.exprCacheSize !== undefined) {
      const n = parseInt(opts.exprCacheSize);
      opts.exprCacheSize = (Number.isFinite(n) && n > 0) ? n : 500;
    }
    Object.assign(_config, opts);
    if (opts.sanitize === false) {
      _warn('sanitize:false is deprecated — use dangerouslyDisableSanitize:true to make the risk explicit.');
    }
    if (opts.headers)
      _config.headers = { ...prevHeaders, ...opts.headers };
    if (opts.csrf) _config.csrf = opts.csrf;
    if (opts.cache) _config.cache = { ...prevCache, ...opts.cache };
    if (opts.templates) _config.templates = { ...prevTemplates, ...opts.templates };
    if (opts.router) {
      if ("mode" in opts.router && !("useHash" in opts.router)) {
        _log(
          'router.mode is deprecated. Use router.useHash instead: ' +
          'mode: "hash" → useHash: true, mode: "history" → useHash: false',
          "warn"
        );
        opts.router.useHash = opts.router.mode === "hash";
        delete opts.router.mode;
      }
      _config.router = { ...prevRouter, ...opts.router };
    }
    if (opts.i18n) {
      _config.i18n = { ...prevI18n, ...opts.i18n };
      _i18n.locale = opts.i18n.defaultLocale || _i18n.locale;
    }
    if (opts.stores) {
      for (const [name, data] of Object.entries(opts.stores)) {
        if (!_stores[name]) {
          _stores[name] = createContext(data || {});
          _devtoolsEmit("store:created", { name, keys: Object.keys(data || {}) });
        }
      }
      delete _config.stores;
    }
  },

  // ─── Plugin registration ──────────────────────────────────────────────
  use(plugin, options = {}) {
    if (_disposing) {
      _warn("Cannot install plugins during dispose.");
      return;
    }

    // Normalize function shorthand (named functions only)
    if (typeof plugin === "function") {
      if (!plugin.name || plugin.name === "anonymous") {
        _warn('Plugin must have a unique, non-empty name. Use { name: "my-plugin", install: fn }.');
        return;
      }
      plugin = { name: plugin.name, install: plugin };
    }

    // Validate name
    if (!plugin.name || typeof plugin.name !== "string" || plugin.name === "anonymous") {
      _warn('Plugin must have a unique, non-empty name.');
      return;
    }

    // Duplicate detection with object identity comparison
    if (_plugins.has(plugin.name)) {
      const existing = _plugins.get(plugin.name);
      if (existing.plugin !== plugin) {
        _warn(`Plugin "${plugin.name}" name collision: a different plugin with this name is already installed.`);
      }
      return;
    }

    // Log declared capabilities in debug mode
    if (plugin.capabilities && _config.debug) {
      _log(`Plugin "${plugin.name}" declares capabilities:`, plugin.capabilities);
    }

    // Warn on trusted access
    if (options.trusted === true) {
      _warn(`WARNING: Plugin "${plugin.name}" installed with trusted access to sensitive HTTP headers.`);
    }

    // Set current plugin name for interceptor tracking
    _setCurrentPluginName(plugin.name);
    try {
      plugin.install(NoJS, options);
    } finally {
      _setCurrentPluginName(null);
    }

    _plugins.set(plugin.name, { plugin, options });

    // If already initialized and plugin has init, await then call
    if (_initPromise && plugin.init) {
      _initPromise.then(() => plugin.init(NoJS)).catch(e => _warn(`Plugin "${plugin.name}" init error:`, e.message));
    }

    _log(`Plugin "${plugin.name}" installed.`);
  },

  // ─── Plugin globals ───────────────────────────────────────────────────
  global(name, value) {
    if (typeof name !== "string" || !name) {
      _warn("NoJS.global() requires a non-empty string name.");
      return;
    }

    // Block prototype pollution vectors
    if (name === "__proto__" || name === "constructor" || name === "prototype") {
      _warn(`NoJS.global(): "${name}" is a forbidden name.`);
      return;
    }

    // Block reserved names
    if (_RESERVED_GLOBAL_NAMES.has(name)) {
      _warn(`NoJS.global(): "${name}" is reserved and cannot be used.`);
      return;
    }

    // Validate identifier characters
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      _warn(`NoJS.global(): "${name}" is not a valid identifier.`);
      return;
    }

    // Block dangerous function references
    if (_isUnsafeGlobalValue(value)) {
      _warn(`NoJS.global(): value for "${name}" is a forbidden reference (eval/Function).`);
      return;
    }

    // Warn on overwrite by a different plugin
    if (name in _globals && _globalOwners[name] && _globalOwners[name] !== _currentPluginName) {
      _warn(`Global "$${name}" owned by "${_globalOwners[name]}" is being overwritten.`);
    }

    // Sanitize object values to strip __proto__ keys
    if (value && typeof value === "object" && !value.__isProxy) {
      try {
        value = JSON.parse(JSON.stringify(value));
      } catch {
        // Non-serializable objects — check for dangerous function references
        try {
          _deepCheckUnsafe(value);
        } catch (safetyErr) {
          if (safetyErr.message === "unsafe_global") return;
          // Other errors pass through
        }
      }
      // Wrap in reactive context for deep reactivity
      value = createContext(value);
    } else if (value && typeof value === "object" && value.__isProxy) {
      // Already a reactive proxy — sanitization branch above is skipped, so run the
      // recursive unsafe-reference / prototype-pollution check on the raw target
      // to avoid storing nested eval/Function refs or polluted prototypes verbatim.
      try {
        _deepCheckUnsafe(value.__raw ?? value);
      } catch (safetyErr) {
        if (safetyErr.message === "unsafe_global") return;
        // Other errors pass through
      }
    }

    _globals[name] = value;
    if (_currentPluginName) _globalOwners[name] = _currentPluginName;

    // Notify all store watchers since globals are scope-wide
    _notifyStoreWatchers();

    _devtoolsEmit("global:set", { name, hasValue: value != null });
    _log(`Global "$${name}" registered.`);
  },

  // ─── App teardown ─────────────────────────────────────────────────────
  async dispose() {
    _setDisposing(true);
    try {
      // Wait for any in-flight init() to settle before tearing down — otherwise the
      // init IIFE keeps running against state we are about to clear and re-locks config
      // after teardown. _setDisposing(true) above prevents new plugin installs meanwhile.
      if (_initPromise) {
        try { await _initPromise; } catch { /* init failure is irrelevant during dispose */ }
      }

      // Dispose plugins in reverse installation order
      const entries = [..._plugins.entries()].reverse();
      for (const [name, { plugin }] of entries) {
        if (plugin.dispose) {
          try {
            let timeoutId;
            await Promise.race([
              Promise.resolve(plugin.dispose(NoJS)).finally(() => clearTimeout(timeoutId)),
              new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Dispose timeout")), 3000);
              }),
            ]);
          } catch (e) {
            _warn(`Plugin "${name}" dispose error:`, e.message);
          }
        }
      }
      _plugins.clear();
      for (const k in _globals) delete _globals[k];
      for (const k in _globalOwners) delete _globalOwners[k];

      // Clear interceptors
      _interceptors.request.length = 0;
      _interceptors.response.length = 0;

      // Destroy router listeners
      if (_routerInstance && _routerInstance.destroy) {
        _routerInstance.destroy();
      }
      setRouterInstance(null);

      // Clean up devtools listener
      destroyDevtools();

      _configLocked = false;

      _initPromise = null;
      _log("Disposed.");
    } finally {
      _setDisposing(false);
    }
  },

  // ─── Init (Promise-based lifecycle) ───────────────────────────────────
  async init(root) {
    if (typeof document === "undefined") return;
    if (_initPromise) return _initPromise;
    // Lock security-critical config synchronously, BEFORE the async init body awaits
    // anything — otherwise sanitize flags remain mutable during the async init window.
    _configLocked = true;
    _initPromise = (async () => {
      root = root || document.body;
      _log("Initializing...");

      // Load external locale files (blocking — translations must be available for first paint)
      if (_config.i18n.loadPath) {
        const locales = new Set([_i18n.locale, _config.i18n.fallbackLocale]);
        await Promise.all([...locales].map((l) => _loadI18nForLocale(l)));
      }

      // Inline template includes (e.g. skeletons) — synchronous, before any fetch
      _processTemplateIncludes(root);

      // Determine active route path for phase 1 prioritization
      const defaultRoutePath = _getDefaultRoutePath();

      // Phase 1 (blocking): priority + non-route + default route templates
      await _loadRemoteTemplatesPhase1(defaultRoutePath);

      // Check for route-view outlets to activate router
      if (document.querySelector("[route-view]")) {
        setRouterInstance(_createRouter());
      }

      processTree(root); // ← first paint happens here

      // Init router after tree is processed
      if (_routerInstance) await _routerInstance.init();

      _log("Initialized.");

      // Phase 2 (non-blocking): background preload remaining route templates
      _loadRemoteTemplatesPhase2();

      // DevTools integration
      initDevtools(NoJS);

      // Plugin init hooks
      for (const [, { plugin }] of _plugins) {
        if (plugin.init) await plugin.init(NoJS);
      }
      _emitEvent("plugins:ready");
    })();
    return _initPromise;
  },

  // Register custom directive
  directive(name, handler) {
    registerDirective(name, handler);
  },

  // Register custom filter
  filter(name, fn) {
    if (typeof name !== "string" || !name) {
      throw new TypeError("NoJS.filter() requires a non-empty string name.");
    }
    if (typeof fn !== "function") {
      throw new TypeError(`NoJS.filter(): "${name}" handler must be a function.`);
    }
    if (_BUILTIN_FILTER_NAMES.has(name)) {
      _warn(`NoJS.filter(): "${name}" is a built-in filter and cannot be overridden.`);
      return;
    }
    _filters[name] = fn;
  },

  // Register custom validator
  validator(name, fn) {
    if (typeof name !== "string" || !name) {
      throw new TypeError("NoJS.validator() requires a non-empty string name.");
    }
    if (typeof fn !== "function") {
      throw new TypeError(`NoJS.validator(): "${name}" handler must be a function.`);
    }
    if (_BUILTIN_VALIDATOR_NAMES.has(name)) {
      _warn(`NoJS.validator(): "${name}" is a built-in validator and cannot be overridden.`);
      return;
    }
    _validators[name] = fn;
  },

  // i18n
  i18n(opts) {
    // Set config options BEFORE locale (setter checks loadPath)
    if (opts.loadPath != null) _config.i18n.loadPath = opts.loadPath;
    if (opts.ns) _config.i18n.ns = opts.ns;
    if (opts.cache != null) _config.i18n.cache = opts.cache;
    if (opts.persist != null) _config.i18n.persist = opts.persist;
    if (opts.locales) _i18n.locales = opts.locales;
    if (opts.fallbackLocale) _config.i18n.fallbackLocale = opts.fallbackLocale;

    // Set defaultLocale WITHOUT the setter (avoids overwriting localStorage)
    if (opts.defaultLocale) _i18n._locale = opts.defaultLocale;

    // Restore persisted locale (highest priority)
    if (_config.i18n.persist && typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem("nojs-locale");
        if (saved) { _i18n._locale = saved; return; }
      } catch (_) {}
    }

    // Detect browser language (second priority)
    if (opts.detectBrowser) {
      const browserLang =
        typeof navigator !== "undefined" ? navigator.language : "en";
      const prefix = browserLang.split("-")[0];
      if (_i18n.locales[browserLang]) _i18n._locale = browserLang;
      else if (_i18n.locales[prefix]) _i18n._locale = prefix;
    }
  },

  // Event bus
  on(event, fn) {
    if (!_eventBus[event]) _eventBus[event] = [];
    if (_eventBus[event].length >= _config.maxEventListeners) {
      _warn(
        'MaxListenersExceeded: event "' + event + '" has ' + _eventBus[event].length +
        ' listeners (max ' + _config.maxEventListeners + '). Possible memory leak.'
      );
    }
    _eventBus[event].push(fn);
    return () => {
      _eventBus[event] = _eventBus[event].filter((f) => f !== fn);
    };
  },

  // Request/response interceptors (with plugin tracking)
  interceptor(type, fn) {
    if (_disposing) {
      _warn("Cannot register interceptors during dispose.");
      return;
    }
    if (!_interceptors[type]) {
      _warn(`NoJS.interceptor(): unknown type "${type}" (expected "request" or "response").`);
      return;
    }
    _interceptors[type].push(
      _currentPluginName ? { fn, pluginName: _currentPluginName } : fn
    );
  },

  // Access global stores
  get store() {
    return _stores;
  },

  // Notify global store watchers (for external JS mutations)
  notify() {
    _notifyStoreWatchers();
  },

  // Access router
  get router() {
    return _routerInstance;
  },

  // Utilities (for custom directives)
  createContext,
  evaluate,
  findContext,
  processTree,
  resolve,

  // Internal API for trusted plugins (e.g. NoJS-Elements)
  get internals() {
    return Object.freeze({
      execStatement: _execStatement,
      cloneTemplate: _cloneTemplate,
      disposeChildren: _disposeChildren,
      disposeTree: _disposeTree,
      warn: _warn,
      validators: Object.freeze({..._validators}),
      removeCoreDirective: _removeCoreDirective,
      onDispose: _onDispose,
    });
  },

  // Version
  version: "1.15.0",
};

// Expose sentinel symbols as read-only properties
Object.defineProperty(NoJS, "CANCEL",  { value: _CANCEL,  writable: false, configurable: false });
Object.defineProperty(NoJS, "RESPOND", { value: _RESPOND, writable: false, configurable: false });
Object.defineProperty(NoJS, "REPLACE", { value: _REPLACE, writable: false, configurable: false });

// Backward-compat: _initialized getter/setter (tests use `NoJS._initialized = false` to reset)
Object.defineProperty(NoJS, "_initialized", {
  get() { return _initPromise !== null; },
  set(v) { if (!v) _initPromise = null; },
  configurable: true,
});

export default NoJS;
