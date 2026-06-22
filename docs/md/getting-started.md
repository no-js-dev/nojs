# Getting Started

## Installation

### CDN (recommended)

```html
<script src="https://cdn.no-js.dev/"></script>
```

> When using the CDN `<script>` tag, initialization is handled automatically on `DOMContentLoaded`.

### Self-hosted

Download `dist/iife/no.js` and include it with a `<script>` tag.

---

## Minimal Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.no-js.dev/"></script>
</head>
<body base="https://jsonplaceholder.typicode.com">

  <div get="/users/1" as="user">
    <h1 bind="user.name">Loading...</h1>
    <p bind="user.email"></p>
  </div>

</body>
</html>
```

That's it. No `app.mount()`. No `createApp()`. No `NgModule`. It just works.

---

## How It Works

1. **Parse** — On `DOMContentLoaded`, No.JS walks the DOM looking for elements with known attributes.
2. **Resolve** — Each attribute maps to a **directive** that is executed by priority (data fetching first, then conditionals, then rendering).
3. **React** — All data lives in **reactive contexts** (Proxy-backed). When data changes, every bound element updates automatically.
4. **Scope** — Contexts inherit from parent elements, like lexical scoping. A `bind` inside an `each` loop can access both the loop item and ancestor data.

---

## Core Concepts

### Reactive Context

Every element can have a **context** — a reactive data object. Contexts are created by `state`, `get`, `store`, etc. Child elements inherit their parent's context automatically.

```
body          → context: { baseUrl }
  div[get]    → context: { user: { name, email } }  ← inherits from body
    span[bind="user.name"]                           ← reads from div's context
    div[each] → context: { post: { title } }         ← inherits from div (can access user + post)
```

### Directive Priority

Directives run in a defined order:

| Priority | Directives | Description |
|----------|-----------|-------------|
| 0 | `state`, `store` | Initialize local/global state |
| 1 | `get`, `post`, `put`, `patch`, `delete`, `error-boundary`, `i18n-ns`, `page-title`, `page-description`, `page-canonical`, `page-jsonld` | Fetch data, error boundaries, i18n namespace, head management |
| 2 | `computed`, `watch` | Derived values and side-effect watchers |
| 5 | `ref` | Element references |
| 10 | `if`, `switch`, `foreach`, `each`, `for`, `use`, `drag-list` | Structural (add/remove DOM) |
| 15 | `drag`, `drop` | Drag and drop setup |
| 16 | `drag-multiple` | Multi-select drag |
| 20 | `bind`, `bind-*`, `model`, `class-*`, `style-*`, `on:*`, `show`, `hide`, `t`, `call`, `trigger` | Rendering, events, i18n, actions |
| 30 | `validate` | Form validation side effects |

### Expression Syntax

Most directive values accept **JavaScript expressions** evaluated against the current context:

```html
<!-- Simple path -->
<span bind="user.name"></span>

<!-- Ternary -->
<span bind="user.age >= 18 ? 'Adult' : 'Minor'"></span>

<!-- Arithmetic -->
<span bind="cart.total * 1.1"></span>

<!-- Filters (pipes) -->
<span bind="user.name | uppercase"></span>

<!-- Template literals (bind-html) -->
<div bind-html="`<strong>${user.name}</strong>`"></div>
```

---

## See Also

- [Data Fetching](data-fetching.md) — make your first API call
- [Directive Cheatsheet](cheatsheet.md) — every directive at a glance
- [Configuration](configuration.md) — global settings and security

**Next:** [Data Fetching →](data-fetching.md)
