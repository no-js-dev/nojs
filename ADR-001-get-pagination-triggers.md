# ADR-001: Get Directive Pagination and Trigger Extension

## Status

Proposed

## Context

The `get` directive is the primary declarative data-fetching primitive in NoJS Core. It currently supports single-shot fetches, polling via `refresh`, reactive URL refetching, caching, and template-driven loading/error/empty states. However, it has no built-in concept of pagination -- the single most common data-loading pattern on the web.

Developers who need paginated data (infinite scroll feeds, "load more" lists, lazy-loaded sections) must currently drop down to imperative JavaScript, which directly contradicts the NoJS zero-JS philosophy. Every real-world application that lists data needs pagination, and without it, the framework has a critical gap in its declarative coverage.

This ADR documents the architectural decisions behind five new attributes that extend `get` with declarative pagination and flexible fetch triggers: `get-insert`, `get-trigger`, `get-page`, `get-cursor`, and `get-threshold`. These attributes compose orthogonally: `get-insert` controls WHERE new content goes, `get-trigger` controls WHEN the next fetch fires, and `get-page`/`get-cursor` control HOW the URL is parameterized.

### Constraints

- **Zero-JS principle**: all behavior must be declarative via HTML attributes -- no JavaScript required from the developer.
- **Bundle size**: NoJS is a single-file framework loaded via `<script>` tag; any addition must be weight-conscious.
- **Safety rules**: all new code must comply with the 12 mandatory safety rules (disposal, cleanup, sanitization, timer guards, etc.).
- **Backward compatibility**: existing `get` behavior must remain unchanged when none of the new attributes are present.
- **No build step**: NoJS targets developers who do not use bundlers. The solution must work with a CDN `<script>` tag and plain HTML.

---

## Decision

We extend the `get` directive with five new attributes that compose orthogonally to cover the full pagination design space. Each decision is documented individually below.

---

### Decision 1: IntersectionObserver Integration -- Sentinel-Based (Scroll) vs Element-Based (Visible)

**Decision**: Use two distinct IntersectionObserver strategies depending on the trigger type:

- **`get-trigger="scroll"`**: Sentinel-based observation. A zero-height `<div data-nojs-sentinel>` is auto-inserted at the container edge (bottom for append, top for prepend). The observer watches the sentinel, not the container. This fires repeatedly as the user scrolls through paginated content.
- **`get-trigger="visible"`**: Element-based observation. The observer watches the `get` element itself. This is a one-shot lazy load -- the observer disconnects after the first fetch.

**Feature detection and fallback**: Check for `window.IntersectionObserver` at directive init time. If absent, degrade as follows:
- `scroll` trigger: fall back to `button` trigger (auto-render a "Load More" button) and emit a `_warn()` message explaining the fallback.
- `visible` trigger: fire the fetch immediately on init (equivalent to no trigger) and emit a `_warn()` message.

Both observers use the same `get-threshold` attribute (default `"200px"`) as the `rootMargin` parameter, enabling prefetch before the element is fully visible.

#### Alternatives Considered

##### Alternative 1A: Single IntersectionObserver strategy for both triggers

- **Description**: Use the sentinel approach for both `scroll` and `visible`, treating `visible` as a one-shot sentinel.
- **Pros**: Simpler implementation -- one code path for observer setup.
- **Cons**: `visible` semantically means "when THIS element enters the viewport," not "when a child sentinel enters." Using a sentinel for `visible` would require the sentinel to be placed at a position that approximates the element boundary, adding unnecessary complexity. The element itself is the correct observation target for lazy-load semantics.
- **Reason for rejection**: The sentinel is an implementation detail for infinite scroll, not a universal observation strategy. Using the element itself for `visible` is semantically correct and simpler.

##### Alternative 1B: No feature detection -- require IntersectionObserver

- **Description**: Simply fail silently or throw if IntersectionObserver is unavailable.
- **Pros**: Zero fallback code, smaller bundle.
- **Cons**: Breaks the progressive enhancement principle. NoJS targets a broad audience including developers serving older browsers. A silent failure would violate the framework's reliability contract.
- **Reason for rejection**: Progressive degradation to a button trigger is cheap to implement and preserves functionality on legacy browsers. The `_warn()` message ensures developers know about the fallback.

