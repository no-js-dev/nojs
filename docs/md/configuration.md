# Configuration & Security

## Global Settings

```html
<script>
  NoJS.config({
    // API
    baseApiUrl: 'https://api.myapp.com/v1',
    headers: { 'Authorization': 'Bearer xxx' },
    timeout: 10000,
    retries: 2,
    retryDelay: 1000,
    credentials: 'include',    // fetch credentials mode

    // CSRF
    csrf: {
      header: 'X-CSRF-Token',
      token: '...'
    },

    // Caching
    cache: {
      strategy: 'memory',     // 'none' | 'memory' | 'session' | 'local'
      ttl: 300000              // 5 minutes
    },

    // Templates
    templates: {
      cache: true             // Cache fetched .tpl HTML in memory (default: true)
    },

    // Router
    router: {
      useHash: false,          // true = hash mode, false = history mode (default)
      base: '/',               // URL prefix (history mode); $route.path excludes it. <base href> is not read
      scrollBehavior: 'top',  // 'top' | 'preserve' | 'smooth'
      templates: 'pages',       // Default base path for file-based routing (default: 'pages'); use '/pages' in history mode so deep links resolve
      ext: '.tpl',             // Default file extension for file-based routing (default: '.tpl')
      suppressHashWarning: false, // Suppress hash-in-history-mode console warning
      focusBehavior: 'none',     // Focus management after navigation: 'none' | (future options)
      viewTransition: true       // Enable View Transition API for route changes (default: true)
    },
    // Note: Anchor links (href="#id") are automatically
    // intercepted in both modes — they scroll to the target
    // element without triggering route navigation.

    // i18n
    i18n: {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      detectBrowser: true,
      supportedLocales: ['en', 'es', 'pt'], // Locales to match against for detection (default: [])
      loadPath: '/locales/{locale}.json',  // Load from external JSON (default: null)
      ns: ['common'],           // Namespaces to preload (default: [])
      cache: true,              // Cache fetched locale files (default: true)
      persist: false,            // Persist selected locale to localStorage (default: false)
      escapeParams: false,       // HTML-escape t-* params in t-html translations (default: false)
      strictLocale: false        // Ignore a persisted locale not in supportedLocales (default: false)
    },

    // Debugging
    debug: true,               // Logs directive processing
    devtools: true,            // Enables browser devtools panel

    // Security
    sanitize: true,                       // Sanitize bind-html (default: true)
    dangerouslyDisableSanitize: false,    // Bypass ALL sanitization (not recommended)
    strictBindings: false,                // Opt-in: reject bind-on* handlers, sanitize bind-srcdoc (default: false)

    // Performance
    exprCacheSize: 500,        // Max entries in the expression/statement LRU caches
    maxEventListeners: 100,    // Max listeners per event on the NoJS event bus (default: 100)

    // App identity
    appId: '',                 // Application identifier (exposed via devtools)
  });
</script>
```

### `devtools`

**Type:** `boolean` | **Default:** `false`

Enables the No.JS browser devtools integration. When `true`, framework state, directive processing, and route navigation are exposed via `window.__NOJS_DEVTOOLS__` for debugging.

> **Security:** `window.__NOJS_DEVTOOLS__` and its command listener are installed only on local hosts (`localhost`, `127.0.0.1`, `0.0.0.0`, `*.localhost`, and pages with an empty hostname such as `file://`). On any other hostname, `devtools: true` logs a console warning and the devtools API is not exposed. **However, `nojs:devtools` events (context creation and updates, store creation, fetch URLs, route navigation) are still dispatched on `window`, where any script on the page can read them.** Do not ship `devtools: true` to production, or also set `strictDevtools: true` (see below).

### `strictDevtools`

**Type:** `boolean` | **Default:** `false`

By default, the localhost restriction above applies to `window.__NOJS_DEVTOOLS__` and its command listener only, as in v1.21.1. `nojs:devtools` events follow `devtools` on any host. Store snapshots (`__NOJS_DEVTOOLS__.stores`, `inspect:store`, `inspect:element`) show every key, the `config` getter returns `headers` and `csrf` as configured, and the `get:config` command returns `headers` as the string `'[REDACTED]'` with `csrf.token` redacted. `ctx:updated` events show the values of keys containing `token`, `password`, `secret`, `key`, `auth`, `credential` or `session` as `[REDACTED]`.

Set `strictDevtools: true` to harden devtools:

- `nojs:devtools` events and context ids are also restricted to local hosts, so `devtools: true` on a production hostname emits nothing.
- Sensitive names are matched by word rather than by substring: `token`, `accessToken`, `api_key`, `apiKey`, `password`, `secret`, `session`, `sessionId`, `auth`, `authorization`, `credentials`, `cookie` and similar names are redacted, while `author`, `keyboard`, `keywords`, `sort_key` and `tokenCount` are not.
- Store and element snapshots, `__NOJS_DEVTOOLS__.globals`, the `options` of `__NOJS_DEVTOOLS__.plugins` and the values in `ctx:updated` events are redacted at every depth (nested objects and arrays included). The snapshots are copies; circular references appear as `[Circular]`.
- The `config` getter returns `headers` with sensitive headers (including the configured `csrf.header`) redacted per key, and `csrf.token` as `[REDACTED]` when a token is set. `get:config` keeps returning `headers` as the string `'[REDACTED]'`.
- `fetch:success` and `fetch:error` devtools events carry the URL without its `#fragment` and with the values of sensitive query parameters replaced by `[REDACTED]`.

```html
<script>
  NoJS.config({ devtools: true, strictDevtools: true });
</script>
```

### Opt-in hardening flags

Stricter security behaviors are opt-in so that apps built on v1.21.1 keep working unchanged. Every flag defaults to `false` (v1.21.1 behavior) and can be set through `NoJS.config()`. Most flags take effect immediately, before or after `init()`. `strictDirectives` applies to the directive registrations made after it is set, and `i18n.strictLocale` only to the `NoJS.i18n()` call that restores the persisted locale. `strictBindings` is read when each binding initializes, so set it before `NoJS.init()`; once `true`, it cannot be turned off after `init()`.

