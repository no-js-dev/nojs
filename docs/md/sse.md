# Server-Sent Events (SSE)

No.JS makes real-time streaming declarative. Add `sse` to an HTML element and incoming server-pushed messages are automatically parsed and bound to a reactive context variable — no JavaScript required. The browser-native `EventSource` API handles connection management, automatic reconnection, and `Last-Event-ID` resumption under the hood.

Use SSE when the server needs to push data to the client: live dashboards, notification feeds, stock tickers, log viewers, chat streams, or any scenario where the server initiates updates.

---

## Basic Usage

Point `sse` at a Server-Sent Events endpoint. Incoming messages are parsed as JSON (with a raw-string fallback) and bound to the context variable named by `as`.

```html
<div sse="/api/ticker" as="quote">
  <p>Latest price: <span bind="quote.price"></span></p>
</div>
```

Each message from the server replaces the previous value of `quote`. No polling, no manual `EventSource` setup, no cleanup code.

> **Note:** When `as` is omitted, data is bound under the name `data` — the same default as the `get` directive.

---

## Connection State (`$sse`)

Every SSE element exposes a reactive `$sse` object on its context with three boolean fields:

| Field | Meaning |
|-------|---------|
| `$sse.connecting` | `true` while the connection is being established or the browser is auto-reconnecting after a transient error |
| `$sse.open` | `true` when the connection is active and receiving messages |
| `$sse.error` | `true` only when the connection has permanently closed (`readyState === CLOSED`) |

### State lifecycle

```
[created]         → { connecting: true,  open: false, error: false }
[open event]      → { connecting: false, open: true,  error: false }
[auto-reconnect]  → { connecting: true,  open: false, error: false }
[closed by server]→ { connecting: false, open: false, error: true  }
```

During browser auto-reconnection (a transient network hiccup), `$sse.error` remains `false`. The error state is reserved for terminal failures — when the server explicitly closes the stream or the connection cannot be re-established.

### Composing with `show` and `hide`

Because there is no `loading` template for SSE (the concept of "loading finished" does not map cleanly to a persistent stream), you compose state indicators using `$sse` with the existing `show`/`hide` directives:

```html
<div sse="/api/feed" as="messages" sse-insert="append">

  <p show="$sse.connecting" class="status">Connecting...</p>
  <p show="$sse.error" class="error">Connection lost.</p>

  <ul show="$sse.open" role="log" aria-live="polite">
    <li each="msg in messages" bind="msg.text"></li>
  </ul>

</div>
```

This approach is more flexible than a built-in loading template: you control exactly what shows during each state, combine states with CSS classes, or conditionally render entire sections of the page.

---

## Named Events (`sse-event`)

By default, the directive listens for the standard `message` event. If your server sends named events, use `sse-event` to listen to a specific event type:

```html
<div sse="/api/stream" sse-event="price-update" as="price">
  <span bind="price.value"></span>
</div>
```

When `sse-event` is set, the default `message` event is **not** handled. To listen to multiple event types, use separate elements:

```html
<div sse="/api/stream" sse-event="price-update" as="price">
  <p>Price: <span bind="price.value"></span></p>
</div>

<div sse="/api/stream" sse-event="volume-update" as="volume">
  <p>Volume: <span bind="volume.amount"></span></p>
</div>
```

