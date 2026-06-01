// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: validate, error-boundary
//  HELPER: _validateField, _getValidityErrors, _resolveErrorMessage
// ═══════════════════════════════════════════════════════════════════════

import { _validators, _onDispose } from "../globals.js";
import { createContext } from "../context.js";
import { findContext, _cloneTemplate, _clearDeclared } from "../dom.js";
import { registerDirective, processTree, _disposeChildren, _disposeTree } from "../registry.js";
import { evaluate } from "../evaluate.js";

// ── ValidityState → rule name mapping ────────────────────────────────
const _validityMap = [
  ["valueMissing", "required"],
  ["typeMismatch", null],       // resolved to input type at runtime
  ["tooShort", "minlength"],
  ["tooLong", "maxlength"],
  ["patternMismatch", "pattern"],
  ["rangeUnderflow", "min"],
  ["rangeOverflow", "max"],
  ["stepMismatch", "step"],
];

// ── Priority order for error display ─────────────────────────────────
const _rulePriority = [
  "required", "email", "url", "number", "date", "time",
  "datetime-local", "month", "week", "tel",
  "minlength", "maxlength", "pattern", "min", "max", "step",
];

function _getFieldType(field) {
  return (field.getAttribute("type") || "text").toLowerCase();
}

// ── Get all failing rules from ValidityState + NoJS validators ───────
function _getValidityErrors(field, allValues) {
  const errors = [];
  const seenRules = new Set();

  // First, check NoJS-specific validators from validate="" attribute
  // (these take priority over native ValidityState messages)
  const rules = field.getAttribute("validate");
  if (rules) {
    const ruleList = rules.split("|").map((r) => r.trim());
    for (const rule of ruleList) {
      const [name, ...args] = rule.split(":");
      const fn = _validators[name];
      if (fn) {
        const result = fn(field.value, ...args, allValues);
        if (result !== true && result) {
          errors.push({ rule: name, message: result });
          seenRules.add(name);
        }
      } else {
        // Built-in NoJS validators (backward compat + NoJS-only)
        const value = field.value;
        let msg = null;
        switch (name) {
          case "required":
            if (value == null || String(value).trim() === "") msg = "Required";
            break;
          case "email":
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) msg = "Invalid email";
            break;
          case "url":
            try { new URL(value); } catch { msg = "Invalid URL"; }
            break;
          case "min":
            if (Number(value) < Number(args[0])) msg = `Minimum value is ${args[0]}`;
            break;
          case "max":
            if (Number(value) > Number(args[0])) msg = `Maximum value is ${args[0]}`;
            break;
          case "custom":
            if (args[0] && _validators[args[0]]) {
              const result = _validators[args[0]](value, allValues);
              if (result !== true && result) msg = result;
            }
            break;
        }
        if (msg) {
          errors.push({ rule: name, message: msg });
          seenRules.add(name);
        }
      }
    }
  }

  // Then, check native ValidityState (skip rules already covered by NoJS validators)
  const validity = field.validity;
  if (validity && !validity.valid) {
    for (const [prop, ruleName] of _validityMap) {
      if (validity[prop]) {
        const name = ruleName || _getFieldType(field);
        if (!seenRules.has(name)) {
          errors.push({ rule: name, message: field.validationMessage });
          seenRules.add(name);
        }
      }
    }
  }

  return errors;
}

// ── Resolve error message: error-{rule} attr → error attr → default ──
function _resolveErrorMessage(field, ruleName, defaultMsg) {
  const perRule = field.getAttribute(`error-${ruleName}`);
  if (perRule) return perRule;
  const generic = field.getAttribute("error");
  if (generic && !generic.startsWith("#")) return generic;
  return defaultMsg;
}

