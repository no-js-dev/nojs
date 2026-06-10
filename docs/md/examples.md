# Examples

Real-world patterns you'll actually use in production — in pure HTML.

---

## 1. Login with JWT

A complete login flow: form validation, POST to auth endpoint, save the JWT to
a global store, and automatically attach the token to every subsequent request
via a request interceptor.

```html
<script>
  // Attach token to every outgoing request
  NoJS.interceptor('request', (url, opts) => {
    const token = NoJS.store.auth.token;
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    return opts;
  });
</script>

<!-- Global auth store -->
<div store="auth" value="{ user: null, token: null }"></div>

<template route="/login"
          guard="!$store.auth.token"
          redirect="/dashboard">
  <form post="/auth/login" validate
        success="#auth-ok" error="#auth-err">
    <input name="email" type="email" required validate="email">
    <input name="password" type="password" required minlength="8">
    <button type="submit"
            bind-disabled="!$form.valid || $form.submitting">
      <span hide="$form.submitting">Sign in</span>
      <span show="$form.submitting">Signing in...</span>
    </button>
  </form>

  <template id="auth-ok" var="res">
    <script>
      NoJS.store.auth.user  = res.user;
      NoJS.store.auth.token = res.token;
      NoJS.notify(); // flush DOM bindings after external store mutation
      NoJS.router.push('/dashboard');
    </script>
  </template>
  <template id="auth-err" var="err">
    <p class="error" bind="err.message" animate="shake"></p>
  </template>
</template>
```

**Key concepts:** `interceptor('request')` · `store` · `form` · `validate` · `post` · `guard` · `redirect` · `success/error` templates · `notify()`

---

## 2. Protected Route & Token Validation

A route guarded by the auth store, paired with a **response interceptor** that
acts as a control script: on every API call, if the server returns `401` or
`403`, the token is invalidated and the user is redirected to login
automatically — no extra code needed in the route itself.

```html
<script>
  // Control script: validate token on every response
  NoJS.interceptor('response', (response) => {
    if (response.status === 401 || response.status === 403) {
      NoJS.store.auth.user  = null;
      NoJS.store.auth.token = null;
      NoJS.notify(); // flush DOM bindings before redirect
      NoJS.router.push('/login');
      throw new Error('Session expired');
    }
    return response;
  });
</script>

<!-- Guard: redirect to /login if no token -->
<template route="/dashboard"
          guard="$store.auth.token"
          redirect="/login">
  <!-- Token is attached automatically via the request interceptor -->
  <div get="/me/dashboard" as="data" loading="#dash-skeleton">
    <h2 bind="'Welcome, ' + data.user.name"></h2>
    <p each="m in data.metrics" else="noMetrics">
      <span bind="m.label"></span>
      <span bind="m.value | number"></span>
    </p>
    <template id="noMetrics">
      <p>No metrics available</p>
    </template>
  </div>
  <button on:click="$store.auth.user = null; $store.auth.token = null">
    Sign out
  </button>
</template>
```

**Key concepts:** `interceptor('response')` · `guard` · `redirect` · `loading` · session invalidation

The two interceptors from Examples 1 and 2 work together: the request
interceptor stamps the token on the way out; the response interceptor revokes
it on the way back if the server rejects it.

---

## 3. Live Search

An instant search input that fires a debounced GET request on every keystroke,
rendering results reactively. No `addEventListener`, no `setTimeout`, no DOM
manipulation.

```html
<div state="{ query: '' }">

  <input model="query" placeholder="Search products...">

  <!-- GET fires 300ms after the user stops typing -->
  <div get="/products?q={query}"
       debounce="300"
       as="results">

    <p show="!results.length && query">
      No results for <strong bind="query"></strong>
    </p>

    <p each="item in results">
      <span bind="item.name"></span>
      <span bind="item.price | currency"></span>
    </p>

  </div>
</div>
```

**Key concepts:** `model` · `debounce` · dynamic `get` with interpolation · `show`

---

## 4. Shopping Cart with Global Store

A global store shared between a product list and a cart badge in different parts
of the page. When a product is added, the badge and the cart summary update
simultaneously — no event bus, no shared component.