> **Warning:** Each element opens its own `EventSource` connection. Multiple elements pointing to the same URL share the same HTTP connection at the browser level, but you should be aware of the [connection limits](#http11-connection-limit) when using many SSE elements across different origins.

---

## Insert Modes (`sse-insert`)

The `sse-insert` attribute controls how incoming messages update the context variable.

### Replace (default)

Each message replaces the previous value. Ideal for "latest value" displays like tickers, gauges, and status indicators.

```html
<div sse="/api/ticker" as="quote">
  <span bind="quote.price"></span>
</div>
```

### Append

Messages accumulate in an array, newest at the end. Ideal for chronological feeds and log viewers.

```html
<div sse="/api/feed" as="messages" sse-insert="append">
  <ul role="log" aria-live="polite">
    <li each="msg in messages" bind="msg.text"></li>
  </ul>
</div>
```

### Prepend

Messages accumulate in an array, newest at the beginning. Ideal for reverse-chronological feeds like notification lists.

```html
<div sse="/api/notifications" as="alerts" sse-insert="prepend">
  <div each="alert in alerts">
    <strong bind="alert.title"></strong>
    <p bind="alert.body"></p>
  </div>
</div>
```

---

## Array Length Cap (`sse-limit`)

Long-lived streams in append or prepend mode grow without bound. Use `sse-limit` to cap the array length and prevent unbounded memory growth:

```html
<div sse="/api/logs" as="entries"
     sse-insert="append"
     sse-limit="100">
  <div each="entry in entries" bind="entry.line"></div>
</div>
```

When the array exceeds the limit:

- **Append mode:** the oldest item (front of the array) is dropped.
- **Prepend mode:** the oldest item (end of the array) is dropped.

> **Warning:** Using `sse-insert` without `sse-limit` on a long-lived stream triggers a console warning about potential unbounded memory growth. Always set a limit for streams that run indefinitely.

> **Note:** `sse-limit` has no effect in replace mode (no array to cap). Setting it in replace mode triggers a console warning.

---

## Error Template (`error`)

Display a user-friendly message when the SSE connection permanently closes. The error template is rendered **only** when `readyState` reaches `CLOSED` — it is never shown during browser auto-reconnection.

```html
<div sse="/api/stream" as="data" error="sseFailed">
  <p bind="data.value"></p>
</div>

<template id="sseFailed" var="err">
  <div class="error-banner">
    <p bind="err.message"></p>
    <button on:click="location.reload()">Retry</button>
  </div>
</template>
```

The template receives an error object with a `message` field (`"SSE connection closed"`). The `var` attribute on the template names the variable (defaults to `"err"`).

When the error template is rendered, the element's previous content (data display) is replaced by the template content.

---

## Callback Expression (`then`)

Execute an expression each time a message is received. The parsed message data is available as `$event`:

```html
<div state="{ count: 0 }">
  <div sse="/api/notifications" as="notif"
       then="count = count + 1">
    <p>Notifications received: <span bind="count"></span></p>
    <p>Latest: <span bind="notif.title"></span></p>
  </div>
</div>
```

> **Note:** The `then` attribute on SSE elements receives the parsed message as `$event`. This differs from HTTP directives (`get`, `post`, etc.), where `then` receives the response as `result`.

---

## Store Integration (`into`)

Write incoming data to a global store so multiple components across the page can consume the same live stream:

```html
<div store="market" value="{ ticker: null }"></div>

<!-- One SSE source writes to the store -->
<div sse="/api/ticker" as="ticker" into="market" hide>
</div>

<!-- Multiple consumers read from the store -->
<div>
  <p>Price: <span bind="$store.market.ticker.price"></span></p>
</div>

<div>
  <p>Volume: <span bind="$store.market.ticker.volume"></span></p>
</div>
```

The `into` attribute performs a dual-write: the local context (`as` variable) and the global store are both updated on each message, and all store watchers are notified.

---

## Cross-Origin Credentials (`sse-credentials`)

When connecting to a cross-origin SSE endpoint that requires cookies, add the `sse-credentials` attribute:

```html
<div sse="https://api.example.com/stream"
     sse-credentials
     as="data">
  <span bind="data.value"></span>
</div>
```

This sets `withCredentials: true` on the underlying `EventSource`, causing the browser to include cookies in the cross-origin request. The server must respond with appropriate CORS headers (`Access-Control-Allow-Credentials: true` and a specific `Access-Control-Allow-Origin`, not `*`).

---

## Reactive URL Interpolation

URLs with `{expression}` placeholders automatically reconnect when the referenced value changes:

```html
<div state="{ channel: 'general' }">
  <select model="channel">
    <option value="general">General</option>
    <option value="alerts">Alerts</option>
  </select>

  <div sse="/api/chat/{channel}" as="messages" sse-insert="append">
    <div each="msg in messages" bind="msg.text"></div>
  </div>
</div>
```

When `channel` changes from `"general"` to `"alerts"`:

1. The existing connection to `/api/chat/general` is closed.
2. Accumulated data (in append/prepend mode) is **reset to an empty array**.
3. A new connection to `/api/chat/alerts` opens.

If the resolved URL is the same as the current one, no reconnection occurs.

The reactive URL watcher responds to changes in parent contexts, global stores (`$store`), the router (`$route`), and the i18n system (`$i18n`).

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `sse` | `string` | (required) | URL for the EventSource. Supports reactive `{expr}` interpolation. |
| `as` | `string` | `"data"` | Context variable name for incoming data. |
| `sse-event` | `string` | `"message"` | Named SSE event to listen for. Suppresses default `message` handling. |
| `sse-insert` | `"replace"` \| `"append"` \| `"prepend"` | `"replace"` | How incoming messages update the context variable. |
| `sse-limit` | `number` | (none) | Maximum array length in append/prepend mode. Oldest items are dropped. |
| `sse-credentials` | `boolean` (presence) | `false` | Sets `withCredentials: true` on the EventSource for cross-origin cookies. |
| `into` | `string` | (none) | Write data to a named global store (dual-write with local context). |
| `error` | `string` | (none) | Template ID to display when the connection permanently closes (`readyState === CLOSED`). |
| `then` | `string` | (none) | Expression evaluated on each message. The parsed data is available as `$event`. |

---

## Data Parsing

Each incoming SSE message is parsed using `JSON.parse()`. If parsing fails, the raw string value is used as-is:

```
data: {"price": 42.5}          → object {price: 42.5}
data: Hello, world             → string "Hello, world"
data: 42                       → number 42
data: [1, 2, 3]               → array [1, 2, 3]
```

This mirrors the parsing behavior of the `get` directive's response handling.

---

## Authentication Limitations

`EventSource` is a browser API with significant authentication constraints. Understanding these limitations is essential before choosing SSE for authenticated endpoints.

### No custom headers

The browser's `EventSource` API provides **no mechanism to set custom HTTP headers**. You cannot send `Authorization: Bearer <token>` or any other custom header. This is a browser API limitation, not a No.JS limitation.

### NoJS fetch interceptors do not apply

`NoJS.interceptor('request', ...)` and `NoJS.interceptor('response', ...)` work with the `get`/`post`/`put`/`patch`/`delete` directives, which use the Fetch API internally. `EventSource` is a separate browser API — NoJS interceptors have no way to hook into it.

### Workarounds

| Approach | How | Trade-off |
|----------|-----|-----------|
| **Query-string token** | `sse="/api/stream?token={authToken}"` | Token visible in server logs, browser history, and network tools. Use short-lived tokens. |
| **Cookies via `sse-credentials`** | Set an `HttpOnly` cookie via a prior auth endpoint, then use `sse-credentials` on the SSE element. | Requires cookie-based auth on the server. Most secure option. |
| **Cookie-setting auth endpoint** | `POST /auth/sse-ticket` returns a short-lived cookie, then `sse="/api/stream"` with `sse-credentials` sends it. | Extra round-trip, but avoids tokens in URLs. |

```html
<!-- Recommended: cookie-based auth -->
<div sse="/api/stream" sse-credentials as="data">
  <span bind="data.value"></span>
</div>
```

```html
<!-- Alternative: query-string token (less secure) -->
<div state="{ token: '' }"
     computed="token = localStorage.getItem('sseToken')">
  <div sse="/api/stream?token={token}" as="data">
    <span bind="data.value"></span>
  </div>
</div>
```

---

## HTTP/1.1 Connection Limit

Browsers enforce a limit of **6 concurrent HTTP/1.1 connections per origin**. Each `sse` element opens one persistent connection, so 6 SSE elements pointing to the same origin will exhaust the limit — blocking all other HTTP requests (fetches, images, scripts) to that origin.

No.JS tracks active SSE connections per origin and emits a console warning when the 6th connection to the same origin is established.

### Recommendations

- **Use HTTP/2.** HTTP/2 multiplexes all streams over a single TCP connection, effectively removing the per-origin limit. This is the recommended solution for any application using multiple SSE streams.
- **Consolidate streams.** Use one SSE endpoint that multiplexes multiple data types via named events (`sse-event`), rather than separate endpoints per data type.
- **Close unused connections.** Connections are closed automatically when the element is removed from the DOM (e.g., by a parent `if` directive). Use conditional rendering to keep only the streams you need.

---

## SSE vs. Polling (`refresh`)

Both SSE and polling (`get` with `refresh`) deliver updated data over time. Choose based on your use case:

| | SSE (`sse`) | Polling (`get` + `refresh`) |
|---|---|---|
| **Data delivery** | Server pushes instantly when data changes | Client pulls at a fixed interval regardless of changes |
| **Latency** | Near-zero (server pushes immediately) | Up to one polling interval (e.g., 30 seconds) |
| **Bandwidth** | Efficient — only sends when there is new data | Wasteful — re-fetches even when nothing changed |
| **Connection** | Persistent HTTP connection held open | New request each interval; connection closes after response |
| **Reconnection** | Built-in browser auto-reconnect with `Last-Event-ID` | Automatic via interval timer |
| **Custom headers** | Not supported (browser limitation) | Fully supported via `headers` attribute |
| **Interceptors** | Not supported | Fully supported via `NoJS.interceptor()` |
| **Caching** | Not applicable | Supported via `cached` attribute |
| **Server requirement** | Must implement `text/event-stream` protocol | Any standard HTTP endpoint |

**Use SSE when:** the server controls when updates happen, low latency matters, and the server already supports (or can easily support) the SSE protocol.

**Use polling when:** you need custom headers or interceptors, the server does not support SSE, latency of a few seconds is acceptable, or you need response caching.

---

## Live Feed Example

A complete accessible live feed with connection state indicators:

```html
<div sse="/api/activity" as="events"
     sse-insert="prepend"
     sse-limit="50"
     error="feedError">

  <!-- Connection state indicators -->
  <div class="status-bar">
    <span show="$sse.connecting" class="badge connecting">
      Connecting...
    </span>
    <span show="$sse.open" class="badge online">
      Live
    </span>
    <span show="$sse.error" class="badge offline">
      Disconnected
    </span>
  </div>

  <!-- Feed content with accessibility attributes -->
  <ul role="log" aria-live="polite" aria-label="Activity feed">
    <li each="event in events">
      <strong bind="event.user"></strong>
      <span bind="event.action"></span>
      <time bind="event.timestamp | date"></time>
    </li>
  </ul>

</div>

<template id="feedError" var="err">
  <div class="error-panel" role="alert">
    <p>Live feed disconnected.</p>
    <button on:click="location.reload()">Reconnect</button>
  </div>
</template>
```

> **Tip:** Use `role="log"` with `aria-live="polite"` for activity feeds and log viewers. Screen readers will announce new items without interrupting the user. For urgent notifications, use `aria-live="assertive"`.

---

## See Also

- [Data Fetching](data-fetching.md) — `get`, `post`, and other HTTP directives for request-response data
- [State Management](state-management.md) — `store` and `into` for global reactive state
- [Conditionals](conditionals.md) — `show`, `hide`, `if` for composing with `$sse` state
- [Events](events.md) — `on:*` event handlers for user interactions
- [Error Handling](error-handling.md) — error boundaries and the global error handler

---

**Previous:** [Data Fetching <-](data-fetching.md) | **Next:** [Data Binding ->](data-binding.md)
