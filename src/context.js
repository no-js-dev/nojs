// ═══════════════════════════════════════════════════════════════════════
//  REACTIVE CONTEXT
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _refs, _routerInstance, _currentEl, _globals, _currentWatcher, _queueWatcher, _runTracked } from "./globals.js";
import { _i18n } from "./i18n.js";
import { _devtoolsEmit, _ctxRegistry } from "./devtools.js";

let _batchDepth = 0;
const _batchQueue = new Set();
let _ctxId = 0;
let _ctxGeneration = 0;

// Task 3.2: Global notification depth — when > 0, we're inside a watcher callback.
// Secondary notifications (from cascading mutations) are queued to microtask.
let _notifyDepth = 0;

export function _resetCtxId() { _ctxId = 0; }

export function _startBatch() {
  _batchDepth++;
  _devtoolsEmit("batch:start", { depth: _batchDepth });
}

export function _endBatch() {
  _batchDepth--;
  if (_batchDepth === 0 && _batchQueue.size > 0) {
    _devtoolsEmit("batch:end", { depth: 0, queueSize: _batchQueue.size });
    const fns = [..._batchQueue];
    _batchQueue.clear();
    fns.forEach((fn) => {
      if (fn._el && !fn._el.isConnected) return;
      if (fn._tracked) _runTracked(fn);
      else fn();
    });
  }
}

export function createContext(data = {}, parent = null) {
  const listeners = new Set();
  const keyListeners = new Map();   // Task 3.1: key → Set<watcher>
  const raw = {};
  Object.assign(raw, data);
  if (_config.devtools) raw.__devtoolsId = ++_ctxId;
  let notifying = false;

  // Helper: run a single watcher (tracked or plain), respecting notification depth
  function _callWatcher(fn) {
    _notifyDepth++;
    try {
      if (fn._tracked) _runTracked(fn);
      else fn();
    } finally {
      _notifyDepth--;
    }
  }

  // Broadcast notify — used by $notify() and as fallback
  function notify() {
    if (notifying) return;
    notifying = true;
    try {
      if (_batchDepth > 0) {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _batchQueue.add(fn);
        }
      } else if (_notifyDepth > 0) {
        // Task 3.2: already inside a watcher — queue to microtask
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _queueWatcher(fn);
        }
      } else {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _callWatcher(fn);
        }
      }
    } finally {
      notifying = false;
    }
  }

  // Task 3.1: Notify only watchers registered for a specific key
  function _notifyKey(key) {
    const watchers = keyListeners.get(key);
    if (!watchers || watchers.size === 0) {
      // No per-key watchers — fall back to broadcast for listeners
      // that were added without dep tracking (e.g. manual $watch)
      notify();
      return;
    }
    // Collect per-key watchers + any untracked global listeners
    const toRun = new Set();
    for (const fn of watchers) {
      if (fn._el && !fn._el.isConnected) { watchers.delete(fn); listeners.delete(fn); continue; }
      toRun.add(fn);
    }
    // Also notify any listeners that don't have _tracked (untracked, manual $watch)
    for (const fn of listeners) {
      if (!fn._tracked) {
        if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
        toRun.add(fn);
      }
    }
    if (_batchDepth > 0) {
      for (const fn of toRun) {
        _batchQueue.add(fn);
      }
    } else if (_notifyDepth > 0) {
      // Task 3.2: already inside a watcher — queue to microtask
      for (const fn of toRun) {
        _queueWatcher(fn);
      }
    } else {
      for (const fn of toRun) {
        _callWatcher(fn);
      }
    }
  }

  // Task 3.1: Track dependency in current watcher
  function _trackKey(key) {
    if (!_currentWatcher || !_currentWatcher._deps) return;
    let set = keyListeners.get(key);
    if (!set) {
      set = new Set();
      keyListeners.set(key, set);
    }
    set.add(_currentWatcher);
    _currentWatcher._deps.add({ keyListeners, key });
  }

  const handler = {
    get(target, key) {
      if (key === "__isProxy") return true;
      if (key === "__raw") return target;
      if (key === "__listeners") return listeners;
      if (key === "__keyListeners") return keyListeners;
      if (key === "$watch")
        return (fn) => {
          if (_currentEl) fn._el = _currentEl;
          listeners.add(fn);
          return () => listeners.delete(fn);
        };
      if (key === "$notify") return notify;
      if (key === "$set")
        return (k, v) => {
          const parts = k.split(".");
          if (parts.length === 1) {
            proxy[k] = v;
          } else {
            let obj = proxy;
            for (let i = 0; i < parts.length - 1; i++) {
              obj = obj[parts[i]];
              if (obj == null) return;
            }
            const lastKey = parts[parts.length - 1];
            const old = obj[lastKey];
            obj[lastKey] = v;
            if (old !== v) notify();
          }
        };
      if (key === "$parent") return parent;
      // Own properties take priority over framework defaults.
      // This allows createContext({ $route: custom }) to shadow
      // the global $route — used by the router for page-title etc.
      if (key in target) {
        // Task 3.1: track dependency on this key
        if (typeof key === "string") _trackKey(key);
        return target[key];
      }
      if (key === "$refs") return _refs;
      if (key === "$store") return _stores;
      if (key === "$route")
        return _routerInstance ? _routerInstance.current : {};
      if (key === "$router") return _routerInstance;
      if (key === "$i18n") return _i18n;
      if (key === "$form") return null;
      // Plugin globals fallback (after all core $ checks)
      if (key.startsWith("$") && key.slice(1) in _globals) {
        return _globals[key.slice(1)];
      }
      if (parent && parent.__isProxy) return parent[key];
      return undefined;
    },
    set(target, key, value) {
      // Write-back: if key doesn't exist locally but exists in a parent,
      // write to the owning context (same behavior as _execStatement).
      if (!(key in target) && parent && parent.__isProxy) {
        let c = parent;
        while (c && c.__isProxy) {
          if (key in c.__raw) {
            c[key] = value; // delegates to parent's set trap
            return true;
          }
          c = c.$parent;
        }
      }
      const old = target[key];
      target[key] = value;
      if (old !== value) {
        _ctxGeneration++;
        _notifyKey(key);
        _devtoolsEmit("ctx:updated", {
          id: target.__devtoolsId,
          key,
          oldValue: old,
          newValue: value,
        });
      } else if (typeof value === "object" && value !== null) {
        // Object/array assigned with same reference but possibly mutated contents
        _ctxGeneration++;
        notify();
      }
      return true;
    },
    has(target, key) {
      if (key in target) return true;
      // Core $ properties exposed by the get trap
      if (key === "$store" || key === "$route" || key === "$router" ||
          key === "$i18n" || key === "$refs" || key === "$form" ||
          key === "$parent" || key === "$watch" || key === "$notify" ||
          key === "$set" || key === "__isProxy" || key === "__raw" ||
          key === "__listeners" || key === "__keyListeners") return true;
      if (typeof key === "string" && key.startsWith("$") && key.slice(1) in _globals) return true;
      if (parent && parent.__isProxy) return key in parent;
      return false;
    },
  };

  const proxy = new Proxy(raw, handler);

  // Phase 6: cache context depth for parent-before-child ordering
  raw.__depth = parent ? (parent.__raw.__depth ?? 0) + 1 : 0;

  if (_config.devtools && raw.__devtoolsId) {
    _ctxRegistry.set(raw.__devtoolsId, proxy);
    _devtoolsEmit("ctx:created", {
      id: raw.__devtoolsId,
      parentId: parent?.__raw?.__devtoolsId ?? null,
      keys: Object.keys(data),
      elementTag: _currentEl?.tagName?.toLowerCase() ?? null,
    });
  }

  return proxy;
}

