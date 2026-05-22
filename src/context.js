// ═══════════════════════════════════════════════════════════════════════
//  REACTIVE CONTEXT
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _refs, _routerInstance, _currentEl, _globals, _SENSITIVE_KEYS } from "./globals.js";
import { _i18n } from "./i18n.js";
import { _devtoolsEmit, _ctxRegistry } from "./devtools.js";

const _FORBIDDEN_CTX_KEYS = new Set(["__proto__", "constructor", "prototype"]);

let _batchDepth = 0;
const _batchQueue = new Set();
let _ctxId = 0;
let _ctxGeneration = 0;

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
      fn();
    });
  }
}

export function createContext(data = {}, parent = null) {
  const listeners = new Set();
  const raw = {};
  Object.assign(raw, data);
  if (_config.devtools) raw.__devtoolsId = ++_ctxId;
  let notifying = false;

  function notify() {
    if (notifying) return;
    notifying = true;
    try {
      if (_batchDepth > 0) {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          _batchQueue.add(fn);
        }
      } else {
        for (const fn of listeners) {
          if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
          fn();
        }
      }
    } finally {
      notifying = false;
    }
  }

  const handler = {
    get(target, key) {
      if (key === "__isProxy") return true;
      if (key === "__raw") return target;
      if (key === "__listeners") return listeners;
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
          if (parts.some(p => _FORBIDDEN_CTX_KEYS.has(p))) return;
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
      if (key === "$refs") return _refs;
      if (key === "$store") return _stores;
      if (key === "$route")
        return _routerInstance ? _routerInstance.current : {};
      if (key === "$router") return _routerInstance;
      if (key === "$i18n") return _i18n;
      if (key === "$form") return target.$form || null;
      // Plugin globals fallback (after all core $ checks)
      if (key.startsWith("$") && key.slice(1) in _globals) {
        return _globals[key.slice(1)];
      }
      if (key in target) return target[key];
      if (parent && parent.__isProxy) return parent[key];
      return undefined;
    },
    set(target, key, value) {
      if (typeof key === "string" && _FORBIDDEN_CTX_KEYS.has(key)) return true;
      const old = target[key];
      target[key] = value;
      if (old !== value) {
        _ctxGeneration++;
        notify();
        const isSensitive = typeof key === "string" && [..._SENSITIVE_KEYS].some(s => key.toLowerCase().includes(s));
        _devtoolsEmit("ctx:updated", {
          id: target.__devtoolsId,
          key,
          oldValue: isSensitive ? "[REDACTED]" : old,
          newValue: isSensitive ? "[REDACTED]" : value,
        });
      }
      return true;
    },
    has(target, key) {
      if (key in target) return true;
      if (typeof key === "string" && key.startsWith("$") && key.slice(1) in _globals) return true;
      if (parent && parent.__isProxy) return key in parent;
      return false;
    },
  };

  const proxy = new Proxy(raw, handler);

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
