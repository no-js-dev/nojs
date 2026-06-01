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

    function update() {
      // Check if any preceding if/else-if was true
      let prev = el.previousElementSibling;
      while (prev) {
        const prevExpr =
          prev.getAttribute("if") || prev.getAttribute("else-if");
        if (prevExpr) {
          if (evaluate(prevExpr, ctx)) {
            _disposeChildren(el);
            el.innerHTML = "";
            el.style.display = "none";
            return;
          }
        } else break;
        prev = prev.previousElementSibling;
      }

      const result = !!evaluate(expr, ctx);
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

    function update() {
      // Check if any preceding if/else-if was true
      let prev = el.previousElementSibling;
      while (prev) {
        const prevExpr =
          prev.getAttribute("if") || prev.getAttribute("else-if");
        if (prevExpr) {
          if (evaluate(prevExpr, ctx)) {
            _disposeChildren(el);
            el.innerHTML = "";
            el.style.display = "none";
            return;
          }
        } else break;
        prev = prev.previousElementSibling;
      }

      // No preceding condition was true — show else content
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
          // Support multi-value: case="'a','b'"
          const values = caseVal
            .split(",")
            .map((v) => evaluate(v.trim(), ctx));
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
            }
          } else {
            _disposeChildren(child);
            child.style.display = "none";
          }
        } else if (isDefault) {
          if (matched) _disposeChildren(child);
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
          }
        }
      }
    }

    _watchExpr(expr, ctx, update);
    update();
  },
});
