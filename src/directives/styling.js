// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: class-*, style-*
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr } from "../globals.js";
import { evaluate } from "../evaluate.js";
import { findContext } from "../dom.js";
import { registerDirective } from "../registry.js";
import { _watchI18n } from "../i18n.js";
import { _getCompiledIndex } from "../compiled.js";

// ── Helpers ──────────────────────────────────────────────────────────

/** Evaluate using a pre-compiled function when available, else fall back to evaluate(). */
function _eval(el, directive, expr, ctx) {
  const idx = _getCompiledIndex(el, directive);
  return idx !== null ? window.NoJS._compiled[idx](ctx) : evaluate(expr, ctx);
}

/** Toggle a single class using el.className (faster than classList.toggle).
 *  Reads current className, adds/removes the token, writes back only if changed. */
function _toggleClass(el, cls, force) {
  const cacheKey = "__cls_" + cls;
  if (el[cacheKey] === force) return;       // 1.1 — cached, skip DOM write
  el[cacheKey] = force;

  // 1.3 — direct className manipulation instead of classList.toggle
  const cur = el.className;
  // Quick check via indexOf before building regex (hot path)
  const hasClass = cur && (" " + cur + " ").indexOf(" " + cls + " ") !== -1;
  if (force && !hasClass) {
    el.className = cur ? cur + " " + cls : cls;
  } else if (!force && hasClass) {
    // Remove class: replace with regex, trim extra spaces
    el.className = (" " + cur + " ").replace(" " + cls + " ", " ").trim();
  }
}

registerDirective("class-*", {
  priority: 20,
  init(el, name, expr) {
    const suffix = name.replace("class-", "");
    const ctx = findContext(el);

    // class-map="{ active: x, bold: y }"
    // Supports space-separated keys: class-map="{ 'bg-sky-500 text-white': x }"
    if (suffix === "map") {
      function update() {
        const obj = _eval(el, "class-map", expr, ctx);
        if (obj && typeof obj === "object") {
          for (const [cls, cond] of Object.entries(obj)) {
            const parts = cls.split(/\s+/).filter(Boolean);
            const val = !!cond;
            parts.forEach((c) => _toggleClass(el, c, val));
          }
        }
      }
      _watchExpr(expr, ctx, update);
      update();
      return;
    }

    // class-list="['a', condition ? 'b' : 'c']"
    if (suffix === "list") {
      let prevClasses = [];
      function update() {
        const arr = _eval(el, "class-list", expr, ctx);
        if (Array.isArray(arr)) {
          prevClasses.forEach((cls) => {
            if (cls) el.classList.remove(cls);
          });
          const next = arr.filter(Boolean);
          next.forEach((cls) => el.classList.add(cls));
          prevClasses = next;
        }
      }
      _watchExpr(expr, ctx, update);
      update();
      return;
    }

    // class-{name}="expr"
    function update() {
      _toggleClass(el, suffix, !!_eval(el, "class-" + suffix, expr, ctx));
    }
    _watchExpr(expr, ctx, update);
    if (expr.includes("$i18n") || expr.includes("NoJS.locale") || expr.includes("window.NoJS.locale")) _watchI18n(update);
    update();
  },
});

registerDirective("style-*", {
  priority: 20,
  init(el, name, expr) {
    const suffix = name.replace("style-", "");
    const ctx = findContext(el);

    // style-map="{ color: x, fontSize: y }"
    if (suffix === "map") {
      function update() {
        const obj = _eval(el, "style-map", expr, ctx);
        if (obj && typeof obj === "object") {
          for (const [prop, val] of Object.entries(obj)) {
            const resolved = val ?? "";
            const cacheKey = "__sty_" + prop;
            if (el[cacheKey] === resolved) continue;   // 1.1 — skip if cached
            el[cacheKey] = resolved;
            el.style[prop] = resolved;
          }
        }
      }
      _watchExpr(expr, ctx, update);
      update();
      return;
    }

    // style-{property}="expr" (e.g. style-color, style-font-size)
    const cssProp = suffix.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const cacheKey = "__sty_" + cssProp;
    function update() {
      const val = _eval(el, "style-" + suffix, expr, ctx);
      const resolved = val != null ? String(val) : "";
      if (el[cacheKey] === resolved) return;            // 1.1 — skip if cached
      el[cacheKey] = resolved;
      el.style[cssProp] = resolved;
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});