// ── Pick the highest-priority error from a list ──────────────────────
function _pickError(errors, field) {
  if (!errors.length) return null;

  // Sort by priority
  const sorted = [...errors].sort((a, b) => {
    const ai = _rulePriority.indexOf(a.rule);
    const bi = _rulePriority.indexOf(b.rule);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const top = sorted[0];
  return {
    rule: top.rule,
    message: _resolveErrorMessage(field, top.rule, top.message),
  };
}

function _findErrorTemplateWrapper(anchorEl) {
  const scope = anchorEl.closest("form") || document;
  for (const el of scope.querySelectorAll('div[style="display: contents;"]')) {
    if (el.__errorTemplateFor === anchorEl) return el;
  }
  return null;
}

// ── Render template reference for error ──────────────────────────────
function _renderErrorTemplate(selector, errorMsg, ruleName, anchorEl, ctx) {
  const existing = _findErrorTemplateWrapper(anchorEl);
  if (existing) {
    // Compare via the error wrapper's own context (not a child ctx that may shadow $error).
    const sameError =
      existing.__ctx?.$error === errorMsg &&
      existing.__ctx?.$rule === ruleName;
    if (sameError) return;
    _disposeTree(existing);
    existing.remove();
  }

  const tpl = document.querySelector(selector);
  if (!tpl) return;

  const clone = tpl.content.cloneNode(true);
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";
  wrapper.__errorTemplateFor = anchorEl;
  const childCtx = createContext({ $error: errorMsg, $rule: ruleName }, ctx);
  wrapper.__ctx = childCtx;
  wrapper.appendChild(clone);

  // Insert after the template element (in-place rendering)
  tpl.parentNode.insertBefore(wrapper, tpl.nextSibling);
  _clearDeclared(wrapper);
  processTree(wrapper);
}

function _clearErrorTemplate(anchorEl) {
  const existing = _findErrorTemplateWrapper(anchorEl);
  if (existing) {
    _disposeTree(existing);
    existing.remove();
  }
}

// ── Check if field should be validated (validate-if) ─────────────────
function _shouldValidate(field, ctx) {
  const expr = field.getAttribute("validate-if");
  if (!expr) return true;
  try {
    return !!evaluate(expr, ctx);
  } catch {
    return true;
  }
}

// ── Get validate-on triggers ─────────────────────────────────────────
function _getValidationTriggers(field, form) {
  const fieldAttr = field.getAttribute("validate-on");
  if (fieldAttr) return fieldAttr.split(/\s+/);
  const formAttr = form ? form.getAttribute("validate-on") : null;
  if (formAttr) return formAttr.split(/\s+/);
  return ["input", "focusout"];
}

// ── Backward-compat: old _validateField for field-level validation ───
function _validateField(value, rules, allValues) {
  const ruleList = rules.split("|").map((r) => r.trim());
  for (const rule of ruleList) {
    const [name, ...args] = rule.split(":");
    const fn = _validators[name];
    if (fn) {
      const result = fn(value, ...args, allValues);
      if (result !== true && result) return result;
    } else {
      switch (name) {
        case "required":
          if (value == null || String(value).trim() === "") return "Required";
          break;
        case "email":
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email";
          break;
        case "url":
          try { new URL(value); } catch { return "Invalid URL"; }
          break;
        case "min":
          if (Number(value) < Number(args[0])) return `Minimum value is ${args[0]}`;
          break;
        case "max":
          if (Number(value) > Number(args[0])) return `Maximum value is ${args[0]}`;
          break;
        case "custom":
          if (args[0] && _validators[args[0]]) {
            const result = _validators[args[0]](value, allValues);
            if (result !== true && result) return result;
          }
          break;
      }
    }
  }
  return null;
}

// ── Bind form context so descendants (show/hide, bind, etc.) share $form ──
function _bindFormContext(formEl) {
  if (formEl.__ctx) return formEl.__ctx;
  const parentCtx = formEl.parentElement
    ? findContext(formEl.parentElement)
    : null;
  const ctx = createContext({}, parentCtx);
  formEl.__ctx = ctx;
  return ctx;
}

registerDirective("validate", {
  priority: 30,
  init(el, name, rules) {
    // ═════════════════════════════════════════════════════
    //  FORM-LEVEL VALIDATION
    // ═════════════════════════════════════════════════════
    if (el.tagName === "FORM") {
      const ctx = _bindFormContext(el);
      // Prevent native browser validation popups
      el.setAttribute("novalidate", "");

      const errorClassAttr = el.getAttribute("error-class");
      const touchedFields = new Set();
      const dirtyFields = new Set();
      const pendingValidators = new Map();

      const formCtx = {
        valid: false,
        dirty: false,
        touched: false,
        submitting: false,
        pending: false,
        errors: {},
        values: {},
        firstError: null,
        errorCount: 0,
        fields: {},
        reset: () => {
          formCtx.dirty = false;
          formCtx.touched = false;
          formCtx.pending = false;
          formCtx.submitting = false;
          touchedFields.clear();
          dirtyFields.clear();
          el.reset();
          checkValidity();
        },
        endSubmit: () => {
          formCtx.submitting = false;
          checkValidity();
        },
      };
      ctx.$set("$form", formCtx);

      // ── Collect all form fields ────────────────────────
      function getFields() {
        return el.querySelectorAll("input, textarea, select");
      }

      // ── Main validation check ──────────────────────────
      function checkValidity() {
        const errors = {};
        const values = {};
        const fields = {};
        let valid = true;
        let firstError = null;
        let errorCount = 0;
        let hasPending = false;

        for (const field of getFields()) {
          if (!field.name) continue;

          // Collect value
          if (field.type === "checkbox") {
            values[field.name] = field.checked;
          } else if (field.type === "radio") {
            if (field.checked) values[field.name] = field.value;
            else if (!(field.name in values)) values[field.name] = "";
          } else {
            values[field.name] = field.value;
          }
        }

        for (const field of getFields()) {
          if (!field.name) continue;

          const fieldTouched = touchedFields.has(field.name);
          const fieldDirty = dirtyFields.has(field.name);

          // Check validate-if
          if (!_shouldValidate(field, ctx)) {
            // Field excluded from validation
            fields[field.name] = {
              valid: true, dirty: fieldDirty, touched: fieldTouched,
              error: null, value: values[field.name],
            };
            continue;
          }

          // Get all errors for this field
          const fieldErrors = _getValidityErrors(field, values);
          const topError = _pickError(fieldErrors, field);

          const fieldValid = !topError;
          const fieldInteracted = fieldTouched || fieldDirty;

          // $form.valid reflects real state (keeps submit disabled)
          if (!fieldValid) valid = false;

          // $form.errors only shows errors for interacted fields
          if (!fieldValid && fieldInteracted) {
            errors[field.name] = topError.message;
            errorCount++;
            if (!firstError) firstError = topError.message;
          }

          // Per-field context ($field)
          fields[field.name] = {
            valid: fieldValid,
            dirty: fieldDirty,
            touched: fieldTouched,
            error: topError ? topError.message : null,
            value: values[field.name],
          };

          // error-class handling
          const fieldErrorClass = field.getAttribute("error-class") || errorClassAttr;
          if (fieldErrorClass) {
            const classes = fieldErrorClass.split(/\s+/);
            if (!fieldValid && fieldInteracted) {
              field.classList.add(...classes);
            } else {
              field.classList.remove(...classes);
            }
          }

          // error template references (error="#tpl" or error-{rule}="#tpl")
          if (topError && fieldInteracted) {
            const perRuleVal = field.getAttribute(`error-${topError.rule}`);
            const genericVal = field.getAttribute("error");
            const tplRef = (perRuleVal && perRuleVal.startsWith("#") ? perRuleVal : null) ||
                           (genericVal && genericVal.startsWith("#") ? genericVal : null);
            if (tplRef) {
              _renderErrorTemplate(tplRef, topError.message, topError.rule, field, ctx);
            } else {
              _clearErrorTemplate(field);
            }
          } else {
            _clearErrorTemplate(field);
          }

          // $field via as="" attribute
          const asAttr = field.getAttribute("as");
          if (asAttr) {
            ctx.$set(asAttr, fields[field.name]);
          }
        }

        // Check for pending async validators
        if (pendingValidators.size > 0) hasPending = true;

        formCtx.valid = valid;
        formCtx.errors = errors;
        formCtx.values = values;
        formCtx.fields = fields;
        formCtx.firstError = firstError;
        formCtx.errorCount = errorCount;
        formCtx.pending = hasPending;
        ctx.$set("$form", { ...formCtx });

        // Auto-disable submit buttons
        _updateSubmitButtons(el);
      }

      // ── Auto-disable submit buttons ────────────────────
      function _updateSubmitButtons(form) {
        const isEnabled = formCtx.valid && !formCtx.pending && !formCtx.submitting;
        const buttons = form.querySelectorAll(
          'button:not([type="button"]), input[type="submit"]'
        );
        for (const btn of buttons) {
          // Skip if user has explicit disabled expression
          if (btn.hasAttribute("disabled") && btn.getAttribute("disabled") !== "") {
            const val = btn.getAttribute("disabled");
            // Only skip if it's a custom expression (not empty or "disabled")
            if (val !== "disabled" && val !== "true" && val !== "false") continue;
          }
          btn.disabled = !isEnabled;
          btn.__autoDisabled = true;
        }
      }

      // ── Event binding with validate-on support ─────────
      function bindFieldEvents(field) {
        if (!field.name) return;
        const triggers = _getValidationTriggers(field, el);

        const handler = () => {
          dirtyFields.add(field.name);
          formCtx.dirty = true;
          checkValidity();
        };

        const touchHandler = () => {
          touchedFields.add(field.name);
          formCtx.touched = true;
          checkValidity();
        };

        if (triggers.includes("input")) {
          field.addEventListener("input", handler);
          _onDispose(() => field.removeEventListener("input", handler));
        } else {
          // Always track dirty and re-validate on input for data accuracy
          // (validate-on only affects visual feedback like error-class/templates)
          const silentInputHandler = () => {
            dirtyFields.add(field.name);
            formCtx.dirty = true;
            checkValidity();
          };
          field.addEventListener("input", silentInputHandler);
          _onDispose(() => field.removeEventListener("input", silentInputHandler));
        }
        if (triggers.includes("blur") || triggers.includes("focusout")) {
          const blurFocusoutHandler = (e) => {
            touchHandler();
            if (triggers.includes("blur")) handler();
          };
          field.addEventListener("focusout", blurFocusoutHandler);
          _onDispose(() => field.removeEventListener("focusout", blurFocusoutHandler));
        } else {
          // Always track touched on focusout
          field.addEventListener("focusout", touchHandler);
          _onDispose(() => field.removeEventListener("focusout", touchHandler));
        }
        if (triggers.includes("submit")) {
          field.addEventListener("focusout", touchHandler);
          _onDispose(() => field.removeEventListener("focusout", touchHandler));
        }
      }

      // Default events if no validate-on (backward compat)
      const hasValidateOn = el.hasAttribute("validate-on");
      const hasFieldValidateOn = [...getFields()].some(f => f.hasAttribute("validate-on"));

      if (!hasValidateOn && !hasFieldValidateOn) {
        // Legacy behavior: form-level input, change, and focusout
        const inputHandler = (e) => {
          const target = e.target;
          if (target && target.name) {
            dirtyFields.add(target.name);
          }
          formCtx.dirty = true;
          checkValidity();
        };
        el.addEventListener("input", inputHandler);
        _onDispose(() => el.removeEventListener("input", inputHandler));
        el.addEventListener("change", inputHandler);
        _onDispose(() => el.removeEventListener("change", inputHandler));
        const focusoutHandler = (e) => {
          if (e.target && e.target.name) {
            touchedFields.add(e.target.name);
          }
          formCtx.touched = true;
          checkValidity();
        };
        el.addEventListener("focusout", focusoutHandler);
        _onDispose(() => el.removeEventListener("focusout", focusoutHandler));
      } else {
        // Per-field event binding with validate-on
        for (const field of getFields()) {
          bindFieldEvents(field);
        }
      }

      const submitHandler = (e) => {
        // Mark all fields as touched on submit
        for (const field of getFields()) {
          if (field.name) touchedFields.add(field.name);
        }
        formCtx.touched = true;
        checkValidity();

        if (!formCtx.valid || formCtx.pending) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }

        // Set submitting before fetch vs native submit branch
        formCtx.submitting = true;
        _updateSubmitButtons(el);
        ctx.$set("$form", { ...formCtx });
      };
      // Capture phase: run before post=/put=/etc. handlers so validation
      // can block invalid submits and set $form.submitting first.
      el.addEventListener("submit", submitHandler, true);
      _onDispose(() => el.removeEventListener("submit", submitHandler, true));
      el.__nojsResetSubmitting = () => {
        formCtx.submitting = false;
        checkValidity();
      };
      _onDispose(() => {
        delete el.__nojsResetSubmitting;
      });

      // Initial check
      requestAnimationFrame(checkValidity);
      return;
    }

    // ═════════════════════════════════════════════════════
    //  FIELD-LEVEL VALIDATION (standalone, outside form)
    // ═════════════════════════════════════════════════════
    const ctx = findContext(el);
    if (
      rules &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT")
    ) {
      const errorTpl = el.getAttribute("error");
      const fieldInputHandler = () => {
        const err = _validateField(el.value, rules, {});
        if (err && errorTpl) {
          let errorEl = el.nextElementSibling?.__validationError
            ? el.nextElementSibling
            : null;
          if (!errorEl) {
            errorEl = document.createElement("div");
            errorEl.__validationError = true;
            errorEl.style.display = "contents";
            el.parentNode.insertBefore(errorEl, el.nextSibling);
          }
          const clone = _cloneTemplate(errorTpl);
          if (clone) {
            const childCtx = createContext({ err: { message: err } }, ctx);
            _disposeChildren(errorEl);
            errorEl.innerHTML = "";
            errorEl.__ctx = childCtx;
            errorEl.appendChild(clone);
            processTree(errorEl);
          }
        } else {
          const errorEl = el.nextElementSibling?.__validationError
            ? el.nextElementSibling
            : null;
          if (errorEl) {
            _disposeChildren(errorEl);
            errorEl.innerHTML = "";
          }
        }
      };
      el.addEventListener("input", fieldInputHandler);
      _onDispose(() => el.removeEventListener("input", fieldInputHandler));
    }
  },
});

registerDirective("error-boundary", {
  priority: 1,
  init(el, name, fallbackTpl) {
    const ctx = findContext(el);

    function showFallback(message) {
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
    }

    // Listen for NoJS expression errors dispatched from event handlers
    const nojsErrorHandler = (e) => {
      showFallback(e.detail?.message || "An error occurred");
    };
    el.addEventListener("nojs:error", nojsErrorHandler);
    _onDispose(() => el.removeEventListener("nojs:error", nojsErrorHandler));

    // Listen for window-level errors (resource load failures, etc.)
    const errorHandler = (e) => {
      if (el.contains(e.target) || el === e.target) {
        showFallback(e.message || "An error occurred");
      }
    };
    window.addEventListener("error", errorHandler);
    _onDispose(() => window.removeEventListener("error", errorHandler));
  },
});
