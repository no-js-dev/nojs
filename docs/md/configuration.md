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
      base: '/',
      scrollBehavior: 'top',  // 'top' | 'preserve' | 'smooth'
      templates: 'pages',       // Default base path for file-based routing (default: 'pages')
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
      persist: false             // Persist selected locale to localStorage (default: false)
    },

    // Debugging
    debug: true,               // Logs directive processing
    devtools: true,            // Enables browser devtools panel

    // Security
    sanitize: true,                       // Sanitize bind-html (default: true)
    dangerouslyDisableSanitize: false,    // Bypass ALL sanitization (not recommended)

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

> **Security:** Devtools activation is restricted to **localhost environments only** (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost`). Setting `devtools: true` on a production hostname is silently ignored with a console warning.

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

1. A persisted `nojs-locale` in `localStorage` (when `persist: true`)
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

## Event Bus Events

The NoJS event bus (`NoJS.on()`) emits the following framework events. Use `NoJS.on(event, callback)` to subscribe; the returned function unsubscribes the listener.

| Event | Payload | When |
|-------|---------|------|
| `fetch:success` | `{ url, data }` | An HTTP directive (`get`/`post`/etc.) received a successful response |
| `fetch:error` | `{ url, error }` | An HTTP directive failed (network error or non-ok status) |
| `fetch:end` | `{ url }` | An HTTP request completed (success or failure) — useful for spinners or progress bars |
| `plugins:ready` | _(none)_ | All registered plugins have been initialized during `NoJS.init()` |

```js
// Example: global loading indicator
let activeRequests = 0;
NoJS.on('fetch:success', () => { activeRequests--; updateSpinner(); });
NoJS.on('fetch:error', () => { activeRequests--; updateSpinner(); });
NoJS.on('fetch:end', () => { /* always fires, regardless of outcome */ });
```

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
