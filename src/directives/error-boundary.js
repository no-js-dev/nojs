// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE: error-boundary
// ═══════════════════════════════════════════════════════════════════════

import { _onDispose, _warn } from "../globals.js";
import { createContext } from "../context.js";
import { findContext, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";

registerDirective("error-boundary", {
  priority: 1,
  init(el, name, fallbackTpl) {
    const ctx = findContext(el);
    let _handling = false;

    function showFallback(message) {
      if (_handling) {
        _warn("error-boundary: secondary error inside fallback (suppressed to prevent infinite recursion):", message);
        return;
      }
      _handling = true;
      try {
        const clone = _cloneTemplate(fallbackTpl);
        if (clone) {
          const childCtx = createContext(
            { err: { message } },
            ctx,
          );
          _disposeChildren(el);
          el.innerHTML = "";
          const wrapper = document.createElement("div");
          wrapper.style.display = "contents";
          wrapper.__ctx = childCtx;
          wrapper.appendChild(clone);
          el.appendChild(wrapper);
          processTree(wrapper);
        }
      } finally {
        _handling = false;
      }
    }

    // Listen for NoJS expression errors dispatched from event handlers
    const nojsErrorHandler = (e) => {
      showFallback(e.detail?.message || "An error occurred");
    };
    el.addEventListener("nojs:error", nojsErrorHandler);
    _onDispose(() => el.removeEventListener("nojs:error", nojsErrorHandler));

    // Listen for window-level errors (resource load failures, uncaught JS errors)
    // Use capture phase because resource load errors (e.g. <img> 404) don't bubble
    const errorHandler = (e) => {
      if (e.target === window) {
        // Uncaught JS error: target is window, show fallback if boundary is connected
        if (el.isConnected) {
          showFallback(e.message || "An error occurred");
        }
      } else if (el.contains(e.target) || el === e.target) {
        // Resource load error on a child element
        showFallback(e.message || "An error occurred");
      }
    };
    window.addEventListener("error", errorHandler, { capture: true });
    _onDispose(() => window.removeEventListener("error", errorHandler, { capture: true }));
  },
});