---

### Decision 2: Sentinel Strategy -- Zero-Height Div at Container Edge

**Decision**: The sentinel is a `<div data-nojs-sentinel>` with `height: 0; overflow: hidden; pointer-events: none;` styling. Its placement and lifecycle follow these rules:

- **Placement**: For `get-insert="append"` (default), the sentinel is the last child of the container. For `get-insert="prepend"`, the sentinel is the first child. The sentinel is inserted AFTER the initial content renders, not before.
- **Re-insertion after content load**: After new content is appended/prepended, the sentinel is moved (not recreated) to maintain its edge position. For append: content is inserted BEFORE the sentinel. For prepend: content is inserted AFTER the sentinel.
- **Disposal**: The sentinel is removed and the observer disconnected via `_onDispose()` registered immediately after creation (Safety Rule 2). On end-of-data, the sentinel is removed and the observer disconnected proactively.
- **Identification**: The `data-nojs-sentinel` attribute allows CSS targeting and prevents the sentinel from being processed by other directives. The sentinel carries no `__ctx` and is excluded from `processTree()`.

#### Alternatives Considered

##### Alternative 2A: Use the last/first content element as the observation target

- **Description**: Instead of a dedicated sentinel, observe the last (or first) child element of the container.
- **Pros**: No extra DOM element. Cleaner HTML output.
- **Cons**: The last child changes after every page load. The observer would need to be disconnected and reconnected on every fetch cycle, targeting a different element each time. If the content is empty or contains only text nodes, there is no element to observe. Race conditions arise if content is removed while the observer is active.
- **Reason for rejection**: A dedicated sentinel is stable, predictable, and survives content mutations. The overhead of one zero-height div is negligible.

##### Alternative 2B: Use a CSS scroll-snap or scroll event listener instead of IntersectionObserver

- **Description**: Listen for `scroll` events on the container or a scrollable ancestor and calculate proximity to the bottom.
- **Pros**: No sentinel needed. Works on all browsers.
- **Cons**: Scroll event listeners fire at high frequency and require throttling. Calculating scroll position relative to the container bottom is error-prone with nested scrolling contexts. Performance is measurably worse than IntersectionObserver, which is optimized at the browser engine level. Does not work for `visible` trigger (element not yet in DOM may not have a scrollable ancestor).
- **Reason for rejection**: IntersectionObserver exists precisely to solve this problem efficiently. Scroll listeners are the legacy approach with known performance pitfalls.

---

### Decision 3: State Management -- Page Value Lives in Context, Not DOM Attribute

**Decision**: The `page` (integer) and `cursor` (string) values are stored as reactive context variables on the element's `__ctx`, following the same pattern as the `as` key. The initial value is read from the `get-page` attribute at init time, but subsequent mutations happen exclusively in the context via `ctx.$set("page", newValue)`.

Rationale:
- **Consistency**: The `as` key already stores fetch results in the context, not in DOM attributes. Page/cursor state is fetch metadata and belongs in the same reactive layer.
- **Reactivity**: Storing in context means `{page}` interpolation in the URL template resolves from the context automatically, without any special-case code in the expression evaluator.
- **No DOM pollution**: Mutating DOM attributes on every page advance would trigger MutationObserver callbacks in unrelated code (screen readers, browser extensions, DevTools) and is semantically incorrect -- the page number is runtime state, not a document attribute.
- **DevTools integration**: Context values are already surfaced in the NoJS DevTools panel. Page/cursor state appears automatically without additional instrumentation.

The initial value from `get-page="1"` is parsed to an integer and stored as `ctx.page = 1`. The attribute value is read once and never mutated.

#### Alternatives Considered

##### Alternative 3A: Store page in DOM attribute and read on each fetch

- **Description**: Mutate the `get-page` attribute value after each successful fetch (e.g., `el.setAttribute("get-page", "2")`).
- **Pros**: State is visible in the DOM inspector without DevTools. Simple mental model for beginners.
- **Cons**: DOM attribute mutation triggers MutationObserver callbacks, which can cause infinite loops if any observer reprocesses the element. It breaks the existing NoJS convention where directive attributes are read once at init. It would require special handling in `processTree()` to avoid re-initializing the directive. Accessibility tools may announce attribute changes.
- **Reason for rejection**: Violates the existing architectural pattern. Context is the canonical state layer in NoJS.

