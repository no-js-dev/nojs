# Loops

## `foreach` — Iterate Over Arrays

`foreach` is the primary iteration directive. The element that carries the directive IS the repeating template — it is removed from the DOM, and clones are inserted as siblings between comment markers for each item in the array.

### Self-Repeating Element

The element with `foreach` (or `each` / `for`) is the template itself. No wrapper element is needed — the loop element repeats as a sibling:

```html
<div get="/posts" as="posts">
  <ul>
    <li foreach="post in posts" key="post.id">
      <h2 bind="post.title"></h2>
      <p bind="post.body"></p>
      <span bind="'#' + $index"></span>
    </li>
  </ul>
</div>
```

Each `<li>` clone is inserted directly inside the `<ul>`. The original `<li foreach="...">` element is removed and used as the template source.

### External Template

Use the `template` attribute to reference a `<template>` element by ID. The loop element is still the repeating unit — clones of the referenced template are inserted as siblings:

```html
<div get="/posts" as="posts">
  <ul>
    <li foreach="post in posts" key="post.id" template="postCard"></li>
  </ul>
</div>

<template id="postCard">
  <article>
    <h2 bind="post.title"></h2>
    <p bind="post.body"></p>
    <span bind="'#' + $index"></span>
  </article>
</template>
```

### Filtering, Sorting & Pagination

```html
<ul>
  <li foreach="item in menuItems"
      index="idx"
      key="item.id"
      filter="item.active"
      sort="item.order"
      limit="10"
      offset="0"
      else="noItemsTpl">
    <a bind-href="item.link">
      <span bind="idx + 1"></span> - <span bind="item.label"></span>
    </a>
  </li>
</ul>

<template id="noItemsTpl">
  <li>No items available</li>
</template>
```

### Empty-State Fallback with `else`

Place `else="templateId"` on the loop element to reference a `<template>` for the empty state. The template renders when the list is empty (`[]`) **or** null/undefined/non-array — e.g. API state before the first fetch resolves:

```html
<article foreach="item in items" else="noItems">
  <h2 bind="item.title"></h2>
</article>

<template id="noItems">
  <p class="empty-state">No items found.</p>
</template>
```

When `items` is an empty array (`[]`), null, undefined, or any non-array value, the template content replaces the loop output. When items are present, the template is removed and items render normally. Both bare ID (`else="noItems"`) and hash syntax (`else="#noItems"`) are accepted.

> **Breaking change (v1.15):** The sibling `else` pattern (`<li else>No items</li>` placed after a loop element) has been removed. Use `else="templateId"` on the loop element itself instead.

### Attributes

