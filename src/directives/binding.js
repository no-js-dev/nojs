// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: bind, bind-html, bind-*, model
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr, _onDispose, _config, _warn, _compiledFns } from "../globals.js";
import { evaluate, _execStatement } from "../evaluate.js";
import { findContext, _sanitizeHtml } from "../dom.js";
import { registerDirective, _disposeChildren } from "../registry.js";
import { _getCompiledIndex } from "../compiled.js";

registerDirective("bind", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    const _ci = _getCompiledIndex(el, "bind");
    const _compiledFn = _ci !== null ? _compiledFns[_ci] : null;
    function update() {
      const val = _compiledFn ? _compiledFn(ctx) : evaluate(expr, ctx);
      const text = (val !== undefined && val !== null) ? String(val) : '';
      if (el.__t !== text) { el.__t = text; el.textContent = text; }
    }
    _watchExpr(_compiledFn || expr, ctx, update);
    update();
  },
});

registerDirective("bind-html", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    if ((_config.debug || _config.devtools) && !/^['"`]/.test(expr.trim())) {
      _warn(
        `[Security] bind-html used with dynamic expression: "${expr}". ` +
          `Ensure the value is trusted or sanitized — use bind for plain text.`,
        el
      );
    }
    function update() {
      const val = evaluate(expr, ctx);
      if (val != null) {
        _disposeChildren(el);
        el.innerHTML = _sanitizeHtml(String(val));
      }
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

const _SAFE_URL_ATTRS = new Set(["href", "src", "action", "formaction", "poster", "data"]);

// Strip JS vectors from raw SVG markup using DOMParser for robust sanitization.
// Regex-based approaches are bypassable via entity encoding and nested contexts.
function _sanitizeSvgContent(svg) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  // If parsing failed, DOMParser may wrap error in <parsererror> or produce a
  // non-SVG root. In either case return an empty SVG for safety.
  if (root.querySelector("parsererror") ||
      root.nodeName !== "svg" ||
      root.getElementsByTagNameNS("http://www.mozilla.org/newlayout/xml/parsererror.xml", "parsererror").length) {
    return "<svg></svg>";
  }

  function _cleanAttrs(node) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      // Remove on* event handlers
      if (name.startsWith("on")) { node.removeAttribute(attr.name); continue; }
      // Remove javascript: in href/xlink:href
      if ((name === "href" || name === "xlink:href") &&
          attr.value.trim().toLowerCase().startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    }
  }
  // Remove script elements
  for (const s of [...root.querySelectorAll("script")]) s.remove();
  // Clean attributes on root and all descendants
  _cleanAttrs(root);
  for (const node of root.querySelectorAll("*")) _cleanAttrs(node);
  return new XMLSerializer().serializeToString(root);
}

// Sanitize a data:image/svg+xml URI — handles both base64 and URL-encoded forms.
function _sanitizeSvgDataUri(str) {
  try {
    const b64 = str.match(/^data:image\/svg\+xml;base64,(.+)$/i);
    if (b64) {
      const clean = _sanitizeSvgContent(atob(b64[1]));
      return "data:image/svg+xml;base64," + btoa(clean);
    }
    const comma = str.indexOf(",");
    if (comma === -1) return "#";
    const header = str.slice(0, comma + 1);
    const clean = _sanitizeSvgContent(decodeURIComponent(str.slice(comma + 1)));
    return header + encodeURIComponent(clean);
  } catch (_e) {
    return "#";
  }
}

function _sanitizeAttrValue(attrName, value) {
  if (_SAFE_URL_ATTRS.has(attrName)) {
    const str = String(value).trimStart();
    if (/^(javascript|vbscript):/i.test(str)) return "#";
    if (/^data:/i.test(str)) {
      if (/^data:image\/svg\+xml/i.test(str)) return _sanitizeSvgDataUri(str);
      if (!/^data:image\//i.test(str)) return "#";
    }
  }
  return value;
}

registerDirective("bind-*", {
  priority: 20,
  init(el, name, expr) {
    const attrName = name.replace("bind-", "");
    const ctx = findContext(el);

    // Task 2.1: use compiled function when available (bind-html excluded by spec)
    const _ci = _getCompiledIndex(el, name);
    const _compiledFn = _ci !== null ? _compiledFns[_ci] : null;

    // Two-way binding for value
    if (
      attrName === "value" &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT")
    ) {
      const inputHandler = () => {
        const val = el.type === "number" ? Number(el.value) : el.value;
        _execStatement(`${expr} = ${JSON.stringify(val)}`, ctx);
      };
      el.addEventListener("input", inputHandler);
      _onDispose(() => el.removeEventListener("input", inputHandler));
    }

    const _cacheKey = "__a_" + attrName;
    function update() {
      const val = _compiledFn ? _compiledFn(ctx) : evaluate(expr, ctx);
      // Boolean attributes
      if (
        [
          "disabled",
          "readonly",
          "checked",
          "selected",
          "hidden",
          "required",
        ].includes(attrName)
      ) {
        const boolVal = !!val;
        if (el[_cacheKey] !== boolVal) {
          el[_cacheKey] = boolVal;
          if (boolVal) el.setAttribute(attrName, "");
          else el.removeAttribute(attrName);
          if (attrName in el) el[attrName] = boolVal;
        }
        return;
      }
      const strVal = val != null ? String(_sanitizeAttrValue(attrName, val)) : null;
      if (el[_cacheKey] !== strVal) {
        el[_cacheKey] = strVal;
        if (strVal != null) el.setAttribute(attrName, strVal);
        else el.removeAttribute(attrName);
      }
    }
    _watchExpr(_compiledFn || expr, ctx, update);
    update();
  },
});

registerDirective("model", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    const tag = el.tagName;
    const type = el.type;

    // Model → DOM
    function update() {
      const val = evaluate(expr, ctx);
      if (tag === "INPUT" && type === "checkbox") {
        el.checked = !!val;
      } else if (tag === "INPUT" && type === "radio") {
        el.checked = el.value === String(val);
      } else if (tag === "SELECT") {
        el.value = val != null ? String(val) : "";
      } else {
        el.value = val != null ? String(val) : "";
      }
    }

    // DOM → Model
    const event =
      tag === "SELECT" || type === "checkbox" || type === "radio"
        ? "change"
        : "input";
    const domHandler = () => {
      let val;
      if (type === "checkbox") val = el.checked;
      else if (type === "number" || type === "range") val = Number(el.value);
      else val = el.value;
      _execStatement(`${expr} = __val`, ctx, { __val: val });
    };
    el.addEventListener(event, domHandler);
    _onDispose(() => el.removeEventListener(event, domHandler));

    _watchExpr(expr, ctx, update);
    update();
  },
});
