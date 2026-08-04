# ADR-002: Insert-Mode Single-Source Rendering, Observer Root, and i18n Post-Init Guard

**Status:** Accepted
**Date:** 2026-07-29
**Shipped in:** PRs #308, #304 (merged to main via #310)

## Context

Three independently reported issues shared a common theme: the framework's internal plumbing made implicit assumptions that broke under real-world conditions.

- **#275** — `get-insert="append|prepend"` rendered 2N-pageSize items per page load (6 instead of 4 on a 4-item page) because two independent rendering paths both produced DOM output.
- **#302** — `IntersectionObserver` for `get-trigger="scroll"`, `get-trigger="visible"`, and the initial-request observer all used the default viewport root. Inside a scrollable container, the sentinel was immediately visible at scrollTop 0, triggering premature fetches.
- **#213** — Calling `NoJS.i18n({ loadPath: '...' })` after CDN auto-init (`cdn.js` calls `init()` on `DOMContentLoaded`) silently never loaded the locale bundle, leaving all `t="..."` bindings empty.

These were fixed together as part of the NOJS-295 open-issues sweep.

## Decision 1: Insert-Mode Single-Source Rendering

### Problem

The HTTP directive's insert-mode path had two independent rendering mechanisms:

1. **Context accumulation** — `ctx.$set(asKey, accumulated)` which triggers the loop directive's reactive delta-append/reconcile.
2. **Wrapper-clone block** — a manual `clone + processTree` call that created per-page child contexts, walked the cloned DOM, and appended the result.

Both fired on every page load, producing duplicate rendered items. The wrapper-clone block also leaked per-page child contexts that were never disposed (violating Safety Rule 1).

### Decision

Remove the wrapper-clone rendering block entirely. `ctx.$set(asKey, accumulated)` is the single source of truth for insert-mode rendering — the loop directive's reactive path handles all DOM output.

### Changes

- Wrapper-clone block removed from `src/directives/http.js`.
- Prepend scroll-preservation relocated to wrap the `$set` call directly (lines 533-542 in the current source), measuring `scrollHeight` before and compensating `scrollTop` after.
- Per-page `childCtx` leak eliminated — no child contexts are created for insert-mode pages.
- Replace-mode guard `if (!isInsertMode || _isFirstFetch)` preserves the truth table: first fetch in insert mode uses the replace path (which renders the wrapper), subsequent fetches use the accumulation path exclusively.

### Alternatives Considered

1. **Non-reactive silent write + wrapper** — Keep the wrapper-clone block but suppress the reactive `$set`. Rejected: creates inconsistency between context state and DOM, and the childCtx leak would persist.
2. **Cross-directive loop-state introspection** — Have the HTTP directive query the loop directive's internal state to avoid double-rendering. Rejected: tight coupling between directives, fragile across future loop refactors.

### Consequences

- Insert-mode rendering is deterministic: one code path, one source of truth.
- Loop directives handle all DOM diffing/reconciliation, which is their responsibility.
- Prepend scroll-preservation depends on the loop rebuild being synchronous (see Known Limitations below).

## Decision 2: IntersectionObserver Root = Nearest Scrollable Ancestor

### Problem

All three `IntersectionObserver` instances in the HTTP directive (scroll-trigger pagination observer, `get-trigger="visible"` lazy-load observer, and the initial-request `get-trigger="scroll"` observer) used the default `root: null` (viewport). When the paginated element lived inside a scrollable container (`overflow-y: auto|scroll`), the sentinel was immediately visible relative to the viewport even at `scrollTop 0`, causing:

- Infinite scroll triggering all pages at once on mount.
- Visible-trigger elements loading immediately instead of when scrolled into the container's view.

### Decision

Resolve `_findScrollContainer(el)` at observer creation time, passing the nearest scrollable ancestor as `root` (or `null` when the ancestor is `document.documentElement`, since the IntersectionObserver API requires `null` for the viewport).

### Changes

- Added `_findScrollContainer(el)` (lines 49-57 in current source): walks `el.parentElement` up the DOM, checking `getComputedStyle(node).overflowY` for `"scroll"` or `"auto"`, falls back to `document.documentElement`.
- All three observers resolve `r = _findScrollContainer(el)` and pass `{ root: r === document.documentElement ? null : r, rootMargin: threshold }`.
- Pagination reset (`el.refresh()`) re-resolves the scroll container, so DOM changes between resets are handled correctly.

