# Pagination & Triggers

Paginated APIs return data in chunks — pages, cursors, or infinite streams. No.JS handles this declaratively: add `get-trigger` and `get-insert` to any `get` directive and the framework manages page tracking, DOM insertion, scroll observation, and end-of-data detection automatically.

---

## Basic Usage

Add `get-trigger`, `get-insert`, and `get-page` to a `get` element to enable offset-based infinite scroll with minimal markup:

```html
<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-page="1">
  <div foreach="item in items">
    <p bind="item.name"></p>
  </div>
</div>
```

The `get` directive fetches page 1 on load. When the user scrolls near the bottom, it automatically fetches the next page and appends the new items.

---

## Attributes Reference

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `get-insert` | `"append"`, `"prepend"` | _(absent = replace)_ | Controls where new content is placed relative to existing content. Without this attribute, fetched content replaces the current content entirely. **Required** for `scroll` and `button` triggers |
| `get-trigger` | `"scroll"`, `"button"`, `"visible"`, `"hover"`, `"none"` | _(absent = immediate)_ | Controls when the fetch fires. Without this attribute, the fetch fires immediately on mount |
| `get-page` | number | `1` | Initial page number for offset-based pagination. The `page` context variable increments automatically after each successful fetch |
| `get-cursor` | _(boolean)_ | -- | Enable cursor-based pagination. The cursor is extracted from the response header (`X-NoJS-Cursor`) or JSON body field |
| `get-cursor-field` | string (dot notation) | -- | Custom JSON field path for cursor extraction (e.g. `"pagination.nextToken"`). Without this, No.JS probes `cursor`, `next_cursor`, `nextCursor`, `next` |
| `get-threshold` | CSS margin | `"200px"` (scroll) / `"0px"` (visible) | `rootMargin` for the IntersectionObserver. Controls how early the fetch triggers before the element enters the viewport |
| `get-trigger-label` | string | `"Load More"` | Custom label text for the auto-generated load-more button when using `get-trigger="button"` |

> **Note:** `get-cursor` and `get-page` are mutually exclusive. If both are set, cursor-based pagination takes precedence and a console warning is emitted.

---

## Offset-Based Pagination

Use `get-page` with a `{page}` placeholder in the URL. The `page` context variable starts at the value you set (typically `1`) and auto-increments after each successful fetch.

```html
<div get="/api/posts?page={page}&limit=10"
     as="posts"
     get-trigger="scroll"
     get-insert="append"
     get-page="1"
     get-threshold="300px">
  <div each="post in posts" key="post.id">
    <h3 bind="post.title"></h3>
  </div>
</div>
```

When the server returns an empty array, pagination stops automatically.

---

## Cursor-Based Pagination

Use `get-cursor` with a `{cursor}` placeholder in the URL. The cursor starts as an empty string on the first request. After each response, No.JS extracts the next cursor value and uses it for the subsequent request.

```html
<div get="/api/feed?cursor={cursor}&limit=20"
     as="result"
     get-trigger="scroll"
     get-insert="append"
     get-cursor
     get-cursor-field="nextCursor">
  <div foreach="item in result.data" key="item.id">
    <p bind="item.content"></p>
  </div>
</div>
```

### Cursor Extraction Order

No.JS extracts the cursor value using this priority:

1. **Response header** -- `X-NoJS-Cursor` header on the HTTP response
2. **Custom field** -- The field specified by `get-cursor-field` (supports dot notation, e.g. `"pagination.nextToken"`)
3. **Default probing** -- When `get-cursor-field` is omitted, No.JS checks `cursor`, `next_cursor`, `nextCursor`, and `next` on the response root

When the response is an object (not an array), No.JS automatically extracts the first array-valued field as the renderable data. For example, given `{ "data": [...], "cursor": "abc123" }`, the `data` array is rendered and `"abc123"` becomes the next cursor.

---

## Trigger Modes

### Infinite Scroll (`get-trigger="scroll"`)

Automatically loads the next page when the user scrolls near the bottom of the container. Uses an `IntersectionObserver` on an internal sentinel element.

```html
<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-page="1"
     get-threshold="100px">
  <!-- items are appended here -->
</div>
```

The `get-threshold` attribute controls how early the fetch triggers. A value of `"200px"` (the default for scroll) means the fetch starts when the user is within 200px of the sentinel.

### Load More Button (`get-trigger="button"`)

Displays an auto-generated button that the user clicks to load the next page.

```html
<div get="/api/items?page={page}"
     as="items"
     get-trigger="button"
     get-insert="append"
     get-page="1"
     get-trigger-label="Show More Items">
  <!-- items + auto button -->
</div>
```

The button is inserted after the content (for append mode) or before it (for prepend mode). It is automatically removed when the end of data is reached or while a fetch is in progress.

### Lazy Load (`get-trigger="visible"`)

Content is fetched only when the element scrolls into the viewport. This is a one-shot trigger -- it does not paginate. Ideal for below-the-fold sections.

```html
<div get="/api/lazy-content"
     as="content"
     get-trigger="visible">
  <!-- loaded when scrolled into view -->
</div>
```

### Hover Prefetch (`get-trigger="hover"`)

Content is fetched on the first `mouseenter` event. Useful for tooltips, preview cards, and prefetching.

```html
<div get="/api/preview"
     as="preview"
     get-trigger="hover">
  <p>Hover to load</p>
</div>
```

### Programmatic Fetch (`get-trigger="none"`)

The fetch does not fire automatically. Use `$refs` to trigger it manually via a button or other event.

