# Error Handling

No.JS provides multiple layers of error handling — from per-element HTTP errors to global error boundaries — so failures are caught and displayed gracefully without crashing the page.

---

## Per-Element Error Handling

Any HTTP directive (`get`, `post`, `put`, `patch`, `delete`) can declare an error template. When the request fails, the template renders inside the element:

```html
<div get="/api/users" as="users" error="#usersError">
  <div each="user in users" template="userCard"></div>
</div>

<template id="usersError" var="err">
  <div class="error-box">
    <p bind="err.message"></p>
    <p>Status: <span bind="err.status"></span></p>
  </div>
</template>
```

### Retry on Failure

Add `retry` and `retry-delay` to automatically retry failed requests before showing the error template:

```html
<div get="/api/users" as="users"
     error="#usersError"
     retry="3"
     retry-delay="2000">
  <!-- Retries up to 3 times with 2s between attempts -->
  <!-- Error template only renders after all retries fail -->
</div>
```

Retries use linear delay (not exponential backoff). The `loading` template remains visible during retries. HTTP status codes 5xx and network errors trigger retries; 4xx errors (client errors) do not.

---

## `error-boundary` — Catch Errors in a Subtree

Wrap a section of your page with `error-boundary` to catch any error that occurs within it — including expression evaluation errors, failed HTTP requests, and runtime exceptions:

```html
<div error-boundary="#errorFallback">
  <div get="/api/fragile-endpoint" as="data">
    <span bind="data.deep.nested.value"></span>
  </div>
</div>

<template id="errorFallback" var="err">
  <div class="error-boundary">
    <h3>Something went wrong</h3>
    <pre bind="err.message"></pre>
  </div>
</template>
```

When an error is caught, the boundary dispatches a `nojs:error` CustomEvent on the boundary element with the error details in `event.detail`.

---

## Global Error Handler

Use `NoJS.on()` to listen for errors globally — useful for logging, analytics, or session management:

```html
<script>
  // Catch all framework errors
  NoJS.on('error', ({ url, error }) => {
    console.error('[No.JS Error]', error);
    // Send to error tracking service
  });

  // Catch HTTP-specific errors
  NoJS.on('fetch:error', ({ url, error }) => {
    if (error.status === 401) {
      NoJS.store.auth.user = null;
      NoJS.notify();
      NoJS.router.push('/login');
    }
  });
</script>
```

---

## Expression Errors

When a `bind`, `on:click`, or other expression throws an error, No.JS catches it, logs a warning via `_warn()`, and returns `undefined`. One broken expression does not crash the rest of the page:

```html
<!-- If user is null, user.name throws — but the page keeps working -->
<span bind="user.name"></span>
<!-- Renders nothing (undefined), logs a warning -->
```

> **Tip:** Enable `NoJS.config({ debug: true })` to see detailed expression evaluation warnings in the console.

---

## Common Mistakes

```html
<!-- WRONG: error template without var — can't access error details -->
<template id="myError">
  <p>Something failed</p>
</template>

<!-- RIGHT: use var to name the error object -->
<template id="myError" var="err">
  <p bind="err.message"></p>
</template>
```

---

## See Also

- [Data Fetching](data-fetching.md) — `error`, `retry`, `retry-delay` on HTTP directives
- [Configuration](configuration.md) — global error settings and interceptors
- [Plugins](plugins.md) — plugin-level error handling and disposal

---

**Previous:** [Plugins ←](plugins.md) | **Next:** [Configuration →](configuration.md)
