# Data Fetching

No.JS makes HTTP requests declarative — just add attributes to HTML elements.

## Base URL

Set once on any ancestor element. All descendant `get`, `post`, etc. resolve relative URLs against it.

```html
<body base="https://api.myapp.com/v1">
  <div get="/users">...</div>        <!-- → https://api.myapp.com/v1/users -->
  <div get="/posts">...</div>        <!-- → https://api.myapp.com/v1/posts -->
</body>
```

Override for specific sections:

```html
<div base="https://cms.myapp.com/api">
  <div get="/articles">...</div>     <!-- → https://cms.myapp.com/api/articles -->
</div>
```

Absolute URLs skip base resolution:

```html
<div get="https://other-api.com/data">...</div>
```

### Programmatic Configuration

```html
<script>
  NoJS.config({
    baseApiUrl: 'https://api.myapp.com/v1',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    },
    timeout: 10000,
    retries: 2,
    retryDelay: 1000
  });
</script>
```

> **Note:** `retries` applies to 5xx server errors and network failures. Client errors (4xx) are not retried.

### Per-Request Headers

```html
<div get="/me"
     headers='{"Authorization": "Bearer abc123"}'
     as="user">
</div>
```

---

## `get` — Fetch and Render Data

```html
<div get="/users" as="users">
  <!-- `users` is now available in this scope -->
</div>
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `get` | `string` | URL to fetch (GET request) |
| `as` | `string` | Name to assign the response in the context. Default: `"data"` |
| `loading` | `string` | Template ID to show while loading (e.g. `"#skeleton"`) |
| `error` | `string` | Template ID to show on fetch error (e.g. `"#errorTpl"`) |
| `empty` | `string` | Template ID to show when response is empty array/null |
| `refresh` | `number` | Auto-refresh interval in ms (polling) |
| `cached` | `boolean\|string` | Cache responses. `cached` = memory, `cached="local"` = localStorage, `cached="session"` = sessionStorage |
| `into` | `string` | Write response to a named global store |
| `debounce` | `number` | Debounce in ms (useful with reactive URLs) |
| `headers` | `string` | JSON string of additional headers |
| `params` | `string` | Expression that resolves to query params object |
| `skeleton` | `string` | ID of a DOM element to show while loading and hide when done |

### Full Example

```html
<div get="/users"
     as="users"
     loading="#usersSkeleton"
     error="#usersError"
     empty="#noUsers"
     refresh="30000"
     cached>

  <div each="user in users" template="userCard"></div>

</div>

<template id="usersSkeleton">
  <div class="skeleton-pulse">Loading users...</div>
</template>

<template id="usersError" var="err">
  <div class="error">Failed to load: <span bind="err.message"></span></div>
</template>

<template id="noUsers">
  <p>No users found.</p>
</template>
```

### Reactive URLs

URLs that reference state variables re-fetch automatically when those values change:

```html
<div state="{ page: 1, search: '' }">
  <input type="text" bind-value="search" on:input="search = $event.target.value" />

  <div get="/users?page={page}&q={search}"
       as="results"
       debounce="300">
    ...
  </div>
</div>
```

### URL Interpolation and Encoding

> ⚠️ **Breaking change (v1.10):** Values inside `{…}` placeholders are encoded with `encodeURIComponent`. This means `/` is encoded as `%2F`, which is correct for **query-string values** but will break **path segments** that intentionally contain slashes.
>
> ```html
> <!-- ✅ Safe — query value, encoding is correct -->
> <div get="/search?q={query}">...</div>
>
> <!-- ✅ Safe — single-level path segment, no slashes -->
> <div get="/users/{user.id}/profile">...</div>
>
> <!-- ❌ Broken — path contains "/", will become "%2F" -->
> <div get="/files/{path}">...</div>  <!-- path = "reports/2026" -->
>
> <!-- ✅ Workaround — concatenate outside {} -->
> <div get="'/files/' + path">...</div>
> ```

---

## `post`, `put`, `patch`, `delete` — Mutating Requests

Used on forms or triggered via `call`.

> **Tip:** The `call` directive now supports the same attributes as form-based HTTP directives — including `loading`, `headers`, `redirect`, and `body`. See [Actions & Refs → `call`](actions-refs.md) for full details.

### Form Submission

```html
<form post="/login"
      success="#loginSuccess"
      error="#loginError"
      loading="#loginLoading">
  <input type="text" name="email" />
  <input type="password" name="password" />
  <button type="submit">Login</button>
</form>

