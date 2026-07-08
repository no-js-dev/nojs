// ═══════════════════════════════════════════════════════════════════════
//  REACTIVE CONTEXT
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _refs, _routerInstance, _currentEl, _globals, _SENSITIVE_KEYS, _warn } from "./globals.js";
import { _i18nProxy } from "./i18n.js";
import { _devtoolsEmit, _ctxRegistry } from "./devtools.js";

const _FORBIDDEN_CTX_KEYS = new Set(["__proto__", "constructor", "prototype"]);

let _batchDepth = 0;
let _batchQueue = new Set();
let _ctxId = 0;
// Legacy global generation counter — kept for backward compatibility with any
// code that deletes __collectKeysCache (loops.js etc.) but no longer the primary
// invalidation mechanism. Per-context _gen is the new fast path.
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
    const fns = _batchQueue;
    _batchQueue = new Set();
    // Drain defensively: a throwing listener must not drop the rest of the
    // queued updates (Safety Rule 8 — one broken attribute must not abort the page).
    fns.forEach((fn) => {
      if (fn._el && !fn._el.isConnected) return;
      try {
        fn();
      } catch (err) {
        _warn("batched listener threw; continuing with remaining listeners:", err);
      }
    });
  }
}

export function createContext(data = {}, parent = null) {
  const listeners = new Set();
  const raw = {};
  Object.assign(raw, data);
  if (_config.devtools) raw.__devtoolsId = ++_ctxId;
  // Per-context generation stamp: bumped only by THIS context's own set trap.
  // _collectKeys validates against self + ancestor stamps — unrelated contexts
  // never invalidate each other's caches. (Fixes the verified 5.8× penalty.)
  let _gen = 0;
  raw.__ctxGen = _gen; // exposed on raw for _collectKeys chain validation
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
          // Isolate each listener: a single throwing listener must not abort
          // the loop and skip every sibling (Safety Rule 8).
          try {
            fn();
          } catch (err) {
            _warn("reactive listener threw; continuing with remaining listeners:", err);
          }
        }
      }
    } finally {
      notifying = false;
    }
  }

  // Pre-build $set closure outside the handler for reuse across all get() calls
  const $setFn = (k, v) => {
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
      if (old !== v) {
        // Bump the generation so _collectKeys' cache invalidates, mirroring the
        // set trap. Otherwise a nested $set leaves stale vals cached.
        _ctxGeneration++;
        _gen++;
        raw.__ctxGen = _gen;
        notify();
      }
    }
  };

  const $watchFn = (fn) => {
    if (_currentEl) fn._el = _currentEl;
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const handler = {
    get(target, key) {
      // Fast path: non-string keys (Symbols) go straight to target
      if (typeof key !== "string") return target[key];

      const c0 = key.charCodeAt(0);

      // Fast path: keys not starting with '$' (36) or '_' (95) are user properties.
      // Skip all special-key checks entirely.
      if (c0 !== 36 /* $ */ && c0 !== 95 /* _ */) {
        if (key in target) return target[key];
        if (parent && parent.__isProxy) return parent[key];
        return undefined;
      }

      // Dunder keys (__isProxy, __raw, __listeners)
      if (c0 === 95) {
        if (key === "__isProxy") return true;
        if (key === "__raw") return target;
        if (key === "__listeners") return listeners;
        // Fall through to target/parent lookup for other _ keys
        if (key in target) return target[key];
        if (parent && parent.__isProxy) return parent[key];
        return undefined;
      }

      // $ prefix: dispatch core context keys via switch for O(1) branching
      switch (key) {
        case "$watch":  return $watchFn;
        case "$notify": return notify;
        case "$set":    return $setFn;
        case "$parent": return parent;
        case "$refs":   return _refs;
        case "$store":  return _stores;
        case "$route":  return _routerInstance ? _routerInstance.current : {};
        case "$router": return _routerInstance;
        case "$i18n":   return _i18nProxy;
        case "$form":   return target.$form || null;
      }

      // Plugin globals fallback (after all core $ checks)
      const globalKey = key.slice(1);
      if (globalKey in _globals) return _globals[globalKey];

      // Target / parent chain lookup
      if (key in target) return target[key];
      if (parent && parent.__isProxy) return parent[key];
      return undefined;
    },
    set(target, key, value) {
      if (typeof key === "string" && _FORBIDDEN_CTX_KEYS.has(key)) return true;
      const old = target[key];
      target[key] = value;
      if (old !== value) {
        _ctxGeneration++;       // keep global bump for legacy cache-delete paths
        _gen++;
        target.__ctxGen = _gen; // expose for chain validation
        notify();
        if (_config.devtools) {
          let isSensitive = false;
          if (typeof key === "string") {
            const lk = key.toLowerCase();
            for (const s of _SENSITIVE_KEYS) {
              if (lk.includes(s)) { isSensitive = true; break; }
            }
          }
          _devtoolsEmit("ctx:updated", {
            id: target.__devtoolsId,
            key,
            oldValue: isSensitive ? "[REDACTED]" : old,
            newValue: isSensitive ? "[REDACTED]" : value,
          });
        }
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

// Collect all keys from a context + its parent chain.
// Result is cached per context and invalidated only when THIS context or one of
// its ancestors mutates (per-context _gen stamps). Unrelated context writes no
// longer blow this cache — verified to eliminate the 5.8× eval penalty.
export function _collectKeys(ctx) {
  const cache = ctx.__raw.__collectKeysCache;
  if (cache) {
    // Fast validation: check each ancestor's __ctxGen against the snapshot.
    // Depth is typically 1–5, so this is O(depth) integer compares — far cheaper
    // than the full recompute (O(chain × keys) + Set + Object allocation).
    const gens = cache.gens;
    let valid = true;
    let c = ctx;
    for (let i = 0; i < gens.length; i++) {
      if (!c || !c.__isProxy || c.__raw.__ctxGen !== gens[i]) { valid = false; break; }
      c = c.$parent;
    }
    // Also invalid if chain grew (new ancestor appeared — shouldn't happen, but safe)
    if (valid && c && c.__isProxy) valid = false;
    if (valid) return cache.result;
  }

  const allKeys = new Set();
  const allVals = {};
  const gens = [];
  let c = ctx;
  while (c && c.__isProxy) {
    const raw = c.__raw;
    gens.push(raw.__ctxGen ?? 0);
    for (const k of Object.keys(raw)) {
      if (!allKeys.has(k)) {
        allKeys.add(k);
        allVals[k] = raw[k];
      }
    }
    c = c.$parent;
  }
  const result = { keys: [...allKeys], vals: allVals };
  ctx.__raw.__collectKeysCache = { gens, result };
  return result;
}