| Flag | Default | When `true` |
|------|---------|-------------|
| `scopeHeaders` | `false` | Global `config({ headers })` are sent only to trusted origins (the page, the `baseApiUrl` origin and the origin of the nearest `base` attribute) instead of with every request. Per-request `headers` still apply to any origin. See [Data Fetching](data-fetching.md). |
| `strictRedaction` | `false` | Untrusted interceptors and `fetch:success` / `fetch:error` / `error` event payloads receive stricter redaction: the `csrf.header` name is withheld and cannot be overridden, response headers that are sensitive as request headers are stripped, and URLs drop their `#fragment` and have the values of sensitive query parameters replaced by `[REDACTED]`. Parameter names are matched by word, so `author` or `keyword` stay intact. See [Plugins → Trusted Interceptors](plugins.md#trusted-interceptors). |
| `strictDirectives` | `false` | `NoJS.directive()` and `app.directive()` reject directive names covered by a core wildcard (`on:*`, `bind-*`, `class-*`, `style-*`). The core registry is frozen as soon as No.JS loads, so the flag applies to every registration made while it is set, before or after `init()`. Set it before any `NoJS.directive()` or `NoJS.use()` call. See [Plugins → Directive Registry Freezing](plugins.md#directive-registry-freezing). |
| `strictDevtools` | `false` | Devtools events and context ids are also limited to local hosts, devtools snapshots and `ctx:updated` values redact sensitive names at every depth, the `config` getter redacts headers per key, and devtools fetch events redact tokens in URLs. See [`strictDevtools`](#strictdevtools). |
| `strictJsonld` | `false` | `page-jsonld` placeholders inside JSON strings are always escaped as JSON string content, so a value cannot end the string or add keys, and a value with `"`, `\` or a line break no longer makes the output invalid JSON. `<` in values is written as `\u003c`. By default the output is the v1.21.1 output byte-for-byte, so untrusted data in quoted placeholders can still inject keys. Takes effect on the next render. See [Head Management](head-management.md#page-jsonld). |
| `strictBindings` | `false` | Opt-in hardening for `bind-*`. When `true`, inline event-handler attributes are rejected (`bind-onclick`, `bind-onerror`, `bind-OnMouseOver` — any `bind-on*` name without a hyphen; `bind-onboarding-step` still binds) with a `[Security]` warning, and `bind-srcdoc` values go through the `bind-html` sanitizer (or your `sanitizeHtml` function). Read when each binding initializes — set it before `NoJS.init()`. Once `true`, it cannot be set back to `false` after `init()`. See [Data Binding](data-binding.md). |
| `templates.pageRelative` | `false` | `<template src>` resolves against the page and ignores the nearest `base` attribute and `baseApiUrl`. Absolute URLs and `./` paths inside a remote template behave the same in both modes. See [Templates](templates.md#how-src-is-resolved). |
| `i18n.escapeParams` | `false` | `t-*` param values in `t-html` translations are HTML-escaped before interpolation. Plain `t` is not affected. Changing it after `init()` re-renders active translations. See [Internationalization](i18n.md). |
| `i18n.strictLocale` | `false` | A persisted `nojs-locale` that is not listed in a non-empty `supportedLocales` is ignored when `NoJS.i18n()` restores it: the stale value is removed from `localStorage` and the locale falls back to browser detection or `defaultLocale`. Pass it in that `NoJS.i18n()` call, or set it with `config()` before the call; setting it afterwards has no effect. |

```html
<script>
  NoJS.config({
    scopeHeaders: true,
    strictRedaction: true,
    strictBindings: true,
    templates: { pageRelative: true },
    i18n: { escapeParams: true }
  });
</script>
```

---

## Pre-initializing Stores

Use `stores` in `NoJS.config()` to create multiple global stores before the DOM is processed.
This is useful when stores need to exist before any HTML directive runs — for example, when setting auth state from a JWT, or hydrating from `localStorage`.

```html
<script>
  NoJS.config({
    stores: {
      auth:  { user: null, token: localStorage.getItem('token') },
      cart:  { items: [], total: 0 },
      theme: { mode: 'dark', accent: 'blue' }
    }
  });
</script>
```

Stores created via `config()` behave exactly like those declared with the `store` HTML attribute — they are reactive contexts accessible via `$store.name` in expressions and `NoJS.store.name` in JavaScript.

If a store name already exists, `config()` will **not** overwrite it. This means you can safely call `config()` multiple times without resetting store data.

---

## Request Interceptors

```html
<script>
  // Before every request
  NoJS.interceptor('request', (url, options) => {
    options.headers['X-Request-ID'] = crypto.randomUUID();
    return options;
  });

  // After every response
  NoJS.interceptor('response', (response, url) => {
    if (response.status === 401) {
      NoJS.store.auth.user = null;
      NoJS.notify(); // flush DOM bindings before redirect
      NoJS.router.push('/login');
      throw new Error('Unauthorized');
    }
    return response;
  });
</script>
```

---

## Security

### XSS Protection

- `bind` always sets `textContent`, never `innerHTML` — safe by default.
- `bind-html` sanitizes content using a DOMParser-based structural sanitizer. Regex-based sanitizers are bypassable via SVG/MathML event handlers and entity encoding — DOMParser resolves entities first, making all vectors uniformly detectable.
- Template expressions are evaluated by a custom sandboxed parser — no `eval()` or `Function()` is used, and dangerous properties like `__proto__` and `constructor` are blocked.
- `bind-*` writes any attribute by default, including inline handlers (`bind-onclick`) and iframe documents (`bind-srcdoc`), exactly as in v1.21.1. Enable `strictBindings: true` to reject `bind-on*` handlers and sanitize `bind-srcdoc` like `bind-html`. See [Data Binding](data-binding.md).

#### Custom sanitizer hook (`sanitizeHtml`)

To use an external sanitizer like [DOMPurify](https://github.com/cure53/DOMPurify) instead of the built-in one:

```js
NoJS.config({
  sanitizeHtml: (html) => DOMPurify.sanitize(html)
});
```

When `sanitizeHtml` is set to a function, the built-in sanitizer is bypassed entirely and the provided function is used for all `bind-html` content. Set `dangerouslyDisableSanitize: true` to disable sanitization entirely (not recommended — see [Security](#security)).

> **Note:** The `sanitize`, `dangerouslyDisableSanitize`, and `sanitizeHtml` config keys are **locked after `init()`** completes. Calling `NoJS.config()` after initialization will not change these values — this prevents plugins or late-running scripts from weakening the security posture.

The built-in sanitizer blocks the following tags by default: `script`, `style`, `iframe`, `object`, `embed`, `base`, `form`, `meta`, `link`, `noscript`. It also strips `on*` event handler attributes and `javascript:`/`vbscript:` scheme attributes on any element, and `data:` URIs on URL attributes (`href`, `src`, `action`) unless they are safe image types.

### CSRF Protection

```html
<script>
  NoJS.config({
    csrf: {
      header: 'X-CSRF-Token',
      token: document.querySelector('meta[name="csrf-token"]').content
    }
  });
</script>
```

### Content Security Policy

No.JS uses a custom expression parser that is fully CSP-compliant — no `eval()` or `Function()` constructor is used. No `unsafe-eval` directive is required in your Content Security Policy.

---

### `templates.cache`

**Type:** `boolean` | **Default:** `true`

Controls whether the HTML content of remotely-fetched `.tpl` files is stored in an in-memory `Map` after the first request. On repeated navigations to the same route, the cached HTML is used directly — no HTTP request is made. The cache lives for the duration of the page session (no TTL — template assets are static, not data).

```js
// Disable template caching (always re-fetch .tpl files)
NoJS.config({ templates: { cache: false } });

// Default — caching is on, no configuration needed
NoJS.config({ templates: { cache: true } });
```

Set to `false` during local development if you want changes to `.tpl` files to be reflected without a hard page reload.

---

### `i18n.loadPath`

**Type:** `string | null` | **Default:** `null`

URL template for loading locale JSON files via `fetch`. Use `{locale}` and optionally `{ns}` as placeholders. When `null`, translations must be provided inline via `NoJS.i18n({ locales })`.

```js
NoJS.i18n({
  loadPath: '/locales/{locale}.json'          // Flat mode
  loadPath: '/locales/{locale}/{ns}.json'   // Namespace mode
});
```

### `i18n.ns`

**Type:** `string[]` | **Default:** `[]`

Array of namespace identifiers to preload at `init()`. Each namespace corresponds to a separate JSON file per locale. Additional namespaces can be loaded on-demand via the `i18n-ns` directive or route attribute.

```js
NoJS.i18n({
  loadPath: '/locales/{locale}/{ns}.json',
  ns: ['common', 'auth']
});
```

### `i18n.cache`

**Type:** `boolean` | **Default:** `true`

Controls whether fetched locale JSON files are stored in an in-memory `Map` after the first request. Set to `false` during development for hot-reload of translation files.

```js
NoJS.i18n({ cache: false }); // Always re-fetch locale files
```

### `i18n.supportedLocales`

**Type:** `string[]` | **Default:** `[]`

The list of locale codes your application ships. This option is **required to enable `detectBrowser` when using `loadPath`** (lazy locale files): at the moment detection runs no bundles have been fetched yet, so No.JS needs an explicit list to match the browser language against.

When inline `locales` are provided instead, detection can match against the loaded bundle keys directly and `supportedLocales` is optional.

On the visitor's first load, the locale is resolved in this priority order:

1. A persisted `nojs-locale` in `localStorage` (when `persist: true`). It is restored even when it is not listed in `supportedLocales`, unless [`i18n.strictLocale`](#i18nstrictlocale) is `true`.
2. The detected browser language (`navigator.language`), if it is listed in `supportedLocales`
3. `defaultLocale`

```js
NoJS.i18n({
  loadPath: '/locales/{locale}.json',
  supportedLocales: ['en', 'es', 'pt', 'it', 'fr'],
  detectBrowser: true,
  persist: true,
  defaultLocale: 'en'
});
```

---

### `exprCacheSize`

**Type:** `number` | **Default:** `500`

Maximum number of entries in each of the two internal LRU caches used by the expression evaluator: one for parsed expression ASTs (`_exprCache`) and one for parsed statement ASTs (`_stmtCache`). When the limit is reached the least-recently-used entry is evicted to make room.

The default of 500 is suitable for most applications. Increase it if your app evaluates a large number of distinct template expressions (e.g. a dynamic form with hundreds of unique field bindings). Decrease it to reduce memory pressure in memory-constrained environments.

```js
// Larger cache for apps with many distinct expressions
NoJS.config({ exprCacheSize: 1000 });

// Smaller cache for memory-constrained environments
NoJS.config({ exprCacheSize: 100 });
```

Non-positive or non-numeric values are ignored and the default of 500 is used.

---

### `maxEventListeners`

**Type:** `number` | **Default:** `100`

Maximum number of listener functions allowed per event name on the NoJS event bus (`NoJS.on()`). When the limit is reached, a `MaxListenersExceeded` warning is logged and the new listener is still registered. Increase this if your application legitimately uses many listeners for the same event (e.g. a plugin-heavy setup).

---

### `appId`

**Type:** `string` | **Default:** `""`

An optional application identifier. Exposed via the devtools panel for distinguishing between multiple NoJS instances or environments.

---

### `i18n.persist`

**Type:** `boolean` | **Default:** `false`

When `true`, the currently selected locale is persisted to `localStorage`. On the next page load, the persisted locale is restored automatically — useful for remembering a user's language preference across sessions.

```js
NoJS.i18n({ persist: true });
```

---

### `i18n.strictLocale`

**Type:** `boolean` | **Default:** `false`

Opt-in hardening. When `true`, a persisted `nojs-locale` that is not listed in a non-empty `supportedLocales` is ignored when `NoJS.i18n()` restores it (a stale value from an older deploy, or one written by another script on the same origin). The value is removed from `localStorage` and the locale falls through to browser detection and `defaultLocale`. A debug-only message is logged with `debug: true`. With an empty `supportedLocales`, every persisted locale is still restored.

By default (`false`), the persisted locale is always restored, as in v1.21.1.

The check runs inside the `NoJS.i18n()` call that restores the persisted locale: pass the flag in that call, or set it with `NoJS.config({ i18n: { strictLocale: true } })` before it. Setting it afterwards has no effect until the next `NoJS.i18n()` call.

```js
NoJS.i18n({
  supportedLocales: ['en', 'pt'],
  persist: true,
  strictLocale: true
});
```

---

### `i18n.escapeParams`

**Type:** `boolean` | **Default:** `false`

Opt-in hardening. When `true`, values passed through `t-*` params to a `t-html` translation are HTML-escaped (`& < > " '`) before interpolation, so only the translation string itself is rendered as HTML. Plain `t` (without `t-html`) always renders text and is not affected. Changing the flag after `init()` (through `NoJS.config()` or `NoJS.i18n()`) re-renders active translations immediately.

By default (`false`), params are inserted as-is and the combined result is sanitized, as in v1.21.1. See [Internationalization → Params in `t-html`](i18n.md#params-in-t-html-i18nescapeparams) for the trade-offs, double escaping, and what the flag does not cover.

```js
NoJS.config({ i18n: { escapeParams: true } });
// or
NoJS.i18n({ escapeParams: true });
```

---

## Event Bus Events

The NoJS event bus (`NoJS.on()`) emits the following framework events. Use `NoJS.on(event, callback)` to subscribe; the returned function unsubscribes the listener.

| Event | Payload | When |
|-------|---------|------|
| `fetch:success` | `{ url, data }` | An HTTP directive (`get`/`post`/etc.) or `call` received a successful response |
| `fetch:error` | `{ url, error }` | An HTTP directive or `call` failed (network error or non-ok status) |
| `error` | `{ url, error }` | Emitted right after `fetch:error`, with the same payload — the [global error handler](error-handling.md#global-error-handler) hook |
| `fetch:end` | `{ url }` | A paginated `get` (`get-trigger` + `get-insert`) reached the end of its data, and pagination stopped. It is not emitted for other requests |
| `plugins:ready` | _(none)_ | All registered plugins have been initialized during `NoJS.init()` |

```js
NoJS.on('fetch:success', ({ url }) => console.log('loaded', url));
NoJS.on('fetch:error', ({ url, error }) => console.warn(url, error.message));
NoJS.on('fetch:end', ({ url }) => { /* no more pages for this list */ });
```

No other events are emitted on the bus: there are no store-change, navigation, locale or dispose events. Use these instead:

- **Store changes** — `NoJS.store.cart.$watch(fn)` (returns an unsubscribe function), or the [`watch`](state-management.md) directive in HTML.
- **Navigation** — `NoJS.router.on(fn)`: `fn` receives `router.current` after each navigation, and the call returns an unsubscribe function. To block a navigation, use a route `guard`.
- **Teardown** — a plugin's `dispose` hook.

---

## Plugin System

No.JS includes a plugin system for extending the framework with reusable packages. The following methods are available on the `NoJS` object:

| Method | Description |
| ------ | ----------- |
| `NoJS.use(plugin, options?)` | Register a plugin. Accepts an object with `{ name, install }` or a named function |
| `NoJS.global(name, value)` | Inject a reactive variable accessible as `$name` in templates |
| `NoJS.dispose()` | Full app teardown — disposes plugins in reverse order, clears globals and interceptors |
| `NoJS.CANCEL` | Sentinel Symbol — return from a request interceptor to abort the request |
| `NoJS.RESPOND` | Sentinel Symbol — return from a request interceptor to serve a cached response |
| `NoJS.REPLACE` | Sentinel Symbol — return from a response interceptor to replace the response data |

See [Plugins →](plugins.md) for the full API reference, plugin lifecycle, security guidelines, and examples.

---

## See Also

- [Plugins](plugins.md) — full plugin system reference
- [Data Fetching](data-fetching.md) — interceptors, caching, retry configuration
- [Error Handling](error-handling.md) — global error handler via `NoJS.on()`

---

**Previous:** [Error Handling ←](error-handling.md) | **Next:** [Playground →](playground.md)
