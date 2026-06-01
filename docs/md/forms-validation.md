# Forms & Validation

> **Moved to NoJS Elements** — As of v1.13.0, the `validate` directive and form validation rules are part of the `@erickxavier/nojs-elements` plugin.
>
> See the [NoJS Elements documentation](https://github.com/ErickXavier/nojs-elements) for the full reference.
>
> **Migration:** Install `@erickxavier/nojs-elements` and add `NoJS.use(NoJSElements)` before `NoJS.init()`.
>
> **Note:** Declarative form submission (`post`, `put`, etc.) remains in core — only the `validate` directive moved.

## Declarative Form Submission

```html
<form post="/api/register"
      success="#registerSuccess"
      error="#registerError"
      loading="#registerLoading"
      validate>

  <input type="text"     name="name"     required minlength="2" />
  <input type="email"    name="email"    required />
  <input type="password" name="password" required minlength="8"
         pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" />

  <button type="submit">Register</button>  <!-- auto-disabled when invalid -->

</form>
```

---

## Validation Rules

No.JS automatically detects **native HTML5 validation attributes** — no `validate` attribute needed for standard rules:

```html
<!-- All native HTML5 validation works automatically -->
<input required />
<input minlength="3" maxlength="50" />
<input type="email" />
<input type="url" />
<input type="number" min="1" max="100" step="5" />
<input pattern="[0-9]{3}-[0-9]{4}" />
```

The `validate` attribute is only needed for **No.JS-specific validators** that go beyond what HTML5 offers:

```html
<input validate="custom:validateUsername" />  <!-- Custom function -->
```

---

## Per-Rule Error Messages

Use `error-{rule}` attributes to set a custom message for a specific validation rule, or `error` for a generic fallback:

```html
<input type="email" name="email" required
       error-required="Email is required"
       error-email="Please enter a valid email"
       error="This field is invalid" />
```

When multiple rules fail, errors are resolved by **priority** (required → type-based → length → pattern → range).

---

## Error Templates

Point an error attribute to a `<template>` using a `#` prefix to render rich error UI:

```html
<input type="email" name="email" required
       error="#emailError" />

<template id="emailError">
  <span class="field-error" bind="$error"></span>
</template>
```

Inside the template, `$error` contains the error message and `$rule` contains the failing rule name. The template is rendered after the `<template>` element and automatically removed when the field becomes valid.

Per-rule templates work too:

```html
<input name="user" required validate="custom:checkAvailability"
       error-required="#reqTpl"
       error-custom="#customTpl" />
```

---

## Error CSS Class

Use `error-class` on the form or on individual fields to automatically toggle a CSS class when a field is invalid **and touched**:

```html
<!-- Form-level: applies to all fields -->
<form validate error-class="is-invalid">
  <input name="email" required />  <!-- gets .is-invalid when invalid + touched -->
</form>

<!-- Per-field override -->
<input name="name" required error-class="field-error" />
```

The class is added only after the field has been touched (focused and blurred), so users don't see errors before interacting with the form.

---

## `$form` — Form Context

Inside any `<form>` with the `validate` attribute, `$form` provides:

| Property | Type | Description |
|----------|------|-------------|
| `$form.valid` | `boolean` | `true` if all fields pass validation |
| `$form.dirty` | `boolean` | `true` if any field has been modified |
| `$form.touched` | `boolean` | `true` if any field has been focused and blurred |
| `$form.submitting` | `boolean` | `true` while the request is in flight |
| `$form.pending` | `boolean` | `true` while async validators are running |
| `$form.errors` | `object` | Map of field names → error messages |
| `$form.values` | `object` | Current form values |
| `$form.firstError` | `string\|null` | Error message of the first invalid field (DOM order) |
| `$form.errorCount` | `number` | Number of fields currently failing validation |
| `$form.fields` | `object` | Per-field state (see below) |
| `$form.reset()` | `function` | Reset form to initial values, clear errors and classes |

```html
<form post="/api/contact" validate>
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required minlength="10"></textarea>

  <p show="$form.errors.email" class="error" bind="$form.errors.email"></p>

  <!-- Show first error as a summary -->
  <p show="$form.firstError" class="error-summary" bind="$form.firstError"></p>
  <p show="$form.errorCount" bind="$form.errorCount + ' field(s) need attention'"></p>

  <button type="submit"
          bind-disabled="!$form.valid || $form.submitting">
    <span hide="$form.submitting">Send</span>
    <span show="$form.submitting">Sending...</span>
  </button>
</form>
```

---

## `$form.fields` — Per-Field State

`$form.fields` exposes individual field state keyed by field `name`:

| Property | Type | Description |
|----------|------|-------------|
| `$form.fields.{name}.valid` | `boolean` | Whether this field passes validation |
| `$form.fields.{name}.error` | `string\|null` | Error message for this field |
| `$form.fields.{name}.dirty` | `boolean` | Whether this field has been modified |
| `$form.fields.{name}.touched` | `boolean` | Whether this field has been focused and blurred |

```html
<form validate>
  <input type="email" name="email" required />

  <p show="$form.fields.email.touched && !$form.fields.email.valid"
     bind="$form.fields.email.error"
     class="error"></p>
</form>
```

### Field Aliases with `as`

Use the `as` attribute to expose a field's state under a custom name in the context:

```html
<form validate>
  <input type="email" name="email" required as="emailField" />

  <!-- Access via $form.fields.email OR via the alias -->
  <p show="!emailField.valid && emailField.touched"
     bind="emailField.error"></p>
</form>
```

---

## Validation Triggers (`validate-on`)

By default, validation runs on `input` and `focusout`. Use `validate-on` to change when visual feedback appears:

```html
<!-- Form-level: validate on blur only -->
<form validate validate-on="blur">
  <input name="email" required />
</form>

<!-- Per-field override -->
<form validate>
  <input name="email" required validate-on="blur" />
  <input name="name" required />  <!-- uses default: input + focusout -->
</form>
```

> **Note:** Internally, `$form` data is always kept up-to-date regardless of `validate-on`. The trigger only controls when **visual feedback** (error messages, error classes) is shown.

---

## Conditional Validation (`validate-if`)

Skip validation for a field based on a condition:

```html
<form validate>
  <input type="checkbox" on:change="hasCompany = $event.target.checked" />
  <label>I have a company</label>

  <input name="company" required
         validate-if="hasCompany"
         placeholder="Company name" />
</form>
```

When `validate-if` evaluates to `false`, the field is treated as valid and excluded from `$form.errors`.

---

## Auto-Disable Submit Buttons

Submit buttons (`<button type="submit">`, `<input type="submit">`, and `<button>` without a `type`) are **automatically disabled** when the form is invalid. No `bind-disabled` needed:

```html
<form validate>
  <input name="email" required />
  <button type="submit">Send</button>  <!-- auto-disabled when invalid -->
</form>
```

Buttons with `type="button"` are not affected. If you set a custom `bind-disabled` expression, the auto-disable is skipped for that button.

---

## Custom Validators

```html
<script>
  NoJS.validator('strongPassword', (value) => {
    if (value.length < 8) return 'Must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Must contain uppercase';
    if (!/[0-9]/.test(value)) return 'Must contain a number';
    return true;
  });
</script>

<input type="password" validate="strongPassword" />
```

---

---

## See Also

- [Data Binding](data-binding.md) — `model` for two-way binding on form inputs
- [Data Fetching](data-fetching.md) — HTTP form submission with `post`, `put`, `patch`
- [Events](events.md) — `on:submit` and event modifiers
- [Actions & Refs](actions-refs.md) — `call` for form-like API requests

**Previous:** [Events ←](events.md) | **Next:** [Actions & Refs →](actions-refs.md)
