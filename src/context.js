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
    // Drain with the depth held above zero so notifies fired by running
    // listeners re-queue into the live Set (deduped) instead of executing
    // synchronously — each listener runs once per settled state instead of
    // once per notification source.
    let rounds = 0;
    while (_batchQueue.size > 0) {
      if (++rounds > 100) {
        _warn("batch drain exceeded 100 rounds — possible update cycle; aborting drain");
        _batchQueue = new Set();
        break;
      }
      const fns = _batchQueue;
      _batchQueue = new Set();
      _batchDepth++;
      try {
        // Drain defensively: a throwing listener must not drop the rest of the
        // queued updates (Safety Rule 8 — one broken attribute must not abort the page).
        fns.forEach((fn) => {
          if (fn._el && !fn._el.isConnected) return;
          // Running now supersedes a re-queue made by an earlier listener
          // in this same round; re-queues that happen after fn ran (or
          // during it) stay for the next round.
          _batchQueue.delete(fn);
          try {
            fn();
          } catch (err) {
            _warn("batched listener threw; continuing with remaining listeners:", err);
          }
        });
      } finally {
        _batchDepth--;
      }
    }
  }
}

// Per-context bookkeeping lives in one meta record behind a Symbol key on the
// raw object (invisible to Object.keys / _collectKeys). Everything a context
// used to close over per instance — parent link, listeners Set, $watch/$set/
// $notify closures — is either stored here or created lazily on first access,
// so a context that is only ever read (the common loop-row case before its
// bindings attach) costs raw + meta + Proxy and nothing else.
const META = Symbol("no.js");

// `key` is the changed property when the notification comes from a single
// write (set trap / $set); undefined for manual $notify() and bulk changes,
// which fire every listener. Key-scoped listeners (fn._keys, assigned in
// _watchExpr) are skipped when the changed key cannot affect them.
//
// Every notify runs through the batch queue: outside an explicit batch it
// opens its own, so listeners always execute from _endBatch's drain. A
// notify fired by a running listener (e.g. computed's $set cascading into
// a watch) queues for the next drain round instead of recursing — or being
// dropped, as the old reentrancy guard did. Still fully synchronous: the
// drain completes before the outermost notify/set returns.
function _notifyMeta(meta, key) {
  const listeners = meta.listeners;
  if (!listeners || listeners.size === 0) return;
  const ownBatch = _batchDepth === 0;
  if (ownBatch) _startBatch();
  for (const fn of listeners) {
    if (fn._el && !fn._el.isConnected) { listeners.delete(fn); continue; }
    if (key !== undefined && fn._keys && !fn._keys.has(key)) continue;
    _batchQueue.add(fn);
  }
  if (ownBatch) _endBatch();
}

// One handler object shared by every context Proxy. The old per-context
// handler literal carried three trap closures per instance; here the traps
// reach per-context state through target[META] instead.
const _sharedHandler = {
  get(target, key) {
    // Fast path: non-string keys (Symbols) go straight to target
    if (typeof key !== "string") return target[key];

    const c0 = key.charCodeAt(0);

    // Fast path: keys not starting with '$' (36) or '_' (95) are user properties.
    // Skip all special-key checks entirely.
    if (c0 !== 36 /* $ */ && c0 !== 95 /* _ */) {
      if (key in target) return target[key];
      const parent = target[META].parent;
      if (parent && parent.__isProxy) return parent[key];
      return undefined;
    }

    // Dunder keys (__isProxy, __raw, __listeners)
    if (c0 === 95) {
      if (key === "__isProxy") return true;
      if (key === "__raw") return target;
      if (key === "__listeners") {
        // Materialize on access: devtools counting and disposal clearing see
        // the same always-a-Set shape the eager version provided.
        const meta = target[META];
        return meta.listeners || (meta.listeners = new Set());
      }
      // Fall through to target/parent lookup for other _ keys
      if (key in target) return target[key];
      const parentU = target[META].parent;
      if (parentU && parentU.__isProxy) return parentU[key];
      return undefined;
    }

    // $ prefix: dispatch core context keys via switch for O(1) branching.
    // The $watch/$notify/$set closures are created on first access and cached
    // on meta — stable identity, zero cost for contexts that never use them.
    switch (key) {
      case "$watch": {
        const meta = target[META];
        return meta.watchFn || (meta.watchFn = (fn) => {
          if (_currentEl) fn._el = _currentEl;
          (meta.listeners || (meta.listeners = new Set())).add(fn);
          return () => { if (meta.listeners) meta.listeners.delete(fn); };
        });
      }
      case "$notify": {
        const meta = target[META];
        // Only a string arg narrows to key-scoped listeners. $notify()
        // historically took no argument, so userland calls passing anything
        // else ($notify($event), $notify(0)) must keep firing every
        // listener rather than silently matching nothing.
        return meta.notifyFn || (meta.notifyFn =
          (k) => _notifyMeta(meta, typeof k === "string" ? k : undefined));
      }
      case "$set": {
        const meta = target[META];
        return meta.setFn || (meta.setFn = (k, v) => {
          const parts = k.split(".");
          if (parts.some(p => _FORBIDDEN_CTX_KEYS.has(p))) return;
          if (parts.length === 1) {
            meta.proxy[k] = v;
          } else {
            let obj = meta.proxy;
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
              _notifyMeta(meta, parts[0]);
            }
          }
        });
      }
      case "$parent": return target[META].parent;
      case "$refs":   return _refs;
      case "$store":  return _stores;
      case "$route":  return _routerInstance ? _routerInstance.current : {};
      case "$router": return _routerInstance;
      case "$i18n":   return _i18nProxy;
      case "$form":   return target.$form || null;
      case "$sse":    return target.$sse || null;
    }

    // Plugin globals fallback (after all core $ checks)
    const globalKey = key.slice(1);
    if (globalKey in _globals) return _globals[globalKey];

    // Target / parent chain lookup
    if (key in target) return target[key];
    const parent = target[META].parent;
    if (parent && parent.__isProxy) return parent[key];
    return undefined;
  },
  set(target, key, value) {
    if (typeof key === "string" && _FORBIDDEN_CTX_KEYS.has(key)) return true;
    const old = target[key];
    target[key] = value;
    if (old !== value) {
      _ctxGeneration++;
      _notifyMeta(target[META], typeof key === "string" ? key : undefined);
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
    const parent = target[META].parent;
    if (parent && parent.__isProxy) return key in parent;
    return false;
  },
};

export function createContext(data = {}, parent = null) {
  const raw = {};
  Object.assign(raw, data);
  if (_config.devtools) raw.__devtoolsId = ++_ctxId;

  const meta = {
    parent,
    proxy: null,
    listeners: null,
    watchFn: null,
    notifyFn: null,
    setFn: null,
  };
  raw[META] = meta;
  const proxy = new Proxy(raw, _sharedHandler);
  meta.proxy = proxy;

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
