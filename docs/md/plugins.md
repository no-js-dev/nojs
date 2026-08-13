# Plugins

The plugin system lets you extend No.JS with reusable packages — analytics, auth, feature flags, UI libraries — without modifying the core framework. Plugins can register interceptors, inject reactive globals, add custom directives, and hook into the app lifecycle.

## `NoJS.use()`

Register a plugin before or after `NoJS.init()`. If the app is already initialized, the plugin's `init` hook runs immediately.

```html
<script>
  NoJS.use(analyticsPlugin);
  NoJS.use(authPlugin, { trusted: true });
</script>
```

### Object Form

The standard way to define a plugin:

```html
<script>
  const analyticsPlugin = {
    name: 'analytics',
    version: '1.0.0',
    capabilities: ['interceptor', 'global'],

    install(app, options) {
      // Called immediately by NoJS.use()
      // Register interceptors, globals, directives, etc.
      app.global('analytics', { pageViews: 0 });

      app.interceptor('response', (response, url) => {
        app.store.analytics?.track('api_call', { url });
        return response;
      });
    },

    init(app) {
      // Called after NoJS.init() completes
      // Safe to access the DOM, router, stores
      console.log('Analytics ready');
    },

    dispose(app) {
      // Called during NoJS.dispose()
      // Clean up timers, listeners, connections
      console.log('Analytics disposed');
    }
  };

  NoJS.use(analyticsPlugin);
</script>
```

### Function Shorthand

For simple plugins, pass a named function. The function name becomes the plugin name:

```html
<script>
  function myLogger(app, options) {
    app.interceptor('request', (url, opts) => {
      console.log(`[${options.prefix || 'LOG'}]`, url);
      return opts;
    });
  }

  NoJS.use(myLogger, { prefix: 'API' });
</script>
```

> Anonymous functions and arrow functions are rejected — the plugin must have a name.

### Options

The second argument to `NoJS.use()` is passed to the plugin's `install` function:

```html
<script>
  NoJS.use(analyticsPlugin, {
    trackingId: 'UA-123456',
    debug: true
  });
</script>
```