##### Alternative 3B: Store page in a separate WeakMap keyed by element

- **Description**: Use a module-scoped `WeakMap<HTMLElement, { page, cursor }>` to track pagination state.
- **Pros**: No context pollution. State is invisible to expressions.
- **Cons**: Breaks interpolation -- `{page}` in the URL template would not resolve. Requires a separate lookup mechanism. Duplicates the role of the context system. Not accessible to `then` expressions or conditional templates.
- **Reason for rejection**: The context system already solves state management. Duplicating it adds complexity without benefit.

---

### Decision 4: `get-trigger="button"` Template -- Auto-Generate a Default Button

**Decision**: When `get-trigger="button"` is set, the directive auto-generates a `<button data-nojs-load-more>` element as a child of the container. The button:

- Has a default label of `"Load More"`, customizable via `get-trigger-label` attribute.
- Is placed at the container edge (last child for append, first child for prepend).
- Has `type="button"` to prevent form submission if nested inside a `<form>`.
- Is removed on end-of-data.
- Has its click listener cleaned up via `_onDispose()` (Safety Rule 2).

The button is NOT user-templated. The developer cannot provide a custom button template via a `<template>` element.

Rationale:
- **Zero-JS philosophy**: Requiring the developer to provide a button template would force them to understand NoJS internals (event wiring, state management). An auto-generated button with a customizable label covers 95% of use cases declaratively.
- **Consistency**: The `loading`, `error`, and `empty` templates are already auto-inserted. A "load more" button follows the same pattern.
- **Styling**: The `data-nojs-load-more` attribute provides a stable CSS hook. Developers can style it with `[data-nojs-load-more] { ... }` without touching JavaScript.
- **Accessibility**: The auto-generated button includes `aria-label` derived from the trigger label, ensuring screen reader support out of the box.

#### Alternatives Considered

##### Alternative 4A: Require a user-provided `<template get-more>` element

- **Description**: The developer provides a `<template get-more>` inside the container. NoJS clones and inserts it, wiring up the click handler.
- **Pros**: Full control over button markup. Supports complex "load more" UIs (e.g., button with spinner, progress bar, remaining count).
- **Cons**: Increases the minimum boilerplate for the most common case. Every developer who wants a "load more" button must write a `<template>` -- even if they just want a plain button with text. Contradicts the zero-JS, minimal-markup philosophy. The template would need special processing to avoid double-execution (Safety Rule 9).
- **Reason for rejection**: The common case (a button with a label) should be zero-effort. Developers with complex requirements can use `get-trigger="none"` and wire their own button via `el.refresh()`, which is already supported.

##### Alternative 4B: Support both auto-generated and user-templated buttons

- **Description**: If a `<template get-more>` exists, use it. Otherwise, auto-generate a default button.
- **Pros**: Maximum flexibility. Covers both simple and complex cases.
- **Cons**: Two code paths for the same feature increases maintenance burden and test surface. The fallback logic (template present vs absent) adds branching complexity. Documentation must explain both modes. Edge cases multiply (what if the template exists but is empty? what if it has directive attributes?).
- **Reason for rejection**: YAGNI. The auto-generated button covers the common case. `get-trigger="none"` + manual button covers the advanced case. The middle ground adds complexity without proportional value. This can be revisited in a future version if demand materializes.

---

### Decision 5: Interaction with `refresh` -- Scroll/Button + Refresh Mutually Exclusive

**Decision**: The `refresh` attribute (polling) and `get-trigger="scroll"` or `get-trigger="button"` are mutually exclusive. If both are present, emit a `_warn()` message at init time and ignore `refresh`.

- `get-trigger="scroll"` + `refresh`: **WARN, ignore refresh**. Polling would reset content on a timer while the user is scrolling, causing jarring UX. The scroll trigger already handles fetching.
- `get-trigger="button"` + `refresh`: **WARN, ignore refresh**. Polling would fetch new content behind the user's back while they have a "load more" button. Confusing interaction.
- `get-trigger="visible"` + `refresh`: **VALID**. After the one-shot lazy load, polling can keep the content updated. `refresh` replaces content (no append).
- `get-trigger="hover"` + `refresh`: **VALID**. Same rationale as `visible`.
- `get-trigger="none"` + `refresh`: **VALID**. Polling drives periodic refetches. This is effectively the current behavior.