| Attribute | Description |
|-----------|-------------|
| `foreach` | `"item in array"` — variable name and source expression |
| `else` | Template ID rendered when the array is empty or null/undefined/non-array (e.g. `else="noItemsTpl"`) |
| `template` | ID of the `<template>` element to clone for each item (optional — when omitted, the element's own children are the template) |
| `index` | Variable name for the index (default: `$index`) |
| `key` | Unique key expression for DOM diffing |
| `filter` | Expression to filter items (like `Array.filter`) |
| `sort` | Property path to sort by (prefix with `-` for descending) |
| `limit` | Maximum number of items to render |
| `offset` | Number of items to skip |
| `animate` / `animate-enter` | CSS class added to each new item on insert |
| `animate-leave` | CSS class added to items before removal |
| `animate-stagger` | Delay (ms) between each item's enter animation |
| `animate-duration` | Max duration (ms) before leave animation is force-completed |

Empty-state rendering uses the `else` attribute on the loop element to reference a `<template>` by ID.

---

## Aliases: `each` and `for`

`each` and `for` are aliases for `foreach`. They share the same handler and support all the same attributes — `filter`, `sort`, `limit`, `offset`, `key`, `animate-*`, `else`, `template`, `index`, and loop variables.

```html
<!-- All three are equivalent — the element repeats as siblings -->
<li foreach="item in items" key="item.id">...</li>
<li each="item in items" key="item.id">...</li>
<li for="item in items" key="item.id">...</li>
```

Use whichever reads best for your context. `foreach` is the canonical name used throughout this documentation.

---

## Deprecated: `from` Attribute

The legacy `from` syntax is still supported but **deprecated**. Using it emits a console warning.

```html
<!-- DEPRECATED — still works, but warns -->
<div foreach="item" from="items" template="tpl"></div>

<!-- Use this instead -->
<div foreach="item in items" template="tpl"></div>
```

The `from` attribute will be removed in a future major version. Migrate to the `"item in array"` syntax.

---

## Key-Based Reconciliation

By default, when the source array changes, the loop directive performs a **full rebuild** — all child nodes are disposed and recreated from scratch. This is simple and correct, but destroys and re-mounts DOM nodes on every update.

When you supply a `key` attribute, the directive switches to **key-based reconciliation**: existing DOM nodes for items whose key is still in the list are reused and their context is updated in place. Only items that genuinely appeared or disappeared trigger DOM mutations.

```html
<!-- Without key: full rebuild on every change -->
<li foreach="item in items" template="itemTpl"></li>

<!-- With key: only changed items are added/removed -->
<li foreach="item in items" key="item.id" template="itemTpl"></li>
```

The `key` value must be **unique and stable** across renders — typically a database ID or UUID. Using a non-unique key (e.g. `$index`) defeats reconciliation since items will always appear to match.

### When to use `key`

| Use case | Recommendation |
|---|---|
| Static lists, rendered once | No key needed |
| Lists with < ~10 items, infrequent updates | No key needed (full rebuild is negligible) |
| Large lists (50+ items) with frequent updates | Use `key` |
| `push` / `splice` / `sort` on reactive arrays | Use `key` to preserve focus, scroll, and input state |
| Items with embedded inputs, video, canvas | Use `key` — full rebuild resets state |

### Positional metadata after reorder

After a reorder (e.g. sort), the reconciler calls `$notify()` on the context of each retained clone. This propagates the updated `$index`, `$first`, `$last`, `$even`, `$odd`, and `$count` values to all child watchers, including nested bindings and class expressions that depend on position.

```html
<template id="itemTpl">
  <!-- $index, $odd, $first re-render correctly after sort or reorder -->
  <div class-striped="$odd" class-first="$first">
    <span bind="($index + 1) + '. ' + item.name"></span>
  </div>
</template>
```

---

## Loop Context Variables

Inside any loop, these variables are automatically available:

| Variable | Description |
|----------|-------------|
| `$index` | Current index (0-based) |
| `$count` | Total number of items |
| `$first` | `true` if first item |
| `$last` | `true` if last item |
| `$even` | `true` if index is even |
| `$odd` | `true` if index is odd |

```html
<ul>
  <li foreach="item in items">
    <span class-first="$first"
         class-last="$last"
         class-striped="$odd">
      <span bind="($index + 1) + ' of ' + $count"></span>
      <span bind="item.name"></span>
    </span>
  </li>
</ul>
```

---

## Nested Loops

Child loops can access parent scope variables. Each loop element repeats as siblings inside its container:

```html
<div foreach="category in categories">
  <h3 bind="category.name"></h3>
  <p foreach="product in category.products">
    <!-- Access both product AND category from parent scope -->
    <span bind="category.name"></span>: <span bind="product.name"></span>
  </p>
</div>
```

With external templates:

```html
<section foreach="category in categories" template="catTpl"></section>

<template id="catTpl">
  <h3 bind="category.name"></h3>
  <div foreach="product in category.products" template="prodTpl"></div>
</template>

<template id="prodTpl">
  <p><span bind="category.name"></span>: <span bind="product.name"></span></p>
</template>
```

---

---

## Reactivity

Loop directives are fully reactive. When the source array changes (push, splice, sort, or full reassignment), the loop re-renders automatically. No `$notify()` call is needed when mutations happen inside HTML expressions:

```html
<div state="{ items: ['A', 'B', 'C'] }">
  <ul>
    <li foreach="item in items" bind="item"></li>
  </ul>
  <button on:click="items.push('New')">Add Item</button>
  <!-- Loop updates automatically -->
</div>
```

> **Note:** `foreach`/`each`/`for` iterate over arrays only. Object iteration is not directly supported — use the `keys` or `values` filter to convert objects to arrays first:
> ```html
> <span foreach="key in settings | keys">
>   <span bind="key"></span>: <span bind="settings[key]"></span>
> </span>
> ```

---

## See Also

- [Conditionals](conditionals.md) — `else="templateId"` on the loop element renders a template for empty lists
- [Templates](templates.md) — external templates referenced by loops
- [Animations](animations.md) — `animate-stagger` for list enter/leave effects
- [Filters & Pipes](filters.md) — `count`, `first`, `last`, `reverse`, `sortBy` filters
- [Drag & Drop](drag-and-drop.md) — `drag-list` for sortable lists

**Previous:** [Conditionals ←](conditionals.md) | **Next:** [Templates →](templates.md)
