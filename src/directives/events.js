// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: on:*, trigger
// ═══════════════════════════════════════════════════════════════════════

import { evaluate, _execStatement } from "../evaluate.js";
import { findContext } from "../dom.js";
import { registerDirective } from "../registry.js";
import { _onDispose } from "../globals.js";

registerDirective("on:*", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    const parts = name.replace("on:", "").split(".");
    const event = parts[0];
    const modifiers = new Set(parts.slice(1));

    // Lifecycle hooks
    if (event === "mounted") {
      requestAnimationFrame(() => _execStatement(expr, ctx, { $el: el }));
      return;
    }
    if (event === "init") {
      _execStatement(expr, ctx, { $el: el });
      return;
    }
    if (event === "updated") {
      let running = false;
      const updatedObserver = new MutationObserver(() => {
        if (!el.isConnected) {
          updatedObserver.disconnect();
          return;
        }
        // Re-entrancy guard: the handler expression frequently mutates the
        // observed subtree, which would re-trigger the observer and loop
        // forever. Ignore mutations caused by our own execution.
        if (running) return;
        running = true;
        try {
          _execStatement(expr, ctx, { $el: el });
        } finally {
          // Release on the next microtask so synchronous self-mutations queued
          // by this run are coalesced into the guarded window.
          Promise.resolve().then(() => { running = false; });
        }
      });
      updatedObserver.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
      _onDispose(() => updatedObserver.disconnect());
      return;
    }
    if (event === "error") {
      const errorHandler = (e) => {
        if (el.contains(e.target) || e.target === el) {
          _execStatement(expr, ctx, { $el: el, $error: e.error || e.message });
        }
      };
      window.addEventListener("error", errorHandler);
      _onDispose(() => window.removeEventListener("error", errorHandler));
      return;
    }
    if (event === "unmounted") {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.removedNodes) {
            if (node === el || node.contains?.(el)) {
              _execStatement(expr, ctx, { $el: el });
              observer.disconnect();
              return;
            }
          }
        }
      });
      if (el.parentElement)
        observer.observe(el.parentElement, { childList: true, subtree: true });
      _onDispose(() => observer.disconnect());
      return;
    }

    // Debounce / throttle. Walk the modifiers in declared order so a numeric
    // token binds to the keyword that immediately precedes it. This supports
    // both `.debounce.300` and the combined `.debounce.300.throttle.100`
    // (where a single shared number would otherwise only reach debounce).
    let debounceMs = 0;
    let throttleMs = 0;
    const orderedMods = parts.slice(1);
    for (let i = 0; i < orderedMods.length; i++) {
      const mod = orderedMods[i];
      if (!/^\d+$/.test(mod)) continue;
      const prev = orderedMods[i - 1];
      const n = parseInt(mod, 10);
      if (prev === "debounce") debounceMs = n;
      else if (prev === "throttle") throttleMs = n;
      else if (modifiers.has("debounce") && !modifiers.has("throttle")) debounceMs = n;
      else if (modifiers.has("throttle") && !modifiers.has("debounce")) throttleMs = n;
    }

    // Runs the bound expression. Only this part is rate-limited by
    // debounce/throttle so that prevent/stop/self/key gating below always
    // executes synchronously on the event (a throttled/debounced handler must
    // not drop preventDefault/stopPropagation).
    let run = (e) => {
      _execStatement(expr, ctx, { $event: e, $el: el });
    };

    // Wrap execution with debounce
    if (debounceMs > 0) {
      const original = run;
      let timer;
      run = (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => original(e), debounceMs);
      };
      _onDispose(() => clearTimeout(timer));
    }

    // Wrap execution with throttle
    if (throttleMs > 0) {
      const original = run;
      let last = 0;
      run = (e) => {
        const now = Date.now();
        if (now - last >= throttleMs) {
          last = now;
          original(e);
        }
      };
    }

    const handler = (e) => {
      // Key modifiers
      if (event === "keydown" || event === "keyup" || event === "keypress") {
        const keyMods = [
          "enter",
          "escape",
          "tab",
          "space",
          "delete",
          "backspace",
          "up",
          "down",
          "left",
          "right",
          "ctrl",
          "alt",
          "shift",
          "meta",
        ];
        for (const mod of modifiers) {
          if (!keyMods.includes(mod)) continue;
          if (mod === "enter" && e.key !== "Enter") return;
          if (mod === "escape" && e.key !== "Escape") return;
          if (mod === "tab" && e.key !== "Tab") return;
          if (mod === "space" && e.key !== " ") return;
          if (mod === "delete" && e.key !== "Delete" && e.key !== "Backspace")
            return;
          if (mod === "backspace" && e.key !== "Backspace") return;
          if (mod === "up" && e.key !== "ArrowUp") return;
          if (mod === "down" && e.key !== "ArrowDown") return;
          if (mod === "left" && e.key !== "ArrowLeft") return;
          if (mod === "right" && e.key !== "ArrowRight") return;
          if (mod === "ctrl" && !e.ctrlKey) return;
          if (mod === "alt" && !e.altKey) return;
          if (mod === "shift" && !e.shiftKey) return;
          if (mod === "meta" && !e.metaKey) return;
        }
      }

      // prevent/stop/self always fire synchronously, independent of any
      // debounce/throttle applied to the expression execution.
      if (modifiers.has("prevent")) e.preventDefault();
      if (modifiers.has("stop")) e.stopPropagation();
      if (modifiers.has("self") && e.target !== el) return;

      run(e);
    };

    const opts = {};
    if (modifiers.has("once")) opts.once = true;

    el.addEventListener(event, handler, opts);
    if (!opts.once) {
      _onDispose(() => el.removeEventListener(event, handler, opts));
    }
  },
});

registerDirective("trigger", {
  priority: 20,
  init(el, name, eventName) {
    const ctx = findContext(el);
    const dataExpr = el.getAttribute("trigger-data");
    const clickHandler = () => {
      const detail = dataExpr ? evaluate(dataExpr, ctx) : null;
      el.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
    };
    el.addEventListener("click", clickHandler);
    _onDispose(() => el.removeEventListener("click", clickHandler));
  },
});