#### Alternatives Considered

##### Alternative 5A: Allow scroll + refresh and merge behaviors

- **Description**: `refresh` appends new content periodically (like a live feed), while `scroll` triggers historical pagination.
- **Pros**: Enables real-time + pagination (e.g., Twitter-like feeds where new tweets appear at top while scrolling loads older ones).
- **Cons**: Requires two concurrent fetch loops with different URL parameterization (one for "newer than latest" and one for "older than oldest"). Introduces race conditions between the two fetchers. Scroll position management becomes extremely complex. The URL template would need to express two different query directions. This is fundamentally a different feature (bidirectional pagination) that deserves its own design.
- **Reason for rejection**: Bidirectional live feeds are a complex feature that goes beyond pagination. Attempting to bolt it onto refresh + scroll would produce a fragile, hard-to-reason-about system. If needed, it should be designed as a separate feature with dedicated attributes.

##### Alternative 5B: Silently ignore the conflict without warning

- **Description**: If both are present, just ignore `refresh` without telling the developer.
- **Pros**: No console noise.
- **Cons**: Silent failures are the worst kind of bugs. The developer expects polling and gets none. They spend time debugging a feature that was silently disabled. Violates the NoJS principle of explicit error communication.
- **Reason for rejection**: NoJS consistently warns about configuration issues (`_warn()` is used throughout). Developers need to know their `refresh` attribute is being ignored.

---

### Decision 6: Reset Semantics -- URL Change (Non-Page Params) Clears Content and Resets Page

**Decision**: When a reactive URL dependency changes that is NOT the `page` or `cursor` variable, the pagination state resets completely:

1. All previously appended/prepended content is cleared (with proper `_disposeTree()` before `innerHTML = ""` per Safety Rule 1).
2. `page` resets to its initial value (parsed from `get-page` attribute).
3. `cursor` resets to `null`.
4. The sentinel and/or "load more" button are reinserted at the correct position.
5. A fresh first-page fetch fires.

The reactive URL watcher (already implemented in `http.js` lines 344-375) must be extended to distinguish between "pagination variable changed" and "filter/category/search variable changed." This is done by tracking which context keys are pagination keys (`page`, `cursor`) and comparing the non-pagination portion of the resolved URL.

Implementation approach: Before calling `doRequest()` in the `onAncestorChange` watcher, compare the resolved URL with pagination tokens stripped. If the non-pagination portion changed, execute the reset sequence. If only pagination tokens changed, proceed with normal append/prepend.

#### Alternatives Considered

##### Alternative 6A: Reset on ANY URL change, including page/cursor

- **Description**: Any change to the resolved URL triggers a full reset.
- **Pros**: Simpler implementation -- no need to distinguish pagination vs non-pagination variables.
- **Cons**: Breaks pagination entirely. When the user scrolls and `page` increments from 1 to 2, the URL changes from `?page=1` to `?page=2`. If this triggers a reset, the page goes back to 1, creating an infinite loop.
- **Reason for rejection**: Fundamentally incompatible with pagination.

##### Alternative 6B: Never reset -- accumulate content indefinitely

- **Description**: When a non-pagination URL variable changes (e.g., category), just start appending content for the new category after the old category's content.
- **Pros**: No disposal overhead. Simple implementation.
- **Cons**: Produces nonsensical UIs where content from different filters is interleaved. The user switches from "Electronics" to "Books" and sees electronics items followed by books items. No application wants this behavior.
- **Reason for rejection**: Violates user expectations. A filter change should show fresh results, not concatenated results.

---

### Decision 7: Cursor Extraction Protocol

**Decision**: Cursor values are extracted from the fetch response using a priority-ordered protocol:

1. **`X-NoJS-Cursor` response header** (highest priority). If present, its value is used as the next cursor.
2. **JSON body field lookup** (fallback). If no header is present and the response body is JSON, check these fields in order: `cursor`, `next_cursor`, `nextCursor`, `next`. The first non-null value wins.
3. **Custom field via `get-cursor-field`**: If the `get-cursor-field` attribute is set (e.g., `get-cursor-field="pagination.nextToken"`), it overrides the default body field lookup (step 2) but NOT the header check (step 1). Dot notation is supported for nested fields.