<template id="loginSuccess" var="result">
  <p>Welcome, <span bind="result.user.name"></span>!</p>
</template>

<template id="loginError" var="err">
  <p class="error" bind="err.message"></p>
</template>
```

### PUT / PATCH / DELETE

```html
<form put="/users/{user.id}"
      body='{"name": "{user.name}", "role": "{selectedRole}"}'
      success="#updateSuccess">
  ...
</form>

<button delete="/users/{user.id}"
        confirm="Are you sure?"
        success="#deleteSuccess"
        error="#deleteError">
  Delete User
</button>
```

### Mutation Attributes

| Attribute | Description |
|-----------|-------------|
| `post`, `put`, `patch`, `delete` | URL for the request |
| `body` | Request body (JSON string with interpolation). For forms, auto-serializes fields |
| `success` | Template ID to render on success. Receives response as `var` |
| `error` | Template ID to render on error. Receives error as `var` |
| `loading` | Template ID to show during request |
| `confirm` | Show browser `confirm()` dialog before sending |
| `redirect` | URL to navigate to on success (SPA route) |
| `then` | Expression to execute on success (e.g. `"users.push(result)"`) |
| `into` | Write response to a named global store |
| `cached` | Cache responses (memory/local/session) |

### Request Lifecycle

```
[idle] → [loading] → [success | error]
                         ↓         ↓
                    render tpl   render tpl
                    exec `then`  log to console
                    `redirect`
```

---

## `query` — Read Requests with a Body (RFC 10008)

`query` issues an HTTP **QUERY** request — a safe, idempotent, cacheable read that carries a request body, standardized in [RFC 10008](https://www.rfc-editor.org/rfc/rfc10008.html). Use it when a search or filter is too complex for a URL query string but is still a *read*, not a mutation.

```html
<!-- A search whose criteria are too large for the URL -->
<div query="/search"
     body='{"filters": {"status": "active", "tags": ["a", "b"]}}'
     as="results">
  <div each="hit in results" template="hitCard"></div>
</div>
```

QUERY behaves like `get` for rendering, caching, and triggers, but sends a body like `post`:

| Behavior | Same as |
|----------|---------|
| Auto-fires on mount (non-form) and re-fetches when the URL/params change | `get` |
| Renders into scope via `as`, supports `loading`/`error`/`empty` | `get` |
| Cacheable via `cached` (the cache key includes the body) | `get` |
| Sends a request body (`body`, or serialized form fields) | `post` |
| On a `<form>`, intercepts submit and serializes fields | `post` |
| **No CSRF token injected** — QUERY is a safe read | `get` |

### Form-Driven Query

On a `<form>`, `query` intercepts the submit and serializes the fields into the body — identical to `post`, but semantically a read:

```html
<form query="/products/search" success="#resultsTpl">
  <input name="q" type="text" />
  <select name="category">...</select>
  <button type="submit">Search</button>
</form>
```

### Triggers

Non-form `query` elements support the same lazy-load triggers as `get`, using a `query-` prefix:

| Attribute | Description |
|-----------|-------------|
| `query-trigger` | `visible` \| `scroll` \| `hover` \| `button` \| `none` — when to fire |
| `query-trigger-label` | Button label when `query-trigger="button"` (default `"Load More"`) |
| `query-threshold` | Root-margin threshold (px) for `visible`/`scroll` triggers |

```html
<div query="/reports/generate"
     body='{"range": "2026-Q1"}'
     query-trigger="button"
     query-trigger-label="Run Report"
     as="report">
  ...
</div>
```

### Body-Aware Caching

Because two QUERY requests to the same URL can differ only by body, the cache key incorporates the body. Identical URL **and** body hit the cache; a different body is a cache miss:

```html
<div query="/search" body='{"q": "{term}"}' cached="memory" as="hits">...</div>
```

Call `el.refresh()` (or use `refresh=`) to re-issue the request after changing body-only state.

> **Note:** Pagination (`get-cursor`, `get-page`, `get-insert`) remains **GET-only**. All other method-agnostic companions (`as`, `loading`, `error`, `empty`, `into`, `debounce`, `headers`, `params`, `skeleton`, `refresh`, `cached`) work with `query` unchanged.

---

## Skeleton Placeholders (`skeleton=`)

The `skeleton` attribute keeps a pre-rendered placeholder element visible while
a request is in flight, then hides it once the response arrives. This prevents
Cumulative Layout Shift (CLS) — the page holds its shape during loading instead
of collapsing and re-expanding.

```html
<!-- Skeleton lives in the DOM (SSG-friendly, no JS needed to render it) -->
<div id="product-skeleton" class="skeleton-card">
  <div class="skeleton-line"></div>
  <div class="skeleton-line short"></div>
