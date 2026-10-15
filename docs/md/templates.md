# Templates

Templates are reusable HTML fragments that are never rendered directly. They are cloned when referenced by directives like `then`, `else`, `template`, `loading`, `error`, etc.

## Basic Template

```html
<template id="userCard">
  <div class="card">
    <h3 bind="user.name"></h3>
    <p bind="user.email"></p>
  </div>
</template>
```

---

## Template Variables (`var`)

Templates can declare which variable they expect from the calling context:

```html
<form post="/login" success="#loginOk" error="#loginFail">
  ...
</form>

<template id="loginOk" var="result">
  <p>Welcome, <span bind="result.user.name"></span>!</p>
</template>

<template id="loginFail" var="error">
  <p>Error <span bind="error.code"></span>: <span bind="error.message"></span></p>
</template>
```

---

## Template Slots

Allow templates to accept projected content:

```html
<template id="card">
  <div class="card">
    <div class="card-header"><slot name="header"></slot></div>
    <div class="card-body"><slot></slot></div>
    <div class="card-footer"><slot name="footer"></slot></div>
  </div>
</template>

<!-- Usage -->
<div use="card">
  <span slot="header">My Title</span>
  <p>Main content goes here</p>
  <span slot="footer">Footer info</span>
</div>
```

---

## Remote Templates (`src`)

Load templates from external HTML files:

```html
<template id="header" src="/templates/header.html"></template>
<template id="footer" src="/templates/footer.html"></template>
```

### Recursive Loading

Remote templates are loaded **recursively** — if a remote template itself contains `<template src="...">` elements, those are automatically resolved too:

```html
<!-- main page -->
<template id="layout" src="/templates/layout.html"></template>

<!-- /templates/layout.html can itself contain: -->
<nav>
  <template src="/templates/nav.html"></template>
</nav>
```

### Lazy Loading (`lazy`)

By default, No.JS loads all remote templates **before the first render** in two background phases. You can control this per-template with the `lazy` attribute:

| Value | Phase | Behaviour |
|-------|-------|-----------|
| *(absent)* | Auto | Content-include templates and the active route template load before first render; other route templates preload silently in the background |
| `lazy="priority"` | 0 (first) | Loaded before everything else — even before regular content includes. Use for critical shared layouts. |
| `lazy="ondemand"` | On demand | **Route templates only.** Never preloaded — fetched the first time the user navigates to that route. Ideal for heavy or rarely-visited pages. |

```html
<!-- Default: loads before first render (Phase 1) -->
<template src="./components/header.tpl"></template>

<!-- Priority: loaded before everything else -->
<template src="./components/critical-layout.tpl" lazy="priority"></template>

<!-- Default route: auto Phase 1 because it matches the current URL -->
<template route="/" src="./pages/home.tpl"></template>

<!-- Other routes: silently preloaded after first render (Phase 2) -->
<template route="/about" src="./pages/about.tpl"></template>

<!-- On demand: only fetched when the user first visits /heavy -->
<template route="/heavy" src="./pages/heavy.tpl" lazy="ondemand"></template>
```

### Remote Templates in Routes

Remote templates inside route content are also automatically resolved before the route renders. See [Routing → Remote Templates in Routes](routing.md).

> **Tip:** For projects with many route pages, consider [File-Based Routing](routing.md) — point your `route-view` at a folder and let No.JS resolve templates automatically, no explicit `<template route>` declarations needed.

### Loading Placeholder (`loading`)

Show a placeholder template while a remote file is being fetched. The placeholder is injected **synchronously** before any network request and removed automatically when the real content arrives. Works for both static content-includes and nested templates inside route pages.

```html
<template src="./dashboard.tpl" loading="#spinner"></template>

<template id="spinner">
  <div class="skeleton">Loading...</div>
</template>
```

Both plain IDs and `#id` syntax are accepted. The same template can be reused as a placeholder for multiple remote templates — it is cloned independently each time:

```html
<template src="./section-a.tpl" loading="#page-skeleton"></template>
<template src="./section-b.tpl" loading="#page-skeleton"></template>
<template src="./section-c.tpl" loading="#page-skeleton"></template>

<template id="page-skeleton">
  <div class="skeleton"></div>
</template>
```

## Inline Template Include (`include`)

Clone an inline template into the current position synchronously, before any fetches. Useful for reusable markup (icon sets, common fragments) that needs no network request:

```html
<template include="#icon-set"></template>

<template id="icon-set">
  <svg hidden>...</svg>
</template>
```

Both plain IDs and `#id` syntax are accepted. Each `include` creates a fresh independent clone, so the same source template can be included multiple times without sharing state.

> `include` and `loading` serve different purposes: `include` inserts inline content **permanently**; `loading` inserts a **temporary** placeholder that disappears once a remote template finishes loading.

---

---

## Templates with Loops

Loop directives use the `template` attribute to reference external templates. The loop element is the repeating unit — clones of the referenced template are inserted as siblings:

```html
<ul get="/api/users" as="users">
  <li each="user in users" template="userCard" else="noUsersTpl"></li>
</ul>

<template id="userCard">
  <div class="card">
    <h3 bind="user.name"></h3>
    <p bind="user.email"></p>
  </div>
</template>

<template id="noUsersTpl">
  <li>No users found</li>
</template>
```

The `else="templateId"` attribute on the loop element references a `<template>` rendered when the array is empty (`[]`) or null/undefined/non-array — e.g. before the fetch resolves.

---

## See Also

- [Loops](loops.md) — self-repeating elements and `else="templateId"` for empty lists
- [Routing](routing.md) — route templates and file-based routing
- [Data Fetching](data-fetching.md) — `loading`, `error`, `success` templates

**Previous:** [Loops ←](loops.md) | **Next:** [Events →](events.md)
