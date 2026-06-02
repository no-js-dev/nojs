// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: class-*, style-*
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr } from "../globals.js";
import { evaluate } from "../evaluate.js";
import { findContext } from "../dom.js";
import { registerDirective } from "../registry.js";
import { _watchI18n } from "../i18n.js";

registerDirective("class-*", {
  priority: 20,
  init(el, name, expr) {
    const suffix = name.replace("class-", "");
    const ctx = findContext(el);

    // class-map="{ active: x, bold: y }"
    // Supports space-separated keys: class-map="{ 'bg-sky-500 text-white': x }"
    if (suffix === "map") {
      function update() {
        const obj = evaluate(expr, ctx);
        if (obj && typeof obj === "object") {
          for (const [cls, cond] of Object.entries(obj)) {
            const parts = cls.split(/\s+/).filter(Boolean);
            parts.forEach((c) => el.classList.toggle(c, !!cond));
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
        const arr = evaluate(expr, ctx);
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
      el.classList.toggle(suffix, !!evaluate(expr, ctx));
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
      let prevProps = [];
      function update() {
        const obj = evaluate(expr, ctx);
        if (obj && typeof obj === "object") {
          const nextProps = Object.keys(obj);
          // Clear properties that were set previously but are absent now, so a
          // property removed from the bound object no longer lingers on the
          // element (stale style leak).
          for (const prop of prevProps) {
            if (!(prop in obj)) el.style[prop] = "";
          }
          for (const [prop, val] of Object.entries(obj)) {
            el.style[prop] = val ?? "";
          }
          prevProps = nextProps;
        }
      }
      _watchExpr(expr, ctx, update);
      update();
      return;
    }

    // style-{property}="expr" (e.g. style-color, style-font-size)
    const cssProp = suffix.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    function update() {
      const val = evaluate(expr, ctx);
      el.style[cssProp] = val != null ? String(val) : "";
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});
