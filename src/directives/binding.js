// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: bind, bind-html, bind-*, model
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr, _onDispose, _config, _warn } from "../globals.js";
import { evaluate, _execStatement } from "../evaluate.js";
import { findContext, _sanitizeHtml } from "../dom.js";
import { registerDirective, _disposeChildren } from "../registry.js";

registerDirective("bind", {
  priority: 20,
  init(el, name, expr) {
    const ctx = findContext(el);
    function update() {
      const val = evaluate(expr, ctx);
      el.textContent = (val !== undefined && val !== null) ? String(val) : '';
    }
    _watchExpr(expr, ctx, update);
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

    // Two-way binding for value
    if (
      attrName === "value" &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT")
    ) {
      const inputHandler = () => {
        let val;
        if (el.type === "number") {
          // Keep the prior model value while the input is intermediate/invalid
          // (e.g. "1e", "-", "") so we never silently write NaN/null.
          if (el.value === "" || isNaN(el.valueAsNumber)) return;
          val = el.valueAsNumber;
        } else {
          val = el.value;
        }
        // Pass the value as a bound variable rather than string-interpolating
        // JSON, keeping the write-back consistent with the `model` directive.
        _execStatement(`${expr} = __val`, ctx, { __val: val });
      };
      el.addEventListener("input", inputHandler);
      _onDispose(() => el.removeEventListener("input", inputHandler));
    }

    function update() {
      const val = evaluate(expr, ctx);
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
        if (val) el.setAttribute(attrName, "");
        else el.removeAttribute(attrName);
        if (attrName in el) el[attrName] = !!val;
        return;
      }
      if (val != null) el.setAttribute(attrName, String(_sanitizeAttrValue(attrName, val)));
      else el.removeAttribute(attrName);
    }
    _watchExpr(expr, ctx, update);
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
        const next = val != null ? String(val) : "";
        // Avoid clobbering in-progress edits (e.g. "1." on a number input
        // becomes model=1, which would otherwise rewrite el.value="1" and erase
        // the trailing "."). Skip the write when the element is focused and the
        // current text already represents the same value.
        if (document.activeElement === el) {
          if ((type === "number" || type === "range")) {
            // valueAsNumber compares the rendered numeric value, ignoring
            // trailing dots / leading zeros the user may be mid-typing.
            const current = el.valueAsNumber;
            if (val != null && !isNaN(current) && current === Number(val)) return;
          } else if (el.value === next) {
            return;
          }
        }
        el.value = next;
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