</div>

<!-- skeleton= points to the element's id (without #) -->
<div get="/api/products/42" as="product" skeleton="product-skeleton">
  <h1 bind="product.name"></h1>
  <p bind="product.description"></p>
</div>
```

The skeleton is hidden automatically when:
- The response arrives (success)
- A cached response is used
- The response is empty (before rendering the `empty=` template)
- The request fails (before rendering the `error=` template)

### Combined with `loading=`

`skeleton=` and `loading=` serve different purposes and can be used together:

| | `skeleton=` | `loading=` |
|---|---|---|
| Content | Pre-rendered element already in the DOM | Template cloned into the fetch element |
| Visibility | Shown before JS, hidden after response | Injected by JS, replaced after response |
| CLS impact | None — space is already reserved | May cause layout shift |
| SSG-friendly | Yes | No |

```html
<div id="skeleton" class="skeleton-pulse"><!-- pre-rendered placeholder --></div>

<div get="/api/feed" as="items"
     skeleton="skeleton"
     loading="#spinnerTpl"
     empty="#emptyTpl">
  <div each="item in items" template="feedItem"></div>
</div>
```

### Skeleton element visibility

The skeleton element (`id="skeleton"`) should start **visible** in the HTML
(no `display: none` in CSS). `_hideSkeleton` sets `display: none` as an
inline style, and `_showSkeleton` removes that inline style. If the
skeleton has `display: none` in a CSS rule, removing the inline style will
reveal the CSS `display: none` again — effectively keeping it hidden.

Start the skeleton visible and let No.JS control its visibility:

```html
<!-- Correct: starts visible, No.JS hides after response -->
<div id="skeleton" class="skeleton-pulse">…placeholder…</div>

<!-- Incorrect: display:none in CSS conflicts with No.JS show/hide logic -->
<div id="skeleton" class="hidden skeleton-pulse">…placeholder…</div>
```

### Accessibility

Consider adding `aria-busy="true"` on the fetch container while the request
is in progress and `aria-hidden="true"` on the skeleton element when it is
hidden. These attributes are not injected automatically in the current release.

---

## Pagination & Infinite Scroll

No.JS supports built-in pagination for `get` directives. New pages of data can be appended or prepended to the existing content without replacing it.

### Pagination Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `get-trigger` | `string` | How the next page is requested: `"scroll"` (IntersectionObserver-based infinite scroll), `"button"` (auto-generated "Load More" button), or `"visible"` (fetch when element enters viewport) |
| `get-trigger-label` | `string` | Label text for the load-more button (default: `"Load More"`) |
| `get-insert` | `string` | How new data is inserted: `"append"` (after existing items) or `"prepend"` (before existing items). **Required** for `scroll` and `button` triggers — without it, content is replaced |
| `get-page` | `number` | Enable offset-based pagination. Sets the initial page number (default: `1`). Auto-increments on each fetch. Use `{page}` in the URL to interpolate |
| `get-cursor` | _(boolean)_ | Enable cursor-based pagination. The cursor value is extracted from each response and used in the next request via `{cursor}` in the URL |
| `get-cursor-field` | `string` | JSON field name to extract the next cursor from (e.g. `"nextCursor"`). When omitted, defaults to auto-detection |
| `get-threshold` | `string` | `rootMargin` for the IntersectionObserver. Default: `"200px"` for `scroll`, `"0px"` for `visible` |

> **Note:** `get-cursor` and `get-page` are mutually exclusive. If both are set, cursor-based pagination takes precedence with a console warning.

### Offset-Based Pagination

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

The `page` context variable starts at `1` and auto-increments after each successful fetch. When the server returns an empty array, pagination stops automatically.

### Cursor-Based Pagination

```html
<div get="/api/feed?cursor={cursor}&limit=20"
     as="items"
     get-trigger="scroll"
     get-insert="append"
     get-cursor
     get-cursor-field="nextCursor">
  <div each="item in items" key="item.id">
    <p bind="item.content"></p>
  </div>
</div>
```

The cursor starts as an empty string on the first request. After each response, the value of the field specified by `get-cursor-field` is extracted and used for the next request.

### Load More Button

```html
<div get="/api/comments?page={page}"
     as="comments"
     get-trigger="button"
     get-trigger-label="Show older comments"
     get-insert="append"
     get-page="1">
  <div each="comment in comments" key="comment.id">
    <p bind="comment.text"></p>
  </div>
