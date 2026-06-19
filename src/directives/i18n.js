// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE: t (i18n translations)
//  DIRECTIVE: i18n-ns (load namespace before children)
// ═══════════════════════════════════════════════════════════════════════

import { _i18n, _loadI18nNamespace, _notifyI18n } from "../i18n.js";
import { _watchExpr, _watchI18n } from "../globals.js";
import { evaluate } from "../evaluate.js";
import { findContext, _sanitizeHtml } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";

registerDirective("t", {
  priority: 20,
  init(el, name, key) {
    const ctx = findContext(el);
    const useHtml = el.hasAttribute("t-html");

    function update() {
      const params = {};
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith("t-") && attr.name !== "t" && attr.name !== "t-html") {
          const paramName = attr.name.replace("t-", "");
          params[paramName] = evaluate(attr.value, ctx) ?? attr.value;
        }
      }
      const text = _i18n.t(key, params);
      if (useHtml) {
        _disposeChildren(el);
        el.innerHTML = _sanitizeHtml(text);
      } else {
        el.textContent = text;
      }
    }

    _watchExpr(key, ctx, update);
    _watchI18n(update);
    update();
  },
});

registerDirective("i18n-ns", {
  priority: 1,
  init(el, name, ns) {
    // Empty ns = marker attribute (e.g. route-view); skip loading
    if (!ns) return;

    // Save children to prevent premature t resolution
    const saved = document.createDocumentFragment();
    while (el.firstChild) saved.appendChild(el.firstChild);

    _loadI18nNamespace(ns).then(() => {
      el.appendChild(saved);
      processTree(el);
      _notifyI18n();
    });
  },
});
