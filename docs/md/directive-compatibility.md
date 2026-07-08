# Directive Compatibility

> Reference guide for how No.JS directives interact when combined on the same element. Covers fixed issues, known limitations, defined semantics, and recommended patterns.

No.JS processes directives by priority order (state 0 > HTTP 1 > computed/watch 2 > ref 5 > structural 10 > rendering/events 20 > validation 30). Most directives compose freely, but certain same-element combinations require awareness of processing order and scope mechanics. This page documents every known interaction.

---

## Compatibility Matrix

The matrix below categorizes directive combinations into three groups:

- **Compatible** -- works correctly, no special considerations
- **Defined semantics** -- works, but the behavior follows specific rules you should understand
- **Use workaround** -- known limitation; use the documented alternative pattern

### Structural + Structural (same element)

| Combination | Status | Notes |
|-------------|--------|-------|
| `if` + `each`/`foreach`/`for` | Use workaround | Cannot combine on the same element. See [Limitation: if + loop](#if--loop-on-the-same-element). |
| `else-if` + `each`/`foreach`/`for` | Use workaround | Cannot combine on the same element. See [Limitation: else-if + loop](#else-if--loop-on-the-same-element). |
| `switch` + `each`/`foreach`/`for` | Use workaround | Cannot combine case children with loops. See [Limitation: switch + loop](#switch--loop-on-case-children). |

### Conditional + Other Directives (same element)

| Combination | Status | Notes |
|-------------|--------|-------|
| `if` + `bind`, `model`, `on:*` | Compatible | `if` gates the entire element (not just children). Lower-priority directives on the same element are processed but only take effect when the condition is true. |
| `if` + `get`/`post`/`put`/`patch`/`delete` | Defined semantics | `if` gates HTTP directives. The request only fires when the condition is true. See [Defined: if gates the element](#if-gates-the-element). |
| `if` + `computed`/`watch` | Defined semantics | `if` gates reactive machinery. Computed values and watch side effects only run when the condition is true. See [Defined: if gates the element](#if-gates-the-element). |
| `if` + `page-title`/`page-description`/`page-canonical`/`page-jsonld` | Defined semantics | `if` gates head directives. SEO metadata only applies when the condition is true. See [Defined: if gates the element](#if-gates-the-element). |
| `if` + `use` | Compatible | `use` runs at priority 9 (before structural), and `if` correctly gates template instantiation. |
| `if` + `i18n-ns` | Compatible | Namespace loading is correctly handed off across `if` toggles. |
| `show`/`hide` + any directive | Compatible | CSS-only toggle; never removes elements from the DOM. All directives remain active. |

### Loop + Other Directives (same element)

| Combination | Status | Notes |
|-------------|--------|-------|
| `each` + `bind`, `model`, `on:*`, `class-*`, `style-*` | Compatible | Clones inherit the loop item context. |
| `each` + `computed`/`watch` | Defined semantics | Each clone gets its own computed value / watch instance. See [Defined: per-clone computed/watch](#per-clone-computedwatch-in-loops). |
| `each` + `get`/`post`/`put`/`patch`/`delete` | Use workaround | HTTP verbs on the loop element fire once per clone. See [Limitation: HTTP on loop element](#http-verb-on-loop-element). |
| `each` + `page-title`/`page-*` | Defined semantics | Head directives are stripped from clones. Place on a parent element instead. |
| `each` + `else` (attribute) | Compatible | `else="templateId"` on a loop element shows the template when the collection is empty. |
| `each` + `key` | Compatible | Enables efficient keyed diffing for list updates. |
| `each` + `ref` | Use workaround | Only the last clone's ref survives. See [Limitation: duplicate ref in loop](#duplicate-ref-in-loop). |

### Binding + Binding (same element)

| Combination | Status | Notes |
|-------------|--------|-------|
| `bind` + `bind-*` | Compatible | Text content and attribute bindings are independent. |
| `bind-value` + `model` | Use workaround | Both set up two-way pipelines and fight over the value. See [Limitation: bind-value + model](#bind-value--model-on-the-same-input). |
| `t` + `bind` | Use workaround | Both write to `textContent`; last writer wins. See [Limitation: t + bind](#t--bind-double-writer). |

### Watch + Events (same element)

| Combination | Status | Notes |
|-------------|--------|-------|
| `watch` + `on:change` | Use workaround | Both claim the change event. See [Limitation: watch + on:change](#watch--onchange-on-the-same-element). |
| `watch` + `on:click`, `on:input`, etc. | Compatible | Non-conflicting event types compose freely. |

---

## Defined Semantics

These are not bugs -- they are intentional behaviors established in v1.18.0. Understanding them helps you write correct templates.

### `if` gates the element

As of v1.18.0, `if` gates the **entire element**, not just its children. This means:

- **HTTP directives** (`get`, `post`, etc.) on the same element only fire when the condition is true. Zero network requests while false; exactly one request when the condition flips to true.
- **Computed values** and **watch side effects** on the same element only run when the condition is true. No phantom computations from disabled branches.
- **Head directives** (`page-title`, `page-description`, `page-canonical`, `page-jsonld`) on the same element only apply when the condition is true. Disabled branches cannot write SEO metadata.
- **Binding, model, and event directives** on the same element are gated in the same way.

```html
<!-- HTTP request only fires when loggedIn is true -->
<div if="loggedIn" get="/api/private" as="data">
  <p bind="data.name"></p>
</div>

<!-- Computed only runs when showStats is true -->
<div if="showStats" computed="total" expr="price * qty">
  Total: <span bind="total | currency"></span>
</div>

<!-- Page title only set when this route is active -->
<template route="/admin" if="isAdmin"
          page-title="'Admin Dashboard'"
          page-description="'Administrative controls'">
  <h1>Admin</h1>
</template>
```

**Migration note:** Before v1.18.0, `if` only cleared children. Higher-priority directives (HTTP at priority 1, computed/watch at priority 2) would execute regardless of the condition. If you relied on a falsy `if` branch to still compute values or fire requests, move those directives to a separate element without an `if` condition.

### Per-clone `computed`/`watch` in loops

When `computed` or `watch` appears on a loop element, each clone gets its own independent instance:

- A `computed` on a loop element creates a per-item derived value, scoped to that clone's context.
- A `watch` on a loop element fires independently per clone when the watched property changes.

```html
<!-- Each item gets its own 'total' computed value -->
<div each="item in cart" key="item.id"
     computed="total" expr="item.price * item.qty">
  <span bind="item.name"></span>: <span bind="total | currency"></span>
</div>
```

### `each` + `if` + `else` = conditional else

When a loop element has both `each` and `if`, the `else` template shows when the `if` condition is false, not when the array is empty. To handle empty arrays, use `else` on the loop element without an `if`:

```html
<!-- else fires when items array is empty -->
<li each="item in items" key="item.id" else="emptyTpl" bind="item.name"></li>
<template id="emptyTpl"><li>No items found.</li></template>
```

### HTTP verb placement

HTTP directives (`get`, `post`, `put`, `patch`, `delete`) should be placed on a **parent element**, not on the loop element itself. The loop element is used as a clone template -- placing an HTTP directive on it would fire one request per clone.

```html
<!-- Correct: HTTP on parent, loop on child -->
<ul get="/api/tasks" as="tasks">
  <li each="task in tasks" key="task.id" bind="task.title"></li>
</ul>

<!-- Wrong: would fire one request per clone -->
<li each="task in tasks" get="/api/tasks" as="tasks" bind="task.title"></li>
```

### `use` priority

The `use` directive runs at priority 9 (just below structural directives at priority 10). This means `use` template instantiation happens before `if`/`each` processing, ensuring templates are correctly gated by conditions and iterated by loops.

---

## Known Limitations

These are documented same-element combinations that do not work as expected. Each has a recommended workaround.

### `switch` + loop on case children

**Issue:** Placing a loop directive (`each`/`foreach`/`for`) on a `case` child of a `switch` renders both branches; the switch logic goes inert.

**Workaround:** Wrap the loop in a container element inside the case:

```html
<!-- Wrong -->
<div switch="view">
  <li case="'list'" each="item in items" bind="item.name"></li>
  <p case="'empty'">No items</p>
</div>

<!-- Correct -->
<div switch="view">
  <div case="'list'">
    <li each="item in items" key="item.id" bind="item.name"></li>
  </div>
  <p case="'empty'">No items</p>
</div>
```

### `if` + loop on the same element

**Issue:** `if` and a loop directive (`each`/`foreach`/`for`) on the same element cannot coordinate -- the condition cannot remove items, and empty shells may render.

**Workaround:** Wrap the loop in a container element with the `if`:

```html
<!-- Wrong -->
<li if="showList" each="item in items" bind="item.name"></li>

<!-- Correct -->
<div if="showList">
  <li each="item in items" key="item.id" bind="item.name"></li>
</div>
```

### `else-if` + loop on the same element

**Issue:** `else-if` combined with a loop on the same element breaks the conditional chain. Items render regardless of the preceding `if` condition. Additionally, a sibling `else` element is orphaned and never participates in the chain.

**Workaround:** Wrap the loop in a container element with the `else-if`:

```html
<!-- Wrong -->
<p if="mode === 'a'">Mode A</p>
<li else-if="items.length > 0" each="n in items" bind="n"></li>
<p else>Fallback</p>

<!-- Correct -->
<p if="mode === 'a'">Mode A</p>
<div else-if="items.length > 0">
  <li each="n in items" key="$index" bind="n"></li>
</div>
<p else>Fallback</p>
```

### Duplicate `ref` in loop

**Issue:** Using `ref` on a loop element means each clone overwrites the same ref name. Only the last clone's element is accessible via `$refs`.

**Workaround:** Use the loop index to create unique ref names, or access clones via DOM queries:

```html
<!-- Each clone gets a unique ref -->
<div each="item in items" key="item.id"
     bind-ref="'item-' + $index">
  <span bind="item.name"></span>
</div>
```

### `bind-value` + `model` on the same input

**Issue:** Both `bind-value` and `model` set up two-way binding pipelines with input listeners. The two handlers can fight over the value during typing, especially for number inputs where they apply different coercion rules.

**Workaround:** Use only one. `model` is the standard two-way binding directive for inputs:

```html
<!-- Wrong: duplicate two-way bindings -->
<input bind-value="name" model="name">

<!-- Correct: use model for two-way binding -->
<input model="name">

<!-- Or: use bind-value for one-way display -->
<input bind-value="name" readonly>
```

### `watch` + `on:change` on the same element

**Issue:** Both `watch` and `on:change` claim the change event, leading to duplicate handler execution.

**Workaround:** Use only one mechanism. Prefer `watch` for reactive side effects or `on:change` for DOM event handling:

```html
<!-- Wrong: both claim the change event -->
<input model="color" watch="color" on:change="saveColor(color)">

<!-- Correct: use watch for reactive side effects -->
<input model="color" watch="color">
<!-- (handle the side effect in the watch statement) -->

<!-- Or: use on:change for event-driven logic -->
<input model="color" on:change="saveColor(color)">
```

### `t` + `bind` double writer

**Issue:** Both `t` (i18n translation) and `bind` write to the element's `textContent`. The attribute processed last wins, and the result depends on attribute order.

**Workaround:** Use only one text-content directive per element:

```html
<!-- Wrong: both write textContent -->
<span t="greeting" bind="user.name"></span>

<!-- Correct: use t with interpolation parameters -->
<span t="greeting" t-name="user.name"></span>
<!-- locale: { "greeting": "Hello, {name}!" } -->

<!-- Or: use bind with a computed expression -->
<span bind="'Hello, ' + user.name + '!'"></span>
```

### HTTP verb on loop element

**Issue:** Placing an HTTP directive (`get`, `post`, etc.) directly on the loop element causes one network request per clone, since clones retain the HTTP attribute.

**Workaround:** Place the HTTP directive on a parent element:

```html
<!-- Wrong: fires N requests for N items -->
<li each="item in items" get="/api/items" as="items" bind="item.name"></li>

<!-- Correct: single request on parent -->
<ul get="/api/items" as="items">
  <li each="item in items" key="item.id" bind="item.name"></li>
</ul>
```

---

## Deferred Items

The following items are tracked for future improvement and do not have workarounds yet:

- **`i18n-ns` + loop on the same element** (finding 12) -- namespace async loading can conflict with loop clone timing. Place `i18n-ns` on a parent element for now.
- **Blanket object-notify in `_execStatement`** (finding 14) -- internal performance optimization that may cause redundant update cycles. No user-facing workaround needed; this is an internal concern.

---

## Migration Notes (v1.18.0)

### `if` now gates the entire element

**Before v1.18.0:** `if` only controlled children visibility. Directives with higher priority than `if` (such as HTTP at priority 1, computed/watch at priority 2, and head directives at priority 1) would still execute on the element even when the condition was false.

**After v1.18.0:** `if` gates the entire element. All directives on the same element respect the `if` condition.

**What to check:** If you had patterns like:

```html
<!-- Pre-v1.18.0: the GET would fire even with loggedIn=false -->
<div if="loggedIn" get="/api/data" as="data">...</div>
```

This pattern now works correctly -- the request is blocked when `loggedIn` is false. If you intentionally relied on the old behavior (request fires regardless of condition), move the HTTP directive to a separate unconditional element.

### `use` priority changed to 9

**Before v1.18.0:** `use` ran at the default priority, which could cause ordering issues with structural directives.

**After v1.18.0:** `use` has an explicit priority of 9, placing it just below structural directives (10). This ensures templates are instantiated before `if`/`each` processing.

**What to check:** This change is backward-compatible for standard usage. If you had custom directives at priority 9, verify they compose correctly with `use`.

---

## Combinations That Work

The following combinations have been verified to work correctly with no special considerations:

- `state` + `store` on the same element
- `store` + `bind`/`model`/`on:*` on the same element
- `model` + `on:input` / `on:change` on the same element (only `watch` + `on:change` conflicts)
- `if` + `show` on the same element (both work; `if` takes precedence for DOM removal)
- `bind-html` + `class-*` / `style-*` on the same element
- `animate` + `if` on the same element (enter/leave animations work with conditional rendering)
- `error-boundary` + `get` on the same element
- `switch` + `state` on the same element
- `model` + `validate` on the same element (requires NoJS Elements plugin)
- Nested `state` scopes with child `bind`/`model` (contexts inherit correctly via parent chain)

---

**Previous:** [Configuration <-](configuration.md) | **Next:** [Directive Cheatsheet ->](cheatsheet.md)