</div>
```

The button is auto-generated and inserted after the content. It is automatically removed when the end of data is reached or while a fetch is in progress.

### `fetch:end` Event

The `fetch:end` event fires on the NoJS event bus after every HTTP request completes, regardless of success or failure. This is useful for dismissing global loading indicators:

```js
NoJS.on('fetch:end', ({ url }) => {
  console.log('Request finished:', url);
});
```

See [Configuration → Event Bus Events](configuration.md#event-bus-events) for all available bus events.

---

## Interceptors

Interceptors hook into the fetch pipeline to modify requests, inspect responses, or short-circuit the entire flow. They support async functions and have a 5-second timeout per interceptor.

### Basic Usage

```html
<script>
  // Add a header to every request
  NoJS.interceptor('request', (url, options) => {
    options.headers['X-Request-ID'] = crypto.randomUUID();
    return options;
  });

  // Handle 401 responses globally
  NoJS.interceptor('response', (response, url) => {
    if (response.status === 401) {
      NoJS.store.auth.user = null;
      NoJS.notify();
      NoJS.router.push('/login');
      throw new Error('Unauthorized');
    }
    return response;
  });
</script>
```

### Async Interceptors

Interceptor functions can be async. Each interceptor is given a 5-second timeout — if it does not resolve within that window, it is skipped with a warning and the chain continues.

```html
<script>
  NoJS.interceptor('request', async (url, options) => {
    const token = await refreshTokenIfExpired();
    options.headers['Authorization'] = 'Bearer ' + token;
    return options;
  });
</script>
```

### Cancelling Requests with `NoJS.CANCEL`

Return an object keyed by `NoJS.CANCEL` from a request interceptor to abort the fetch. The request throws an `AbortError`, which triggers the element's `error` template if one is set.

```html
<script>
  NoJS.interceptor('request', (url, opts) => {
    if (!navigator.onLine) {
      return { [NoJS.CANCEL]: true };
    }
    return opts;
  });
</script>
```

### Serving Cached Responses with `NoJS.RESPOND`

Return an object keyed by `NoJS.RESPOND` from a request interceptor to skip the HTTP call entirely and return the value directly as the response data.

```html
<script>
  const cache = new Map();

  NoJS.interceptor('request', (url, opts) => {
    if (opts.method === 'GET' && cache.has(url)) {
      return { [NoJS.RESPOND]: cache.get(url) };
    }
    return opts;
  });
</script>
```

### Replacing Response Data with `NoJS.REPLACE`

Return an object keyed by `NoJS.REPLACE` from a response interceptor to replace the parsed response body with custom data.

```html
<script>
  NoJS.interceptor('response', (response, url) => {
    if (url.includes('/users')) {
      return { [NoJS.REPLACE]: { users: [], normalized: true } };
    }
    return response;
  });
</script>
```

### Header Redaction

By default, interceptors receive redacted copies of requests and responses. Sensitive headers (`Authorization`, `Cookie`, `X-API-Key`, `X-CSRF-Token`, etc.) are stripped from the options object before it reaches untrusted interceptors, and sensitive response headers (`Set-Cookie`, `WWW-Authenticate`, etc.) are removed from the response proxy. URL query parameters matching patterns like `token`, `key`, `secret`, `auth`, `password`, or `credential` are replaced with `[REDACTED]`.

Plugins installed with `{ trusted: true }` via `NoJS.use()` receive the full, unredacted request and response objects. See [Plugins → Trusted Interceptors](plugins.md#trusted-interceptors) for details.

### Sentinel Summary

| Sentinel | Interceptor Type | Effect |
| -------- | ---------------- | ------ |
| `NoJS.CANCEL` | Request | Aborts the request (`AbortError`) |
| `NoJS.RESPOND` | Request | Returns data directly, no HTTP call |
| `NoJS.REPLACE` | Response | Replaces the parsed response body |

---

## See Also

- [Server-Sent Events](sse.md) — `sse` directive for real-time server-pushed streaming data
- [Actions & Refs](actions-refs.md) — `call` directive for click-triggered requests
- [State Management](state-management.md) — `into` for writing responses to stores
- [Configuration](configuration.md) — global API settings, CSRF, interceptors
- [Error Handling](error-handling.md) — per-element and global error handling

---

**Previous:** [Head Management ←](head-management.md) | **Next:** [Data Binding →](data-binding.md)
