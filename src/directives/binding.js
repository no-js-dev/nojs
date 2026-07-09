// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: bind, bind-html, bind-*, model
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr, _onDispose, _config, _warn } from "../globals.js";
import { evaluate, _execStatement } from "../evaluate.js";
import { findContext, _sanitizeHtml } from "../dom.js";
import { registerDirective, _disposeChildren } from "../registry.js";

registerDirective("bind", {
  priority: 20,
  gated: true,
  init(el, name, expr) {
    const ctx = findContext(el);
    // Value memo: identical evaluation result = no DOM touch. Rows notified
    // as a group (loop reconcile) re-evaluate cheaply instead of re-writing.
    let last;
    function update() {
      const val = evaluate(expr, ctx);
      const text = (val !== undefined && val !== null) ? String(val) : '';
      if (text === last) return;
      last = text;
      el.textContent = text;
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("bind-html", {
  priority: 20,
  gated: true,
  init(el, name, expr) {
    const ctx = findContext(el);
    if ((_config.debug || _config.devtools) && !/^['"`]/.test(expr.trim())) {
      _warn(
        `[Security] bind-html used with dynamic expression: "${expr}". ` +
          `Ensure the value is trusted or sanitized — use bind for plain text.`,
        el
      );
    }
    // Memo on the raw string: skips disposal + sanitization + innerHTML when
    // the evaluated markup is unchanged (sanitize is the expensive part).
    let last;
    function update() {
      const val = evaluate(expr, ctx);
      if (val != null) {
        const html = String(val);
        if (html === last) return;
        last = html;
        _disposeChildren(el);
        el.innerHTML = _sanitizeHtml(html);
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
      // Remove javascript:/vbscript: in href/xlink:href. Collapse EVERY ASCII
      // control + whitespace char (U+0000–U+0020) before the scheme test — an
      // embedded tab/newline/NUL (e.g. "java\tscript:") is ignored by browsers
      // but slips past a leading-only trim, so we strip globally to catch it.
      if (name === "href" || name === "xlink:href") {
        const scheme = attr.value.toLowerCase().replace(/[\u0000-\u0020]/g, "");
        if (/^(javascript|vbscript):/.test(scheme)) {
          node.removeAttribute(attr.name);
        }
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
    // Collapse EVERY ASCII control + whitespace char (U+0000–U+0020) before the
    // scheme check. DOMParser/entity decoding can embed a literal tab/newline/NUL
    // inside a scheme (e.g. "java\tscript:"); browsers ignore those interior chars
    // and resolve it to "javascript:". A leading-only trim let such values slip past
    // /^(javascript|vbscript):/, so we strip globally to catch them.
    const scheme = str.toLowerCase().replace(/[\u0000-\u0020]/g, "");
    if (/^(javascript|vbscript):/.test(scheme)) return "#";
    if (/^data:/.test(scheme)) {
      // Feed _sanitizeSvgDataUri the original (trimmed) value, not the stripped one,
      // so the SVG payload is preserved intact.
      if (/^data:image\/svg\+xml/.test(scheme)) return _sanitizeSvgDataUri(str);
      if (!/^data:image\//.test(scheme)) return "#";
    }
  }
  return value;
}

const _BOOL_ATTRS = new Set([
  "disabled", "readonly", "checked", "selected", "hidden", "required",
]);

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

    // Value memo: attrName is fixed per instance, so `last` only ever holds
    // one branch's shape (boolean for boolean attrs, string|null otherwise).
    // The memo alone can't authorize a skip: the DOM can drift externally
    // (a user click flips `checked`, a script rewrites the attribute), and
    // skipping then would leave the element out of sync with the model —
    // so the skip also requires the live DOM to still agree.
    let last;
    function update() {
      const val = evaluate(expr, ctx);
      // Boolean attributes
      if (_BOOL_ATTRS.has(attrName)) {
        const on = !!val;
        const domOn = attrName in el ? !!el[attrName] : el.hasAttribute(attrName);
        if (on === last && domOn === on) return;
        last = on;
        if (on) el.setAttribute(attrName, "");
        else el.removeAttribute(attrName);
        if (attrName in el) el[attrName] = on;
        return;
      }
      const str = val != null ? String(_sanitizeAttrValue(attrName, val)) : null;
      if (str === last && el.getAttribute(attrName) === str) return;
      last = str;
      if (str != null) el.setAttribute(attrName, str);
      else el.removeAttribute(attrName);
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("model", {
  priority: 20,
  gated: true,
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
