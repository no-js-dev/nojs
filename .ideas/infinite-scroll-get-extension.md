# Infinite Scroll via `get` Directive Extension

**Date:** 2026-06-05
**Scope:** NoJS Core
**Status:** Implemented (NOJS-98, 2026-06-05)

## Concept

Rather than building a separate "infinite scroll" element in NoJS-Elements, extend the existing Core `get` directive with scroll-triggered pagination. The `get` directive already fetches data declaratively (e.g., `get="/api/items"`), so pagination is a natural evolution of that capability. This keeps data-fetching concerns consolidated in Core and avoids an artificial split between "fetch once" and "fetch paginated."

## API Design

### Basic infinite scroll

```html
<div get="/api/items?page={page}"
     get-trigger="scroll"
     get-append
     get-page="1">
</div>
```

- `get-trigger="scroll"` — uses an Intersection Observer to trigger the next page load when the user scrolls near the bottom of the container.
- `get-append` — appends fetched HTML to the existing content instead of replacing it.
- `get-page` — tracks the current page number (starts at the specified value, auto-increments on each fetch).

### Manual "Load More" variant

```html
<div get="/api/items?page={page}"
     get-trigger="button"
     get-append
     get-page="1">
</div>
```

- `get-trigger="button"` — renders a "Load More" button instead of auto-triggering on scroll. The user clicks to load the next page.

### Declarative loading / empty / error states

```html
<div get="/api/items?page={page}"
     get-trigger="scroll"
     get-append
     get-page="1">

  <template get-loading>
    <p>Loading more items...</p>
  </template>

  <template get-empty>
    <p>No more items to load.</p>
  </template>

  <template get-error>
    <p>Failed to load items. <button get-retry>Retry</button></p>
  </template>
</div>
```

### End-of-data signal

The server signals "no more pages" by returning an empty response body or a response header (e.g., `X-NoJS-Last-Page: true`). When detected, the observer disconnects and the empty-state template renders.

## Technical Notes

- **Intersection Observer:** Attach a sentinel element at the bottom of the container. When it enters the viewport (with a configurable `rootMargin` threshold), increment `get-page` and re-evaluate the `get` URL template.
- **URL templating:** The `{page}` token in the `get` URL is replaced with the current `get-page` value. This could generalize to other tokens like `{offset}` or `{cursor}` in the future.
- **Append mode:** `get-append` inserts the response HTML before the sentinel element, preserving scroll position. Without `get-append`, the default `get` behavior (full replacement) still applies.
- **Debouncing:** Scroll-triggered fetches should be debounced to prevent duplicate requests while a fetch is in flight.
- **This belongs in Core** because `get` is already a Core directive. Adding pagination attributes alongside it keeps the API cohesive and avoids requiring Elements as a dependency for basic data-loading patterns.

## Open Questions

1. **Cursor-based pagination:** Should the API also support cursor-based pagination (e.g., `get-cursor` populated from a response header or JSON field)? This is common in modern APIs and offset/page-based pagination can miss or duplicate items.
2. **Scroll container:** Should `get-trigger="scroll"` observe the window scroll or the nearest scrollable ancestor? Probably the nearest scrollable ancestor, with a fallback to the viewport.
3. **Threshold configuration:** Should there be a `get-threshold` attribute to control how early the next page loads (e.g., `get-threshold="200px"` to start loading 200px before the sentinel is visible)?
4. **Concurrency with existing `get` behavior:** How does this interact with `get-poll` (if that exists or is planned)? Need to ensure no conflicts between polling and scroll-triggered fetches.
5. **SSR / progressive enhancement:** If JavaScript is disabled or hasn't loaded yet, the first page of content should still be server-rendered. The `get` extension should enhance, not replace, the initial content.
