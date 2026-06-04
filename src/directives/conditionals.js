// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: if, else-if, else, show, hide, switch
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr, _onDispose } from "../globals.js";
import { evaluate } from "../evaluate.js";
import { findContext, _clearDeclared, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";
import { _animateIn, _animateOut } from "../animations.js";

registerDirective("if", {
  priority: 10,
  init(el, name, expr) {
    const ctx = findContext(el);
    const thenId = el.getAttribute("then");
    const elseId = el.getAttribute("else");
    const animEnter =
      el.getAttribute("animate-enter") || el.getAttribute("animate");
    const animLeave = el.getAttribute("animate-leave");
    const transition = el.getAttribute("transition");
    const animDuration = parseInt(el.getAttribute("animate-duration")) || 0;
    const originalChildren = [...el.childNodes].map((n) => n.cloneNode(true));
    let currentState = undefined;
    let _cancelAnim = null;
    _onDispose(() => { if (_cancelAnim) { _cancelAnim(); _cancelAnim = null; } });

    function update() {
      const result = !!evaluate(expr, ctx);
      if (result === currentState) return;
      currentState = result;

      // Animation leave
      if (animLeave || transition) {
        if (_cancelAnim) { _cancelAnim(); _cancelAnim = null; }
        _cancelAnim = _animateOut(el, animLeave, transition, () => {
          _cancelAnim = null;
          render(result);
        }, animDuration);
      } else {
        render(result);
      }
    }

    function render(result) {
      _disposeChildren(el);
      if (result) {
        if (thenId) {
          const clone = _cloneTemplate(thenId);
          if (clone) {
            el.innerHTML = "";
            el.appendChild(clone);
          }
        } else {
          el.innerHTML = "";
          for (const child of originalChildren)
            el.appendChild(child.cloneNode(true));
        }
      } else {
        if (elseId) {
          const clone = _cloneTemplate(elseId);
          if (clone) {
            el.innerHTML = "";
            el.appendChild(clone);
          }
        } else if (thenId) {
          el.innerHTML = "";
        } else {
          el.innerHTML = "";
        }
      }

      _clearDeclared(el);
      processTree(el);

      // Animation enter
      if (animEnter || transition) {
        _animateIn(el, animEnter, transition, animDuration);
      }
    }

    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("else-if", {
  priority: 10,
  init(el, name, expr) {
    // Works like `if` but checks previous sibling's condition
    const ctx = findContext(el);
    const thenId = el.getAttribute("then");
    const originalChildren = [...el.childNodes].map((n) => n.cloneNode(true));
    // Tracks the last rendered outcome ("shown" | "hidden") so an unrelated
    // parent change does not needlessly tear down and rebuild children,
    // destroying local input state (parity with if/show/hide dedup).
    let currentState;

    function update() {
      // Check if any preceding if/else-if was true
      let prev = el.previousElementSibling;
      while (prev) {
        const prevExpr =
          prev.getAttribute("if") || prev.getAttribute("else-if");
        if (prevExpr) {
          if (evaluate(prevExpr, ctx)) {
            if (currentState === "hidden") return;
            currentState = "hidden";
            _disposeChildren(el);
            el.innerHTML = "";
            el.style.display = "none";
            return;
          }
        } else break;
        prev = prev.previousElementSibling;
      }

      const result = !!evaluate(expr, ctx);
      const nextState = result ? "shown" : "hidden";
      if (nextState === currentState) return;
      currentState = nextState;
      el.style.display = "";
      if (result) {
        if (thenId) {
          const clone = _cloneTemplate(thenId);
          if (clone) {
            _disposeChildren(el);
            el.innerHTML = "";
            el.appendChild(clone);
          }
        } else {
          _disposeChildren(el);
          el.innerHTML = "";
          for (const child of originalChildren)
            el.appendChild(child.cloneNode(true));
        }
        _clearDeclared(el);
        processTree(el);
      } else {
        _disposeChildren(el);
        el.innerHTML = "";
      }
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("else", {
  priority: 10,
  init(el) {
    // Skip if this element also has an "if" directive (else is used as an attribute of if)
    if (el.hasAttribute("if")) return;
    const ctx = findContext(el);
    const thenId = el.getAttribute("then");
    const originalChildren = [...el.childNodes].map((n) => n.cloneNode(true));
    // Tracks the last rendered outcome ("shown" | "hidden") so an unrelated
    // parent change does not needlessly rebuild children, destroying local
    // input state (parity with if/show/hide dedup).
    let currentState;

    function update() {
      // Check if any preceding if/else-if was true
      let prev = el.previousElementSibling;
      while (prev) {
        const prevExpr =
          prev.getAttribute("if") || prev.getAttribute("else-if");
        if (prevExpr) {
          if (evaluate(prevExpr, ctx)) {
            if (currentState === "hidden") return;
            currentState = "hidden";
            _disposeChildren(el);
            el.innerHTML = "";
            el.style.display = "none";
            return;
          }
        } else break;
        prev = prev.previousElementSibling;
      }

      // No preceding condition was true — show else content
      if (currentState === "shown") return;
      currentState = "shown";
      el.style.display = "";
      if (thenId) {
        const clone = _cloneTemplate(thenId);
        if (clone) {
          _disposeChildren(el);
          el.innerHTML = "";
          el.appendChild(clone);
        }
      } else {
        _disposeChildren(el);
        el.innerHTML = "";
        for (const child of originalChildren)
          el.appendChild(child.cloneNode(true));
      }
      _clearDeclared(el);
      processTree(el);
    }
    _watchExpr("", ctx, update);
    update();
  },
});

registerDirective("show", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    const animEnter = el.getAttribute("animate-enter") || el.getAttribute("animate");
    const animLeave = el.getAttribute("animate-leave");
    const transition = el.getAttribute("transition");
    const animDuration = parseInt(el.getAttribute("animate-duration")) || 0;
    let currentState = undefined;

    function update() {
      const result = !!evaluate(expr, ctx);
      if (result === currentState) return;
      currentState = result;

      if (result) {
        el.style.display = "";
        if (animEnter || transition) _animateIn(el, animEnter, transition, animDuration);
      } else {
        if (animLeave || transition) {
          _animateOut(el, animLeave, transition, () => { el.style.display = "none"; }, animDuration);
        } else {
          el.style.display = "none";
        }
      }
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("hide", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    const animEnter = el.getAttribute("animate-enter") || el.getAttribute("animate");
    const animLeave = el.getAttribute("animate-leave");
    const transition = el.getAttribute("transition");
    const animDuration = parseInt(el.getAttribute("animate-duration")) || 0;
    let currentState = undefined;

    function update() {
      const result = !evaluate(expr, ctx);
      if (result === currentState) return;
      currentState = result;

      if (result) {
        el.style.display = "";
        if (animEnter || transition) _animateIn(el, animEnter, transition, animDuration);
      } else {
        if (animLeave || transition) {
          _animateOut(el, animLeave, transition, () => { el.style.display = "none"; }, animDuration);
        } else {
          el.style.display = "none";
        }
      }
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

// Standalone enter animation (e.g. cloned error templates, static markup).
// Skip when if/show/hide own the animate attribute — they already call _animateIn.
registerDirective("animate", {
  priority: 15,
  init(el, name, value) {
    if (el.hasAttribute("if") || el.hasAttribute("show") || el.hasAttribute("hide")) {
      return;
    }
    const animName = el.getAttribute("animate-enter") || value;
    const transition = el.getAttribute("transition");
    const animDuration = parseInt(el.getAttribute("animate-duration")) || 0;
    if (animName || transition) {
      _animateIn(el, animName, transition, animDuration, true);
    }
  },
});

// Splits a comma-separated expression list on top-level commas only,
// ignoring commas inside single/double-quoted string literals or nested
// brackets/parens so `'a,b','c'` yields ["'a,b'", "'c'"].
function _splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      if (ch === quote) {
        let bs = 0;
        for (let j = i - 1; j >= 0 && str[j] === "\\"; j--) bs++;
        if (bs % 2 === 0) quote = null;
      }
    } else if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
    } else if (ch === "," && depth === 0) {
      parts.push(str.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(str.slice(start));
  return parts;
}

registerDirective("switch", {
  priority: 10,
  init(el, name, expr) {
    const ctx = findContext(el);

    function update() {
      const val = evaluate(expr, ctx);
      let matched = false;

      for (const child of [...el.children]) {
        const caseVal = child.getAttribute("case");
        const isDefault = child.hasAttribute("default");
        const thenTpl = child.getAttribute("then");

        if (caseVal) {
          // Support multi-value: case="'a','b'". Split on top-level commas only
          // so a comma inside a string literal (e.g. case="'a,b','c'") is not
          // broken into two non-matching sub-expressions.
          const values = _splitTopLevel(caseVal).map((v) =>
            evaluate(v.trim(), ctx),
          );
          if (!matched && values.includes(val)) {
            matched = true;
            child.style.display = "";
            if (thenTpl) {
              const clone = _cloneTemplate(thenTpl);
              if (clone) {
                _disposeChildren(child);
                child.innerHTML = "";
                child.appendChild(clone);
              }
              child.__declared = false;
              processTree(child);
            } else if (child.__switchDisposed) {
              // Inline case (no `then` template): its descendants were
              // disposed on a previous non-match (display:none branch below),
              // leaving dead, non-reactive DOM in place. Re-run processTree so
              // the inline directives (bind, etc.) re-declare and re-render
              // their reactive content on re-match. Guarded by __switchDisposed
              // so the first render (already declared by the outer walk) does
              // not double-init its directives.
              child.__switchDisposed = false;
              child.__declared = false;
              processTree(child);
            }
          } else {
            _disposeChildren(child);
            child.__switchDisposed = true;
            child.style.display = "none";
          }
        } else if (isDefault) {
          if (matched) {
            _disposeChildren(child);
            child.__switchDisposed = true;
          }
          child.style.display = matched ? "none" : "";
          if (!matched && thenTpl) {
            const clone = _cloneTemplate(thenTpl);
            if (clone) {
              _disposeChildren(child);
              child.innerHTML = "";
              child.appendChild(clone);
            }
            child.__declared = false;
            processTree(child);
          } else if (!matched && child.__switchDisposed) {
            // Inline default re-shown after a previous match disposed it.
            child.__switchDisposed = false;
            child.__declared = false;
            processTree(child);
          }
        }
      }
    }

    _watchExpr(expr, ctx, update);
    update();
  },
});
