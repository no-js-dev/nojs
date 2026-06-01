import { _warn, _onDispose } from "../globals.js";
import { findContext } from "../dom.js";
import { registerDirective } from "../registry.js";

// ─── Proxy for $form.fields — returns safe defaults for any field access ────
const _FIELD_DEFAULT = Object.freeze({
  valid: true, dirty: false, touched: false, error: null, value: "",
});

const _fieldsProxy = new Proxy({}, {
  get: () => _FIELD_DEFAULT,
});

registerDirective("validate", {
  priority: 30,
  init(el, attrName) {
    _warn(
      `[NoJS] "validate" has moved to @erickxavier/nojs-elements. ` +
      `Install the plugin and call NoJS.use(NoJSElements) to enable it.`
    );

    // Set a minimal $form shim so templates referencing $form.* don't throw
    const ctx = findContext(el);
    ctx.$form = {
      valid: false,
      dirty: false,
      touched: false,
      submitting: false,
      pending: false,
      errors: {},
      values: {},
      firstError: null,
      errorCount: 0,
      fields: _fieldsProxy,
      reset() {},
    };

    // Intercept form submit to prevent silent failures
    const form = el.tagName === "FORM" ? el : el.closest("form");
    if (form) {
      const handler = (e) => {
        e.preventDefault();
        _warn(
          `[NoJS] Form submission blocked — "validate" requires @erickxavier/nojs-elements.`
        );
      };
      form.addEventListener("submit", handler);
      _onDispose(() => form.removeEventListener("submit", handler));
    }
  },
});