**End-of-data**: A cursor value of `null`, `undefined`, or empty string `""` signals that no more pages exist.

**Data field extraction**: When the cursor is extracted from a JSON body, the actual renderable data must also be located. The response root is used if it is an array. If the root is an object (common pattern: `{ data: [...], cursor: "abc" }`), the first array-valued field is used. This is a heuristic, not a guarantee -- developers with non-standard response shapes should use a response interceptor to normalize the data.

#### Alternatives Considered

##### Alternative 7A: Body field only, no header support

- **Description**: Always extract the cursor from the JSON body. No header support.
- **Pros**: Simpler implementation -- only one extraction path.
- **Cons**: Many APIs (especially those returning HTML or non-JSON responses) cannot embed a cursor in the body. Headers are the standard mechanism for response metadata. Some APIs (e.g., GitHub's pagination) use `Link` headers exclusively. Forcing cursor-in-body would limit the APIs that NoJS can consume.
- **Reason for rejection**: Headers are the canonical HTTP mechanism for response metadata. NoJS should support both transport channels.

##### Alternative 7B: Require explicit `get-cursor-field` on every element

- **Description**: No default field lookup. Developers must always specify which field contains the cursor.
- **Pros**: No ambiguity. No heuristic guessing.
- **Cons**: Increases boilerplate for the most common API patterns. APIs that use `cursor` or `next_cursor` (the vast majority) would require an attribute that just repeats the obvious. Contradicts the zero-configuration principle.
- **Reason for rejection**: Convention over configuration. The default field list covers 90% of APIs. The `get-cursor-field` escape hatch handles the rest.

##### Alternative 7C: Support `Link` header parsing (RFC 8288)

- **Description**: Parse the `Link` header for `rel="next"` and extract the full URL.
- **Pros**: Supports GitHub-style pagination and other REST APIs that use RFC 8288.
- **Cons**: `Link` header pagination provides a full URL, not a cursor value. This changes the fundamental model -- instead of interpolating `{cursor}` into a URL template, the next URL is taken verbatim from the header. This is a different pagination paradigm (URL-based vs cursor-based) that would require a separate attribute and code path. Additionally, `Link` headers can contain multiple relations and require a parser.
- **Reason for rejection**: Out of scope for this iteration. URL-based pagination (following full URLs from `Link` headers) is a valid future enhancement but is architecturally distinct from cursor/page interpolation. It would be better served by a dedicated `get-next-url` attribute in a future ADR.

---

### Decision 8: Prepend Scroll Position Preservation

**Decision**: When new content is prepended (`get-insert="prepend"`), the scroll position must be preserved so the user does not jump to the top. The implementation uses the following algorithm:

1. Before inserting new content, record `scrollContainer.scrollTop` and `scrollContainer.scrollHeight`.
2. Insert the new content (with `processTree()` to activate directives).
3. After insertion, calculate the height delta: `newScrollHeight - oldScrollHeight`.
4. Adjust `scrollContainer.scrollTop += heightDelta`.

The scroll container is resolved by walking up the DOM tree from the `get` element to find the first ancestor with `overflow-y: scroll` or `overflow-y: auto` (computed style). If no scrollable ancestor is found, `document.documentElement` is used.

For append mode, no scroll adjustment is needed -- the browser naturally preserves scroll position when content is added below the viewport.

#### Alternatives Considered

##### Alternative 8A: Use `scrollIntoView()` on the last-seen element

- **Description**: Before prepending, mark the topmost visible element. After prepending, call `element.scrollIntoView()`.
- **Pros**: Simple API.
- **Cons**: `scrollIntoView()` causes a visible scroll animation/jump. It does not account for partial visibility -- if the user was mid-scroll between two elements, the scroll snaps to the nearest element boundary. The `behavior: "instant"` option avoids animation but still causes a visual snap.
- **Reason for rejection**: The delta-based approach produces zero visual disruption. `scrollIntoView()` is too coarse-grained.

##### Alternative 8B: Use CSS `overflow-anchor: auto`

- **Description**: Rely on the browser's native scroll anchoring (CSS `overflow-anchor`) to handle position preservation.
- **Pros**: Zero JavaScript. Browser-native solution.
- **Cons**: `overflow-anchor` is designed for content that shifts BELOW the anchor point, not for prepended content above it. Browser support is inconsistent (Safari has partial support). The anchoring algorithm is a black box -- NoJS cannot guarantee consistent behavior across browsers. In testing, `overflow-anchor` does not handle the prepend case reliably.
- **Reason for rejection**: Not reliable for the prepend use case. The JavaScript delta approach is deterministic and cross-browser.

---

### Decision 9: `get-insert` as Single Attribute -- Replacing Boolean `get-append` with `get-insert="append|prepend"`

**Decision**: Use a single `get-insert` attribute with an enumerated value (`"append"` or `"prepend"`) instead of two boolean attributes (`get-append` and `get-prepend`).

Rationale:
- **Mutual exclusivity enforcement**: `append` and `prepend` are mutually exclusive by definition. With two boolean attributes, a developer could write `get-append get-prepend`, creating an ambiguous state that requires conflict resolution logic. A single attribute with an enum value makes the mutual exclusivity structural -- it is impossible to express both at once.
- **Extensibility**: If future insertion modes are needed (e.g., `"replace"` for explicit replace semantics, or `"before"` / `"after"` for sibling insertion), they can be added as new enum values without introducing additional attributes.
- **Naming precision**: `get-insert` communicates that this attribute controls the insertion MODE. `get-append` only communicates one mode and forces the creation of a symmetric `get-prepend`, doubling the attribute surface area.
- **Default behavior**: When `get-insert` is absent, the existing replace behavior applies (backward compatible). When `get-insert` is present with no value (bare attribute), it defaults to `"append"`.

#### Alternatives Considered

##### Alternative 9A: Two boolean attributes (`get-append` and `get-prepend`)

- **Description**: `get-append` (boolean) enables append mode. `get-prepend` (boolean) enables prepend mode.
- **Pros**: Slightly more readable in simple cases (`get-append` reads as "append content"). No need to remember enum values.
- **Cons**: Both present simultaneously is a valid HTML state that must be handled with conflict resolution logic. Two attributes double the validation surface. Adding a third mode requires a third boolean, creating a combinatorial explosion.
- **Reason for rejection**: Structural ambiguity. The enum approach prevents invalid states at the API level.

##### Alternative 9B: Use the existing `get` attribute value to encode insertion mode

- **Description**: Extend the URL syntax, e.g., `get="append:/api/items"` or `get="/api/items" get-mode="append"`.
- **Pros**: Fewer new attributes.
- **Cons**: Overloading the URL value with mode semantics violates separation of concerns. The `get` attribute is a URL -- mixing behavioral directives into it makes parsing fragile and errors confusing.
- **Reason for rejection**: The URL attribute should contain only the URL. Behavioral modifiers belong in separate attributes.

---

### Decision 10: `get-trigger` Independence -- Trigger and Insert Are Orthogonal Axes

**Decision**: `get-trigger` (WHEN to fetch) and `get-insert` (WHERE to insert) are independent, orthogonal attributes. Any trigger can be combined with any insertion mode:

| | No `get-insert` | `get-insert="append"` | `get-insert="prepend"` |
|---|---|---|---|
| No `get-trigger` | Current behavior | Append on init, manual `refresh()` for more | Prepend on init, manual `refresh()` for more |
| `scroll` | Replace on scroll (unusual but valid) | Infinite scroll (append) | Reverse infinite scroll (prepend) |
| `button` | Replace on button click (unusual but valid) | Load more (append) | Load newer (prepend) |
| `visible` | Lazy load (replace) | Lazy load (append, one-shot) | Lazy load (prepend, one-shot) |
| `hover` | Prefetch on hover (replace) | Prefetch on hover (append, one-shot) | Prefetch on hover (prepend, one-shot) |
| `none` | Manual only (replace) | Manual only (append) | Manual only (prepend) |

Rationale:
- **Composition over special cases**: If trigger and insert were coupled (e.g., `get-trigger="scroll"` implies append), developers would lose the ability to express combinations like "scroll trigger but replace content" or "button trigger but prepend." These may be uncommon, but they are valid and should not require workarounds.
- **Predictability**: Each attribute has a single responsibility. `get-trigger` never affects insertion behavior. `get-insert` never affects trigger behavior. Developers can reason about each independently.
- **Documentation clarity**: Orthogonal attributes are easier to document. The trigger section describes trigger behavior without mentioning insertion. The insert section describes insertion without mentioning triggers. The composition matrix above covers the full surface area.

#### Alternatives Considered

##### Alternative 10A: `get-trigger="scroll"` implies `get-insert="append"`

- **Description**: Certain triggers automatically set the insertion mode. `scroll` implies append. `button` implies append.
- **Pros**: Less boilerplate for the common case. `get-trigger="scroll"` alone would be sufficient for infinite scroll.
- **Cons**: Implicit behavior is a debugging trap. A developer who writes `get-trigger="scroll"` and expects replace semantics gets append instead, with no attribute to explain why. The implicit coupling makes the attributes harder to reason about independently. If the implied default is wrong for a use case, there is no way to override it without understanding the implicit rule.
- **Reason for rejection**: Explicit is better than implicit. One extra attribute (`get-insert="append"`) is a trivial cost for clear, predictable behavior.

##### Alternative 10B: A single combined attribute (e.g., `get-paginate="scroll-append"`)

- **Description**: Combine trigger and insert into a single attribute with compound values.
- **Pros**: One attribute instead of two.
- **Cons**: Combinatorial explosion of values: `scroll-append`, `scroll-prepend`, `button-append`, `button-prepend`, `visible-append`, etc. The attribute value becomes a micro-DSL that must be parsed. Adding new triggers or insertion modes multiplies the value space. Contradicts the NoJS philosophy of simple, self-documenting attributes.
- **Reason for rejection**: Compound values sacrifice readability and extensibility for marginal reduction in attribute count.

---

## Consequences

### Positive

- **Complete declarative pagination**: Developers can implement infinite scroll, "load more," lazy loading, and cursor-based pagination entirely in HTML. No JavaScript required.
- **Orthogonal composition**: The 5x3 trigger-insert matrix covers every reasonable pagination UX pattern without special-case logic.
- **Consistent with existing architecture**: Page/cursor state in context, disposal via `_onDispose()`, and reactive URL watching all follow established NoJS patterns.
- **Progressive enhancement**: Feature detection with graceful fallback ensures the framework works on browsers without IntersectionObserver.
- **DevTools integration**: Pagination state is automatically visible in the NoJS DevTools panel because it lives in the context.
- **Backward compatible**: No existing `get` behavior changes when the new attributes are absent.

### Negative

- **Bundle size increase**: IntersectionObserver setup, sentinel management, cursor extraction, and scroll position preservation add code to the already-large `http.js` directive file. Estimated increase: 150-250 lines (3-5 KB minified).
- **Increased complexity in `http.js`**: The `doRequest()` function must now handle append/prepend insertion, and the init function must set up observers, sentinels, and buttons. The file grows from ~390 lines to an estimated ~550-650 lines, increasing cognitive load for contributors.
- **Auto-generated button is not customizable beyond label**: Developers who want a complex "load more" UI (spinner, progress, count) must use `get-trigger="none"` and implement their own button. The auto-generated button is intentionally minimal.
- **Cursor extraction heuristic is imperfect**: The default body field lookup (`cursor`, `next_cursor`, `nextCursor`, `next`) is a best-effort heuristic. APIs with non-standard field names require `get-cursor-field`. APIs that nest data in non-obvious structures may need a response interceptor.
- **Scroll position preservation for prepend adds layout-dependent code**: The delta-based scroll adjustment requires measuring `scrollHeight` before and after DOM mutation. If the content triggers async layout (lazy-loaded images, web fonts), the measurement may be inaccurate. A `requestAnimationFrame` after insertion mitigates this but does not guarantee pixel-perfect preservation.

### Risks

- **IntersectionObserver re-entrancy**: If the observer callback fires while a fetch is already in-flight, a second fetch could be dispatched. **Mitigation**: A concurrency guard (boolean flag `_fetching`) prevents concurrent fetches. The observer callback is a no-op while `_fetching` is true.
- **Memory leaks from undisposed observers**: If `_onDispose()` is not called correctly (e.g., element removed by a parent directive before the `get` directive's dispose runs), the IntersectionObserver holds a reference to a detached DOM element. **Mitigation**: The observer callback checks `el.isConnected` before proceeding (same pattern as timer guards in Safety Rule 4). The observer also uses `WeakRef` semantics implicitly -- a disconnected observer on a GC'd element is harmless.
- **Sentinel removed by user code or another directive**: If a parent directive clears the container (`innerHTML = ""`), the sentinel is destroyed without the observer being disconnected. **Mitigation**: The observer callback checks for the sentinel's presence. If missing, it disconnects and does not attempt to recreate the sentinel (end-of-data equivalent).
- **Race condition between reset and in-flight fetch**: If a reactive URL change triggers a reset while a paginated fetch is in-flight, the fetch response could arrive after the reset and append stale content. **Mitigation**: The existing `AbortController` pattern (SwitchMap in `doRequest()`) aborts the in-flight request on reset. The AbortError is silently caught.
- **`get-cursor` + `get-page` conflict**: Both attributes on the same element create ambiguous pagination semantics. **Mitigation**: `get-cursor` takes precedence. A `_warn()` message is emitted at init time.

---

## Architectural Impact

### Components Affected

| Component | Impact | Details |
|-----------|--------|---------|
| `src/directives/http.js` | **Major modification** | All 5 new attributes are parsed and handled here. `doRequest()` gains append/prepend insertion paths. Init gains observer/button/sentinel setup. |
| `src/context.js` | **No modification** | Page/cursor state uses existing `createContext()` and `$set()`. No changes needed. |
| `src/fetch.js` | **Minor modification** | Cursor extraction from response headers and body. May require exposing the raw `Response` object (headers) alongside the parsed data. |
| `src/dom.js` | **No modification** | `_disposeTree()`, `processTree()`, `_cloneTemplate()` are used as-is. |
| `src/globals.js` | **No modification** | `_onDispose()`, `_warn()`, `_emitEvent()` are used as-is. |
| `__tests__/directives-data.test.js` | **Major addition** | Unit tests for all 10 decisions: pagination state, cursor extraction, reset semantics, mutual exclusivity warnings, end-of-data detection. |
| `e2e/` | **Major addition** | E2E tests for infinite scroll, load more button, lazy load, prepend, cursor pagination. Mock API endpoints needed. |

### Migrations

None required. All new attributes are additive. Existing `get` elements without the new attributes behave identically to the current implementation.

### Dependencies

- **IntersectionObserver API**: Available in all modern browsers (Chrome 58+, Firefox 55+, Safari 12.1+, Edge 15+). Fallback strategy documented in Decision 1.
- **No new npm dependencies**: All functionality is implemented with browser-native APIs.

### Safety Rule Compliance

| Rule | How This Feature Complies |
|------|--------------------------|
| 1. Disposal before clearing DOM | Reset sequence calls `_disposeTree()` on all children before `innerHTML = ""`. |
| 2. Event listener cleanup | Button click listener, hover listener registered with immediate `_onDispose()`. |
| 3. Watcher unsubscribe | No new watchers beyond the existing reactive URL watcher pattern. |
| 4. Timer guards | IntersectionObserver callbacks check `el.isConnected`. Observer disconnected via `_onDispose()`. |
| 5. Safety-net timeouts | `requestAnimationFrame` for scroll position adjustment uses `\|\| 0` pattern where applicable. |
| 6. HTML sanitization | Paginated responses pass through the same DOMParser sanitization as existing `get` responses. |
| 9. Cloned elements | Sentinel and auto-generated button carry no directive attributes. `data-nojs-sentinel` and `data-nojs-load-more` are data attributes, not directives. |

---

## References

- **PRD**: `.github/specs/get-pagination-triggers.md` (branch `feat/NOJS-99`)
- **EPIC**: NOJS-98 (Genesis)
- **Current implementation**: `src/directives/http.js` (NoJS Core)
- **IntersectionObserver API**: https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
- **Scroll anchoring CSS spec**: https://drafts.csswg.org/css-scroll-anchoring/
- **RFC 8288 (Web Linking)**: https://www.rfc-editor.org/rfc/rfc8288 (referenced in Alternative 7C for future consideration)
- **NoJS Safety Rules**: `CLAUDE.md` section "Mandatory Safety Rules"
