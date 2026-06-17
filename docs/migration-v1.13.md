# Migrating to No.JS v1.13.0

## Overview

No.JS v1.13.0 (2026-05-27) moved **Drag and Drop** and **Form Validation** from Core into the [`@no-js-dev/nojs-elements`](https://elements.no-js.dev) plugin package. This is a **breaking change** for any project that uses `drag`, `drop`, `drag-list`, `drag-multiple`, or `validate` directives.

Core now ships lightweight deprecation stubs for these directives. If your HTML uses them without loading Elements, the stubs emit a console warning explaining the migration but do not provide the functionality.

## What was removed from Core

| Directive | File removed | Lines | Replacement |
|-----------|-------------|-------|-------------|
| `drag`, `drop`, `drag-list`, `drag-multiple` | `src/directives/dnd.js` | 1,162 | `@no-js-dev/nojs-elements` |
| `validate` | `src/directives/validation.js` | 552 | `@no-js-dev/nojs-elements` |

The associated unit tests and E2E tests were also migrated to the Elements repository.

## What was added

- `NoJS.internals` — a frozen getter exposing semi-private APIs (`execStatement`, `cloneTemplate`, `disposeChildren`, `disposeTree`, `warn`, `validators`, `removeCoreDirective`, `onDispose`) that Elements uses to register its full directive implementations.
- `_removeCoreDirective(name)` — allows the Elements plugin to replace Core's deprecation stubs with the real implementations at install time.
- `error-boundary` was extracted to its own file (`src/directives/error-boundary.js`) but **stays in Core** — no migration needed.

## Migration steps

### 1. Install NoJS Elements

```bash
npm install @no-js-dev/nojs-elements
```

Or via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@no-js-dev/nojs-elements/dist/iife/nojs-elements.js"></script>
```

### 2. Load Elements after Core

**CDN (IIFE):**

```html
<!-- Core -->
<script src="https://cdn.no-js.dev/"></script>
<!-- Elements plugin — must come after Core -->
<script src="https://cdn.jsdelivr.net/npm/@no-js-dev/nojs-elements/dist/iife/nojs-elements.js"></script>
```

The Elements IIFE auto-registers itself via `NoJS.use()`.

**ESM / npm:**

```js
import NoJS from '@no-js-dev/nojs';
import NoJSElements from '@no-js-dev/nojs-elements';

NoJS.use(NoJSElements);
NoJS.init();
```

### 3. Update your HTML (usually no changes needed)

The directive names (`drag`, `drop`, `drag-list`, `drag-multiple`, `validate`) remain identical. Once Elements is loaded, the stubs are replaced with the full implementations. Your existing HTML templates should work without modification.

### 4. Update custom validators

If you registered custom validators via `NoJS.validator()`, this still works the same way. The validator registry is shared between Core and Elements.

## Before and after

### Before (v1.12.x and earlier)

```html
<script src="https://cdn.no-js.dev/"></script>

<form validate>
  <input model="email" validate="required,email">
  <button type="submit">Submit</button>
</form>

<div drag="item">Drag me</div>
<div drop="handleDrop">Drop here</div>
```

### After (v1.13.0+)

```html
<script src="https://cdn.no-js.dev/"></script>
<script src="https://cdn.jsdelivr.net/npm/@no-js-dev/nojs-elements/dist/iife/nojs-elements.js"></script>

<!-- HTML is identical — no changes needed -->
<form validate>
  <input model="email" validate="required,email">
  <button type="submit">Submit</button>
</form>

<div drag="item">Drag me</div>
<div drop="handleDrop">Drop here</div>
```

The only change is adding the Elements script tag.

## How to detect if you are affected

If after upgrading to v1.13.0+ you see console warnings like:

```
[NoJS] "validate" has moved to @no-js-dev/nojs-elements. Install it to restore functionality.
[NoJS] "drag" has moved to @no-js-dev/nojs-elements. Install it to restore functionality.
```

Then you need to add the Elements plugin as described above.

## Projects that do NOT use DnD or validation

If your project does not use `drag`, `drop`, `drag-list`, `drag-multiple`, or `validate` directives, **no migration is needed**. The Core framework is otherwise backward-compatible with v1.12.x.

## FAQ

**Q: Why were these features moved out of Core?**
A: To keep Core lightweight and focused on the reactive engine. DnD and validation are substantial features (1,700+ lines combined) that not every project needs. Moving them to Elements allows users to opt in only when needed, and enables independent release cycles for these features.

**Q: Does Elements add any other features?**
A: Yes. NoJS Elements also provides UI components like tooltips, popovers, modals, dropdowns, toasts, tabs, trees, steppers, skeletons, split panes, and sortable tables. See [elements.no-js.dev](https://elements.no-js.dev) for the full list.

**Q: Can I use Elements without Core?**
A: No. Elements is a plugin that requires Core (`@no-js-dev/nojs`) to be loaded first.