```html
<div get="/api/content"
     as="content"
     get-trigger="none"
     ref="manualFetch">
  <!-- empty until triggered -->
</div>
<button on:click="$refs.manualFetch.refresh()">
  Fetch Now
</button>
```

---

## Insert Modes

The `get-insert` attribute controls where new content is placed:

- **`append`** -- New items are added after existing content (standard infinite scroll)
- **`prepend`** -- New items are added before existing content (live feeds, newest-first)
- **(absent)** -- Content is replaced entirely (default `get` behavior)

### Live Feed (Prepend)

New content is inserted at the top of the list, simulating a live feed:

```html
<div get="/api/feed?page={page}"
     as="feed"
     get-trigger="button"
     get-insert="prepend"
     get-page="1"
     get-trigger-label="Load Newer">
  <!-- new items prepended here -->
</div>
```

When using `get-insert="prepend"`, No.JS automatically preserves the user's scroll position. New content is inserted above the current viewport and the scroll offset is adjusted so the view does not jump.

---

## Composition Matrix

The `get-trigger` and `get-insert` attributes combine to form a matrix of behaviors:

| Trigger | No insert (replace) | `append` | `prepend` |
|---------|-------------------|----------|-----------|
| _(immediate)_ | Default -- fetch replaces content on mount | Fetch on mount, append below existing | Fetch on mount, prepend above existing |
| `scroll` | Falls back to `visible` (scroll requires insert mode) | Infinite scroll down | Infinite scroll up |
| `button` | Falls back to immediate (button requires insert mode) | Load-more button, appends on click | Load-more button, prepends on click |
| `visible` | Lazy load -- fetch and replace on viewport entry | Lazy load -- fetch and append on viewport entry | Lazy load -- fetch and prepend on viewport entry |
| `hover` | Prefetch -- fetch and replace on first mouseenter | Prefetch -- fetch and append on first mouseenter | Prefetch -- fetch and prepend on first mouseenter |
| `none` | Manual -- no auto-fetch, use `$refs.refresh()` | Manual -- `$refs.refresh()` appends | Manual -- `$refs.refresh()` prepends |

> **Warning:** `scroll` and `button` triggers require `get-insert` to be set. Without it, they fall back to `visible` and `immediate` behavior respectively, with a console warning.

---

## End-of-Data Detection

No.JS detects the end of paginated data in three ways:

**Empty response body** -- When the server returns an empty response body (Content-Length: 0 or empty string), No.JS stops pagination and hides the load-more button.

**`X-NoJS-Last-Page` header** -- The server can send an `X-NoJS-Last-Page: true` response header to explicitly signal there are no more pages.

**Null cursor** -- For cursor-based pagination, when the cursor field in the JSON response is `null` or absent, No.JS stops pagination.

```html
<!-- Server responses that stop pagination: -->

<!-- 1. Empty body (Content-Length: 0) -->
<!-- HTTP 200 with empty response body -->

<!-- 2. X-NoJS-Last-Page header -->
<!-- HTTP 200 with header: X-NoJS-Last-Page: true -->

<!-- 3. Null cursor (cursor-based only) -->
<!-- JSON: { "data": [...], "cursor": null } -->
```

---

## Templates with Pagination

Loading, error, and empty templates work seamlessly with pagination:

```html
<template id="itemsLoading">
  <p>Loading...</p>
</template>
<template id="itemsError">
  <p>Failed to load items.</p>
</template>
<template id="itemsEmpty">
  <p>No items found.</p>
</template>

<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-page="1"
     loading="#itemsLoading"
     error="#itemsError"
     empty="#itemsEmpty">
  <div foreach="item in items">
    <p bind="item.name"></p>
  </div>
</div>
```

> **Note:** During pagination (not the first fetch), a small inline loading indicator is shown at the insertion edge rather than replacing the entire content.

> **Note:** The `empty` template is only shown when the first page returns no data. Subsequent empty pages simply stop pagination.

---

## Scroll Position Preservation

When using `get-insert="prepend"`, No.JS automatically preserves the user's scroll position. New content is inserted above the current viewport, and the scroll offset is adjusted so the user's view does not jump.

```html
<!-- Scroll position is preserved automatically -->
<div get="/api/feed?page={page}"
     as="feed"
     get-trigger="button"
     get-insert="prepend"
     get-page="1">
  <!-- New items appear above without scroll jump -->
</div>
```

---

## Common Mistakes

```html
<!-- WRONG: scroll trigger without get-insert (falls back to visible) -->
<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-page="1">
</div>

<!-- RIGHT: scroll trigger with get-insert -->
<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-page="1">
</div>
```

```html
<!-- WRONG: using both get-cursor and get-page -->
<div get="/api/items?page={page}&cursor={cursor}"
     as="items"
     get-cursor
     get-page="1">
</div>

<!-- RIGHT: use one or the other -->
<div get="/api/items?cursor={cursor}"
     as="items"
     get-cursor
     get-cursor-field="nextCursor">
</div>
```

```html
<!-- WRONG: using scroll trigger with refresh (mutually exclusive) -->
<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-page="1"
     refresh="5000">
</div>

<!-- RIGHT: use one or the other -->
<div get="/api/items?page={page}"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-page="1">
</div>
```

---

## See Also

- [Data Fetching](data-fetching.md) -- `get` directive basics, reactive URLs, interceptors
- [Data Binding](data-binding.md) -- binding fetched data to the DOM
- [Loops](loops.md) -- `foreach`, `each`, `for` directives for rendering lists
- [Error Handling](error-handling.md) -- per-element and global error handling
- [Configuration](configuration.md) -- global API settings and event bus events

---

**Previous:** [Data Fetching <-](data-fetching.md) | **Next:** [Data Binding ->](data-binding.md)