```html
<!-- Global cart store -->
<div store="cart" value="{ items: [] }"></div>

<!-- Badge: lives anywhere in the DOM -->
<span class="cart-badge" bind="$store.cart.items.length"></span>

<!-- Product list -->
<div get="/products" as="products">
  <div each="p in products" else="noProducts">
    <span bind="p.name"></span>
    <button on:click="$store.cart.items = [...$store.cart.items, p]">
      Add to cart
    </button>
  </div>
  <template id="noProducts">
    <div>No products available</div>
  </template>
</div>

<!-- Cart summary: somewhere else entirely -->
<ul show="$store.cart.items.length > 0">
  <li each="item in $store.cart.items">
    <span bind="item.name"></span>
    <span bind="item.price | currency"></span>
  </li>
</ul>
```

**Key concepts:** `store` · `$store.*` cross-component reactivity · `each` · `show`

---

## 5. Live Polling

A server-status dashboard that refreshes automatically every 5 seconds using the
`refresh` attribute. Conditional styling reacts instantly to the health state — no
`setInterval`, no fetch loop.

```html
<!-- Refetches /api/status every 5 seconds -->
<div get="/api/status" refresh="5000" as="s">

  <!-- Badge: green when healthy, red otherwise -->
  <span class-success="s.healthy"
        class-error="!s.healthy"
        bind="s.healthy ? 'Online' : 'Degraded'">
  </span>

  <p each="metric in s.metrics">
    <span bind="metric.label"></span>
    <span bind="metric.value | number"></span>
  </p>

</div>
```

**Key concepts:** `refresh` · `class-*` conditional styling · `bind` expression

---

## Full SPA

All five patterns combined into a single production-grade SPA:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.no-js.dev/"></script>
  <script>
    NoJS.config({
      baseApiUrl: 'https://api.myapp.com/v1',
      router: { useHash: false }
    });

    // Attach JWT to every request
    NoJS.interceptor('request', (url, opts) => {
      const token = NoJS.store.auth.token;
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      return opts;
    });

    // Revoke JWT on 401/403
    NoJS.interceptor('response', (response) => {
      if (response.status === 401 || response.status === 403) {
        NoJS.store.auth.user  = null;
        NoJS.store.auth.token = null;
        NoJS.notify(); // flush DOM bindings before redirect
        NoJS.router.push('/login');
        throw new Error('Session expired');
      }
      return response;
    });
  </script>
</head>
<body>

  <div store="auth" value="{ user: null, token: null }"></div>

  <template route="/login" guard="!$store.auth.token" redirect="/dashboard">
    <form post="/auth/login" validate success="#auth-ok" error="#auth-err">
      <input name="email" type="email" required validate="email">
      <input name="password" type="password" required minlength="8">
      <button type="submit" bind-disabled="!$form.valid || $form.submitting">
        <span hide="$form.submitting">Sign in</span>
        <span show="$form.submitting">Signing in...</span>
      </button>
    </form>
    <template id="auth-ok" var="res">
      <script>
        NoJS.store.auth.user = res.user;
        NoJS.store.auth.token = res.token;
        NoJS.notify();
        NoJS.router.push('/dashboard');
      </script>
    </template>
    <template id="auth-err" var="err">
      <p bind="err.message" animate="shake"></p>
    </template>
  </template>

  <template route="/dashboard" guard="$store.auth.token" redirect="/login">
    <div get="/me/dashboard" as="data">
      <h1 bind="'Welcome, ' + data.user.name"></h1>
      <p each="m in data.metrics" else="noMetrics">
        <span bind="m.label"></span>
        <span bind="m.value | number"></span>
      </p>
      <template id="noMetrics">
        <p>No metrics available</p>
      </template>
    </div>
    <button on:click="$store.auth.user = null; $store.auth.token = null">
      Sign out
    </button>
  </template>

</body>
</html>
```

---

## See Also

- [Getting Started](getting-started.md) — installation and first steps
- [Routing](routing.md) — route guards, params, and navigation
- [Forms & Validation](forms-validation.md) — declarative form handling
- [Plugins](plugins.md) — interceptors and the plugin system
- [Playground](playground.md) — try these examples interactively

---

**Previous:** [Directive Cheatsheet ←](cheatsheet.md)