// ═══════════════════════════════════════════════════════════════════════
//  LIGHT CONTEXT — Task 4.1
//  Optimised Proxy for loop items (each/foreach). Reduces per-item
//  overhead by lazily allocating listeners Set and keyListeners Map.
//  Skips devtools registration.  Full API-compatible with createContext.
// ═══════════════════════════════════════════════════════════════════════

export function createLightContext(data, parent) {
  const raw = {};
  Object.assign(raw, data);

  // Lazy allocation: only created when first needed
  let listeners = null;
  let keyListeners = null;
  let notifying = false;

  function _ensureListeners() {
    if (!listeners) listeners = new Set();
    return listeners;
  }

  function _ensureKeyListeners() {
    if (!keyListeners) keyListeners = new Map();
    return keyListeners;
  }

  function _callWatcher(fn) {
    _notifyDepth++;
    try {
      if (fn._tracked) _runTracked(fn);
      else fn();
    } finally {
      _notifyDepth--;
    }
  }

  function notify() {
    if (notifying || !listeners || listeners.size === 0) return;
    notifying = true;
    try {
      if (_batchDepth > 0) {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _batchQueue.add(fn);
        }
      } else if (_notifyDepth > 0) {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _queueWatcher(fn);
        }
      } else {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _callWatcher(fn);
        }
      }
    } finally {
      notifying = false;
    }
  }

  function _notifyKey(key) {
    if (!keyListeners) { notify(); return; }
    const watchers = keyListeners.get(key);
    if (!watchers || watchers.size === 0) {
      notify();
      return;
    }
    const toRun = new Set();
    for (const fn of watchers) {
      if (fn._el && !fn._el.isConnected) { watchers.delete(fn); if (listeners) listeners.delete(fn); continue; }
      toRun.add(fn);
    }
    if (listeners) {
      for (const fn of listeners) {
        if (!fn._tracked) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          toRun.add(fn);
        }
      }
    }
    if (_batchDepth > 0) {
      for (const fn of toRun) {
        _batchQueue.add(fn);
      }
    } else if (_notifyDepth > 0) {
      for (const fn of toRun) {
        _queueWatcher(fn);
      }
    } else {
      for (const fn of toRun) {
        _callWatcher(fn);
      }
    }
  }

  function _trackKey(key) {
    if (!_currentWatcher || !_currentWatcher._deps) return;
    const kl = _ensureKeyListeners();
    let set = kl.get(key);
    if (!set) {
      set = new Set();
      kl.set(key, set);
    }
    set.add(_currentWatcher);
    _currentWatcher._deps.add({ keyListeners: kl, key });
  }

  const handler = {
    get(target, key) {
      if (key === "__isProxy") return true;
      if (key === "__raw") return target;
      if (key === "__listeners") return _ensureListeners();
      if (key === "__keyListeners") return _ensureKeyListeners();
      if (key === "$watch")
        return (fn) => {
          if (_currentEl) fn._el = _currentEl;
          _ensureListeners().add(fn);
          return () => { if (listeners) listeners.delete(fn); };
        };
      if (key === "$notify") return notify;
      if (key === "$set")
        return (k, v) => {
          const parts = k.split(".");
          if (parts.length === 1) {
            proxy[k] = v;
          } else {
            let obj = proxy;
            for (let i = 0; i < parts.length - 1; i++) {
              obj = obj[parts[i]];
              if (obj == null) return;
            }
            const lastKey = parts[parts.length - 1];
            const old = obj[lastKey];
            obj[lastKey] = v;
            if (old !== v) notify();
          }
        };
      if (key === "$parent") return parent;
      if (key in target) {
        if (typeof key === "string") _trackKey(key);
        return target[key];
      }
      if (key === "$refs") return _refs;
      if (key === "$store") return _stores;
      if (key === "$route")
        return _routerInstance ? _routerInstance.current : {};
      if (key === "$router") return _routerInstance;
      if (key === "$i18n") return _i18n;
      if (key === "$form") return null;
      if (key.startsWith("$") && key.slice(1) in _globals) {
        return _globals[key.slice(1)];
      }
      if (parent && parent.__isProxy) return parent[key];
      return undefined;
    },
    set(target, key, value) {
      // Write-back: if key doesn't exist locally, write to owning parent
      if (!(key in target) && parent && parent.__isProxy) {
        let c = parent;
        while (c && c.__isProxy) {
          if (key in c.__raw) {
            c[key] = value;
            return true;
          }
          c = c.$parent;
        }
      }
      const old = target[key];
      target[key] = value;
      if (old !== value) {
        _ctxGeneration++;
        _notifyKey(key);
      } else if (typeof value === "object" && value !== null) {
        _ctxGeneration++;
        notify();
      }
      return true;
    },
    has(target, key) {
      if (key in target) return true;
      if (key === "$store" || key === "$route" || key === "$router" ||
          key === "$i18n" || key === "$refs" || key === "$form" ||
          key === "$parent" || key === "$watch" || key === "$notify" ||
          key === "$set" || key === "__isProxy" || key === "__raw" ||
          key === "__listeners" || key === "__keyListeners") return true;
      if (typeof key === "string" && key.startsWith("$") && key.slice(1) in _globals) return true;
      if (parent && parent.__isProxy) return key in parent;
      return false;
    },
  };

  const proxy = new Proxy(raw, handler);

  // Phase 6: cache context depth for parent-before-child ordering
  raw.__depth = parent ? (parent.__raw.__depth ?? 0) + 1 : 0;

  return proxy;
}

// Collect all keys from a context + its parent chain
// Result is cached per context and invalidated on any reactive mutation.
export function _collectKeys(ctx) {
  const cache = ctx.__raw.__collectKeysCache;
  if (cache && cache.gen === _ctxGeneration) return cache.result;

  const allKeys = new Set();
  const allVals = {};
  let c = ctx;
  while (c && c.__isProxy) {
    const raw = c.__raw;
    for (const k of Object.keys(raw)) {
      if (!allKeys.has(k)) {
        allKeys.add(k);
        allVals[k] = raw[k];
      }
    }
    c = c.$parent;
  }
  const result = { keys: [...allKeys], vals: allVals };
  ctx.__raw.__collectKeysCache = { gen: _ctxGeneration, result };
  return result;
}
