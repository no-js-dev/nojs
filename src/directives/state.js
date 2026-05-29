// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: state, store, computed, watch
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _log, _warn, _watchExpr, _onDispose } from "../globals.js";
import { createContext } from "../context.js";
import { evaluate, _execStatement } from "../evaluate.js";
import { findContext } from "../dom.js";
import { registerDirective } from "../registry.js";
import { _devtoolsEmit } from "../devtools.js";

registerDirective("state", {
  priority: 0,
  init(el, name, value) {
    const initialState = evaluate(value, createContext()) || {};
    const parent = el.parentElement ? findContext(el.parentElement) : null;
    const ctx = createContext(initialState, parent);
    el.__ctx = ctx;

    // Persistence
    const persist = el.getAttribute("persist");
    const persistKey = el.getAttribute("persist-key");
    if (persist && !persistKey) {
      _warn(`persist="${persist}" requires a persist-key attribute. State will not be persisted.`);
      return;
    }
    if (persist && persistKey) {
      const store =
        persist === "localStorage"
          ? localStorage
          : persist === "sessionStorage"
            ? sessionStorage
            : null;
      if (store) {
        const persistFieldsAttr = el.getAttribute("persist-fields");
        const persistFields = persistFieldsAttr
          ? new Set(persistFieldsAttr.split(",").map((f) => f.trim()))
          : null;
        const storeKey = "nojs_" + (_config.appId || "") + "state_" + persistKey;
        try {
          const saved = store.getItem(storeKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            const schemaCheck = el.hasAttribute("persist-schema");
            const _forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);
            for (const [k, v] of Object.entries(parsed)) {
              if (_forbiddenKeys.has(k)) continue;
              // Block ALL dunder keys, not just the three prototype-pollution
              // vectors. Crafted localStorage could otherwise inject internal
              // keys (e.g. __collectKeysCache, __devtoolsId) into the context.
              if (k.startsWith("__")) continue;
              if (!persistFields || persistFields.has(k)) {
                if (schemaCheck) {
                  if (!(k in initialState)) { _warn('persist-schema: ignoring unknown key "' + k + '"'); continue; }
                  if (initialState[k] !== null && v !== null && typeof v !== typeof initialState[k]) {
                    _warn('persist-schema: type mismatch for "' + k + '" (expected ' + typeof initialState[k] + ', got ' + typeof v + ')');
                    continue;
                  }
                }
                ctx.$set(k, v);
              }
            }
          }
        } catch {
          /* ignore */
        }

        // Warn about potentially sensitive field names in persisted state
        const sensitiveNames = ['token', 'password', 'secret', 'key', 'auth', 'credential', 'session'];
        const stateKeys = Object.keys(initialState);
        const riskyKeys = stateKeys.filter(k => sensitiveNames.some(s => k.toLowerCase().includes(s)));
        if (riskyKeys.length > 0) {
          _warn('State key(s) ' + riskyKeys.map(k => '"' + k + '"').join(', ') + ' may contain sensitive data. Consider using persist-fields to exclude them.');
        }

        const unwatch = ctx.$watch(() => {
          try {
            const raw = ctx.__raw;
            // Always strip internal dunder keys (__collectKeysCache,
            // __devtoolsId, …). Persisting __raw verbatim leaks them into
            // storage — and __collectKeysCache can be cyclic, making
            // JSON.stringify throw so nothing gets persisted at all.
            const data = Object.fromEntries(
              Object.entries(raw).filter(
                ([k]) => !k.startsWith("__") && (!persistFields || persistFields.has(k))
              )
            );
            store.setItem(storeKey, JSON.stringify(data));
          } catch {
            /* ignore */
          }
        });
        _onDispose(() => { if (unwatch) unwatch(); });
      }
    }

    _log("state", initialState);
  },
});

registerDirective("store", {
  priority: 0,
  init(el, name, storeName) {
    const valueAttr = el.getAttribute("value");
    if (!storeName) return;
    if (!_stores[storeName]) {
      const data = valueAttr
        ? evaluate(valueAttr, createContext()) || {}
        : {};
      _stores[storeName] = createContext(data);
      _devtoolsEmit("store:created", {
        name: storeName,
        keys: Object.keys(data),
      });
    }
    _log("store", storeName);
  },
});

registerDirective("computed", {
  priority: 2,
  init(el, name, computedName) {
    const expr = el.getAttribute("expr");
    if (!computedName || !expr) return;
    const ctx = findContext(el);
    function update() {
      const val = evaluate(expr, ctx);
      ctx.$set(computedName, val);
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("watch", {
  priority: 2,
  init(el, name, watchExpr) {
    const ctx = findContext(el);
    const onChange = el.getAttribute("on:change");
    let lastVal = evaluate(watchExpr, ctx);
    _watchExpr(watchExpr, ctx, () => {
      const newVal = evaluate(watchExpr, ctx);
      if (newVal !== lastVal) {
        const oldVal = lastVal;
        lastVal = newVal;
        if (onChange)
          _execStatement(onChange, ctx, { $old: oldVal, $new: newVal });
      }
    });
  },
});
