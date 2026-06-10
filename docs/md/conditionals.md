# Conditionals

## `if` / `then` / `else`

Renders one of two templates based on a condition.

```html
<!-- With templates -->
<div if="user.isAdmin" then="adminPanel" else="userPanel"></div>

<!-- Inline content — keeps children if true, removes if false -->
<div if="user.isLoggedIn">
  <p>Welcome back!</p>
</div>

<!-- Negation -->
<div if="!user.isLoggedIn" then="loginPrompt"></div>

<!-- Complex expressions -->
<div if="user.role === 'admin' && user.verified" then="adminTpl"></div>
<div if="cart.items.length > 0" then="cartTpl" else="emptyCartTpl"></div>
```

---

## `else-if` — Chained Conditionals

```html
<div if="status === 'loading'" then="loadingTpl"></div>
<div else-if="status === 'error'" then="errorTpl"></div>
<div else-if="status === 'empty'" then="emptyTpl"></div>
<div else then="contentTpl"></div>
```

---

## `show` / `hide`

Toggles `display: none` without adding/removing DOM elements. Better for frequently toggled elements.

```html
<div show="user.isLoggedIn">Welcome!</div>
<div hide="user.isLoggedIn">Please log in.</div>

<button show="!editing" on:click="editing = true">Edit</button>
<button show="editing" on:click="editing = false">Save</button>
```

### `if` vs `show`

| | `if` | `show` |
|--|------|--------|
| Mechanism | Adds/removes DOM elements | Toggles CSS `display` |
| Best for | Rarely toggled content | Frequently toggled content |
| Preserves state | No (re-creates) | Yes |

---

## Switch / Case

Render one of many templates based on a value.

```html
<div get="/me" as="user">
  <div switch="user.role">
    <div case="'admin'"    then="adminDashboard"></div>
    <div case="'editor'"   then="editorDashboard"></div>
    <div case="'viewer'"   then="viewerDashboard"></div>
    <div default           then="guestDashboard"></div>
  </div>
</div>
```

### Inline Content (no templates)

```html
<div switch="order.status">
  <span case="'pending'"    class="badge warn">⏳ Pending</span>
  <span case="'shipped'"    class="badge info">📦 Shipped</span>
  <span case="'delivered'"  class="badge ok">✅ Delivered</span>
  <span case="'cancelled'"  class="badge err">❌ Cancelled</span>
  <span default             class="badge">Unknown</span>
</div>
```

### Multi-Value Case

```html
<div switch="user.role">
  <div case="'admin','superadmin'" then="adminPanel"></div>
  <div case="'editor','writer'"    then="editorPanel"></div>
  <div default                     then="viewerPanel"></div>
</div>
```

---

## `else` on Loop Elements

Loop directives (`foreach`, `each`, `for`) support `else="templateId"` to reference a `<template>` for empty-state fallback:

```html
<article foreach="item in items" else="noItems">
  <h2 bind="item.title"></h2>
</article>

<template id="noItems">
  <p>No items found.</p>
</template>
```

> **Breaking change (v1.15):** The sibling `else` pattern for loops has been removed. Use `else="templateId"` on the loop element itself. See [Loops](loops.md) for details.

---

## See Also

- [Loops](loops.md) — `foreach` with `filter` for conditional rendering, and `else` for empty lists
- [Dynamic Styling](styling.md) — `show`/`hide` alternative via `class-*`
- [Templates](templates.md) — template-based conditional content with `then`/`else`

**Previous:** [State Management ←](state-management.md) | **Next:** [Loops →](loops.md)