The `trusted` option is special — see [Trusted Interceptors](#trusted-interceptors) below.

---

## Plugin Interface

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `name` | `string` | Yes | Unique identifier. Duplicate names are rejected |
| `version` | `string` | No | Semver string for debugging |
| `capabilities` | `string[]` | No | Declared capabilities (logged in debug mode) |
| `install` | `function(app, options)` | Yes | Called synchronously by `NoJS.use()` |
| `init` | `function(app)` | No | Called after `NoJS.init()` completes (DOM is ready) |
| `dispose` | `function(app)` | No | Called during `NoJS.dispose()` for cleanup |

### Lifecycle

```
NoJS.use(plugin)     →  plugin.install(app, options)
NoJS.init()          →  ... DOM processed ...  →  plugin.init(app)
NoJS.dispose()       →  plugin.dispose(app)  →  ... teardown ...
```

- `install` runs immediately and synchronously. Use it to register interceptors, globals, directives, event listeners, and stores.
- `init` runs after the DOM is processed and the router is active. Use it for work that depends on rendered elements or route state.
- `dispose` runs during app teardown. Use it to close WebSocket connections, clear intervals, flush pending analytics, etc.

### Duplicate Detection

A plugin name can only be registered once. If `NoJS.use()` is called again with the same name but a different object, a warning is logged and the call is ignored:

```html
<script>
  NoJS.use(pluginA);     // installed
  NoJS.use(pluginA);     // silently skipped (same object)
  NoJS.use(pluginB);     // warning: name collision (different object, same name)
</script>
```

### Directive Registry Freezing

Core directives (`state`, `bind`, `get`, `on:*`, etc.) are frozen after the framework loads. Plugins can register new directives via `app.directive()` but cannot override built-in ones:

```html
<script>
  const myPlugin = {
    name: 'charts',
    install(app) {
      app.directive('chart', {            // ✅ new directive — allowed
        priority: 25,
        init(el, name, value) { /* ... */ }
      });
      app.directive('bind', { /* ... */ }); // ❌ core directive — warning, ignored
    }
  };
</script>
```

---

## `NoJS.global()`

Inject a reactive variable accessible as `$name` in any template expression.

```html
<script>
  NoJS.global('theme', { mode: 'dark', accent: 'blue' });
</script>

<span bind="$theme.mode"></span>
<button on:click="$theme.mode = $theme.mode === 'dark' ? 'light' : 'dark'">
  Toggle
</button>
```

### Naming Conventions

- Global names are accessed with a `$` prefix in templates: `NoJS.global('foo', ...)` becomes `$foo`.
- Use your plugin name as a namespace to avoid collisions: `$analytics`, `$auth`, `$featureFlags`.

### Reserved Names

The following names cannot be used with `NoJS.global()`:

`store`, `route`, `router`, `i18n`, `refs`, `form`, `parent`, `watch`, `set`, `notify`, `raw`, `isProxy`, `listeners`, `app`, `config`, `env`, `debug`, `version`, `plugins`, `globals`, `el`, `event`, `self`, `this`, `super`, `window`, `document`, `toString`, `valueOf`, `hasOwnProperty`

Prototype pollution vectors (`__proto__`, `constructor`, `prototype`) are also blocked.

### Reactivity

Object values passed to `NoJS.global()` are automatically wrapped in a reactive context. Mutations trigger DOM updates just like store or state changes:

```html
<script>
  NoJS.global('user', { name: 'Guest', role: 'viewer' });
</script>

<!-- Updates reactively when $user.name changes -->
<span bind="$user.name"></span>
```

### Ownership Tracking

When a plugin registers a global during its `install` phase, it becomes the owner. If a different plugin overwrites that global, a warning is logged:

```
[No.JS] Global "$theme" owned by "ui-kit" is being overwritten.
```

---

## Interceptor Sentinels

Request interceptors can return special objects keyed by sentinel Symbols to control the fetch pipeline.

### `NoJS.CANCEL` — Abort the Request

Return an object with `[NoJS.CANCEL]: true` to prevent the request from being sent. The fetch throws an `AbortError`.

```html
<script>
  NoJS.use({
    name: 'offline-guard',
    install(app) {
      app.interceptor('request', (url, opts) => {
        if (!navigator.onLine) {
          return { [app.CANCEL]: true };
        }
        return opts;
      });
    }
  });
</script>
```

### `NoJS.RESPOND` — Serve a Cached Response

Return an object with `[NoJS.RESPOND]: data` to short-circuit the request and return `data` directly as the response. No HTTP request is made.

```html
<script>
  const cache = new Map();

  NoJS.use({
    name: 'cache-plugin',
    install(app) {
      app.interceptor('request', (url, opts) => {
        if (opts.method === 'GET' && cache.has(url)) {
          return { [app.RESPOND]: cache.get(url) };
        }
        return opts;
      });

      app.interceptor('response', (response, url) => {
        // Cache successful responses by URL
        if (response.ok) {
          cache.set(url, response);
        }
        return response;
      });
    }
  });
</script>
```

### `NoJS.REPLACE` — Replace Response Data

Return an object with `[NoJS.REPLACE]: data` from a **response** interceptor to replace the parsed response body with custom data.

```html
<script>
  NoJS.use({
    name: 'transform-plugin',
    install(app) {
      app.interceptor('response', (response, url) => {
        if (url.includes('/users')) {
          // Replace the response with a normalized shape
          return {
            [app.REPLACE]: {
              timestamp: Date.now(),
              source: url
            }
          };
        }
        return response;
      });
    }
  });
</script>
```

### Summary

| Sentinel | Used In | Effect |
| -------- | ------- | ------ |
| `NoJS.CANCEL` | Request interceptor | Aborts the request (throws `AbortError`) |
| `NoJS.RESPOND` | Request interceptor | Returns data directly, skips HTTP call |
| `NoJS.REPLACE` | Response interceptor | Replaces the parsed response body |

---

## Trusted Interceptors

By default, interceptors receive **redacted** copies of requests and responses — sensitive headers (`Authorization`, `Cookie`, `X-API-Key`, etc.) and URL parameters matching `token`, `key`, `secret`, `auth`, `password`, or `credential` are stripped or replaced with `[REDACTED]`.

Auth plugins that need access to the real headers can be installed with `{ trusted: true }`:

```html
<script>
  NoJS.use(authPlugin, { trusted: true });
</script>
```

Trusted interceptors receive the full, unredacted request options and response object.

> A console warning is logged when a plugin is installed with trusted access. Only grant `trusted` to plugins you control or have audited.

### Redacted Headers

**Request** (stripped before passing to untrusted interceptors):
`authorization`, `x-api-key`, `x-auth-token`, `cookie`, `proxy-authorization`, `set-cookie`, `x-csrf-token`

> Headers matching the pattern `x-auth-*` or `x-api-*` are also redacted.

**Response** (stripped from the response proxy):
`set-cookie`, `x-csrf-token`, `x-auth-token`, `www-authenticate`, `proxy-authenticate`

> Headers matching the pattern `x-auth-*` or `x-api-*` are also redacted.

---

## `NoJS.dispose()`

Tears down the entire application: disposes plugins, clears globals, and removes interceptors.

```html
<script>
  // Full app teardown
  await NoJS.dispose();
</script>
```

### Disposal Order

1. Plugins are disposed in **reverse** installation order (last installed, first disposed).
2. Each plugin's `dispose` function is given a **3-second timeout**. If it exceeds the timeout, an error is logged and disposal continues with the next plugin.
3. After all plugins are disposed, globals and interceptors are cleared.

```
NoJS.dispose()
  → pluginC.dispose()   (last installed)
  → pluginB.dispose()
  → pluginA.dispose()   (first installed)
  → clear globals
  → clear interceptors
```

### Async Dispose

Plugin `dispose` functions can be async. The framework awaits each one (subject to the 3-second timeout):

```html
<script>
  const analyticsPlugin = {
    name: 'analytics',
    install(app) { /* ... */ },
    async dispose(app) {
      await flushPendingEvents();   // Runs within 3s timeout
    }
  };
</script>
```

> Plugins cannot be installed during disposal. Calls to `NoJS.use()` while `dispose()` is running are ignored with a warning.

<!-- -->

> **Note:** The 3-second timeout protects against long-running async dispose operations. Synchronous infinite loops cannot be interrupted — this is a fundamental JavaScript limitation. Plugin authors must ensure their `dispose()` functions do not block the main thread.

---

## Security Guidelines

When authoring plugins, follow these practices:

### Namespace Everything

Prefix globals, stores, and event names with your plugin name to avoid collisions:

```js
// ✅ Good
app.global('myPlugin', { ... });
app.on('myPlugin:ready', fn);

// ❌ Bad
app.global('data', { ... });
app.on('ready', fn);
```

### Never Use `eval` or `Function`

Values passed to `NoJS.global()` are checked for dangerous references. `eval` and `Function` are blocked:

```js
// ❌ Rejected
app.global('run', eval);
app.global('exec', Function);
```

### Clean Up in `dispose`

Always provide a `dispose` hook that clears intervals, closes connections, and removes event listeners:

```js
const myPlugin = {
  name: 'heartbeat',
  _interval: null,
  install(app) {
    this._interval = setInterval(() => fetch('/ping'), 30000);
  },
  dispose() {
    clearInterval(this._interval);
  }
};
```

### Avoid Overwriting Others' Globals

If your plugin detects that a global is already owned by another plugin, consider logging a warning or using a different name rather than silently overwriting.

### Validate Options

Check required options in `install` and warn early:

```js
install(app, options) {
  if (!options.apiKey) {
    console.warn('[my-plugin] Missing required option: apiKey');
    return;
  }
}
```

---

## Complete Example

A full analytics plugin demonstrating the plugin lifecycle, globals, interceptors, and disposal:

```html
<script>
  const analyticsPlugin = {
    name: 'analytics',
    version: '1.0.0',
    capabilities: ['interceptor', 'global'],

    _queue: [],
    _flushInterval: null,

    install(app, options) {
      const trackingId = options.trackingId;
      if (!trackingId) {
        console.warn('[analytics] Missing trackingId option');
        return;
      }
      this._trackingId = trackingId;

      // Inject reactive global
      app.global('analytics', {
        pageViews: 0,
        events: []
      });

      // Track all API calls
      app.interceptor('response', (response, url) => {
        this._queue.push({
          type: 'api_call',
          url,
          status: response.status,
          timestamp: Date.now()
        });
        return response;
      });

      // Flush events periodically
      this._flushInterval = setInterval(() => {
        this._flush(trackingId);
      }, options.flushInterval || 10000);
    },

    init(app) {
      // Track initial page view after DOM is ready
      this._queue.push({
        type: 'page_view',
        path: location.pathname,
        timestamp: Date.now()
      });
    },

    async dispose(app) {
      clearInterval(this._flushInterval);
      // Flush remaining events before shutdown
      await this._flush(this._trackingId);
    },

    _flush(trackingId) {
      if (this._queue.length === 0) return;
      const events = this._queue.splice(0);
      return fetch('/analytics/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId, events })
      }).catch(() => {
        // Re-queue on failure
        this._queue.unshift(...events);
      });
    }
  };

  NoJS.use(analyticsPlugin, { trackingId: 'UA-123456' });
</script>

<!-- Use the injected global in templates -->
<span bind="$analytics.pageViews + ' page views'"></span>
```

---

## Compiler Support — Parser Exports (ADR-024)

Three named exports give offline tooling (compilers, linters, bundler plugins) direct access to the No.JS expression parser without running the framework. They bypass the runtime LRU caches so they never interfere with a live app.

```js
import { parseExpression, parseStatements, segmentPipes } from '@no-js-dev/nojs/src/index.js';
```

### `segmentPipes(str)`

Split a raw directive value into its expression segment and zero or more pipe-filter segments. Pipes inside strings, template literals, brackets, and `||` operators are preserved — only top-level `|` delimiters are split.

**Always call `segmentPipes` before `parseExpression`** so that filter syntax is stripped before parsing.

Returns `string[]`. Empty/null input returns `[]`.

```js
segmentPipes('user.name | uppercase | truncate:20');
// → ['user.name', 'uppercase', 'truncate:20']

segmentPipes('a || b');
// → ['a || b']  — logical OR is NOT a pipe
```

### `parseExpression(str)`

Parse a single No.JS expression into an AST node. Supports the full expression grammar: identifiers, member access (dot and computed), optional chaining, arithmetic, comparison, logical, ternary, template literals, arrow functions, spread, `typeof`, `in`, assignment operators, and postfix `++`/`--`.

Prototype-chain property access (`constructor`, `__proto__`, `prototype`) produces `{ type: 'Forbidden' }` nodes — compilers must treat these as hard errors.

Returns an AST node object. Empty/null input returns `{ type: 'Literal', value: undefined }`.

```js
parseExpression('user.name');
// → { type: 'MemberExpr', object: { type: 'Identifier', name: 'user' }, ... }

parseExpression('obj.__proto__');
// → { type: 'Forbidden' }
```

### `parseStatements(str)`

Parse a semicolon-separated statement string (as used in `on:click`, `watch`) into an array of AST nodes. Uses the same grammar as `parseExpression` but handles multiple statements.

Returns `AST[]`.

```js
parseStatements('count++; name = "hello"');
// → [{ type: 'PostfixExpr', ... }, { type: 'AssignExpr', ... }]
```

## See Also

- [Custom Directives](custom-directives.md) — simpler extension point for single-attribute behaviors
- [Configuration](configuration.md) — `NoJS.use()`, `NoJS.global()`, `NoJS.dispose()` overview
- [Data Fetching](data-fetching.md) — interceptor sentinels (CANCEL, RESPOND, REPLACE)

---

**Previous:** [Custom Directives ←](custom-directives.md) | **Next:** [Error Handling →](error-handling.md)