### Alternatives Considered

1. **Init-time caching** — Resolve the scroll container once at directive init and reuse. Rejected: DOM structure may change between pagination resets (e.g., route transitions that reparent elements), leading to stale root references.

### Consequences

- Sentinels are observed relative to their actual scrollable ancestor, so pagination and lazy-load fire at the correct scroll position.
- Semantics note: a sentinel visible in a not-yet-overflowing container still triggers loading. This is intentional — fill-until-overflow behavior is the expected UX for pagination.
- `_findScrollContainer` is called at observer creation, not cached globally, so it adapts to DOM changes.

## Decision 3: i18n Post-Init Guard

### Problem

`NoJS.i18n()` is called by users from `<script defer>` or `<script async>` tags to configure internationalization. When using the CDN build (`cdn.js`), `init()` runs automatically on `DOMContentLoaded`. If the user's script loads after init (which is the common `defer`/`async` case), the `i18n()` method configured `_config.i18n` but never triggered a locale bundle load or notified listeners, leaving `t="..."` bindings unresolved.

### Decision

Add an `_initPromise`-gated guard at the end of `NoJS.i18n()` that loads the resolved locale bundle and notifies listeners when called after `init()` has completed.

### Changes

- `_notifyI18n` added to the `i18n.js` import in `src/index.js`.
- Persisted-locale early `return` replaced by a `localeRestored` flag (line 503 in current source), ensuring execution continues to the post-init guard on all exit paths.
- Post-init guard (lines 530-535 in current source): checks `if (_initPromise)`, then:
  - If `loadPath` is set and the locale bundle isn't already loaded: `_loadI18nForLocale(locale).then(() => _notifyI18n())`.
  - If inline `locales` were provided: `_notifyI18n()` (notify immediately, no fetch needed).
- Pre-init behavior unchanged: `_initPromise` is `null` before `init()`, so the guard is a no-op.

### Alternatives Considered

1. **Docs-only wontfix** — Document that `i18n()` must be called before `init()`. Rejected: the CDN auto-init makes this impractical for most users, and `defer`/`async` scripts are the standard modern pattern.
2. **Delayed init** — Defer `init()` to wait for `i18n()`. Rejected: would break all existing CDN users who don't call `i18n()`, and introduces unpredictable init timing.

### Consequences

- Users can call `NoJS.i18n({ loadPath: '...' })` from `<script defer>` and it works as expected.
- Existing pre-init usage is unaffected (the guard is gated on `_initPromise`).
- The async load is intentionally fire-and-forget (`_loadI18nForLocale` never rejects — `_loadLocale` wraps fetch in try/catch), matching the existing convention in the locale setter.

## Bundle Acceptance Bound

Post-ship bundle measurement: **44,046 B gzip** (bound: <= 44,500 B; baseline before this work: 44,034 B). The three fixes added 12 bytes gzip to the production bundle.

## Known Limitations

- **Prepend scroll compensation with animate-leave (issue #316):** The prepend scroll-preservation introduced in D1 reads `scrollHeight` before `ctx.$set` and compensates immediately after, relying on the loop's re-render being synchronous. When the loop element carries `animate-leave`, `loops.js` defers `renderItems()` behind `animationend`/`setTimeout`, so the post-`$set` measurement sees a zero height delta and compensation silently does nothing. Tracked separately in #316.

## References

- Issue #275 — `get-insert` append/prepend duplicated rendered items
- Issue #302 — IntersectionObserver viewport-rooted inside scrollable containers
- Issue #213 — `NoJS.i18n()` after CDN auto-init never loaded bundles
- Issue #316 — Prepend scroll compensation skips with animate-leave (known limitation)
- PR #308 — D1 (insert-mode) and D2 (observer root) implementation
- PR #304 — D3 (i18n post-init guard) implementation
- PR #310 — Merge vehicle (NOJS-295 open issues sweep)
- Test coverage: `__tests__/directives-http-pagination.test.js` lines 1630-1860 (ADR-002 D1, ADR-002 D2)
