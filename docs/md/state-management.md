# State Management

## `state` — Local State

Creates a reactive context scoped to the element and its children.

```html
<div state="{ count: 0, name: 'World' }">
  <h1>Hello, <span bind="name"></span>!</h1>
  <p>Count: <span bind="count"></span></p>
  <button on:click="count++">+1</button>
  <button on:click="count = 0">Reset</button>
</div>
```

---

## `store` — Global Store

A global reactive store accessible from anywhere. Ideal for auth state, theme, shared data.

```html
<!-- Define store (once, typically at the top of the page) -->
<div store="app" value="{
  user: null,
  theme: 'dark',
  lang: 'en',
  notifications: []
}"></div>

<!-- Access store from anywhere -->
<nav>
  <span bind="$store.app.user.name"></span>
  <button on:click="$store.app.theme = $store.app.theme === 'dark' ? 'light' : 'dark'">
    Toggle Theme
  </button>
</nav>

<!-- In a deeply nested component -->
<footer>
  <span bind="$store.app.notifications.length + ' notifications'"></span>
</footer>
```

### Pre-initializing Stores via `config()`

You can also create stores programmatically with `NoJS.config()`. This is useful for hydrating state from `localStorage`, setting auth tokens, or defining multiple stores before the DOM is processed:

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

<!-- These work immediately — no <div store> needed -->
<span bind="$store.auth.token"></span>
<span bind="$store.cart.items.length + ' items'"></span>
```

> Stores created via `config()` won't be overwritten by a later `<div store>` with the same name.

---

## `into` — Write Fetch Results to a Store

The `into` attribute on any HTTP directive writes the response directly into a named global store.

```html
<!-- Define an empty store -->
<div store="currentUser" value="{}"></div>

<!-- Fetch and write into the store -->
<div get="/me" as="user" into="currentUser">
  <p>Fetched: <span bind="user.name"></span></p>
</div>

<!-- Read from the store anywhere else on the page -->
<nav>
  <span bind="$store.currentUser.name"></span>
  <span bind="$store.currentUser.email"></span>
</nav>
```

The store doesn't need to be pre-defined — `into` will create it if it doesn't exist:

```html
<!-- No store directive needed — into creates it automatically -->
<button call="/api/auth/refresh"
        method="post"
        into="session">
  Refresh Session
</button>

<!-- These update reactively when the call completes -->
<span bind="$store.session.token"></span>
<span bind="$store.session.expiresAt"></span>
```

---

## `computed` — Derived State

Values that are automatically recalculated when dependencies change:

```html
<div state="{ price: 100, quantity: 2, taxRate: 0.1 }">

  <div computed="subtotal" expr="price * quantity"></div>
  <div computed="tax" expr="subtotal * taxRate"></div>
  <div computed="total" expr="subtotal + tax"></div>

  <p>Subtotal: $<span bind="subtotal"></span></p>
  <p>Tax: $<span bind="tax"></span></p>
  <p>Total: $<span bind="total"></span></p>

  <input type="number" model="quantity" />

</div>
```

---

## `watch` — Side Effects on State Change

Execute an action whenever a value changes:

```html
<div state="{ search: '' }"
     watch="search"
     on:change="console.log('Search changed:', search)">

  <input model="search" />

</div>
```

---

## State Persistence

Persist state across page reloads:

```html
<!-- Persists to localStorage -->
<div state="{ theme: 'dark', sidebar: true }"
     persist="localStorage"
     persist-key="app-settings">
  ...
</div>

<!-- Persists to sessionStorage -->
<div state="{ cartItems: [] }"
     persist="sessionStorage"
     persist-key="cart">
  ...
</div>
```

### `persist-fields` — Selective Persistence

Use `persist-fields` to control exactly which fields are saved and restored. Fields not listed are never written to storage, which is useful for keeping sensitive values (tokens, passwords) out of `localStorage`/`sessionStorage`.

```html
<!-- Only `theme` and `sidebar` are persisted — `token` never touches storage -->
<div state="{ theme: 'dark', sidebar: true, token: '' }"
     persist="localStorage"
     persist-key="app-settings"
     persist-fields="theme, sidebar">
  ...
</div>
```

`persist-fields` accepts a comma-separated list of field names. Whitespace around each name is trimmed, so `"theme, sidebar"` and `"theme,sidebar"` are equivalent.

| Attribute | Description |
|-----------|-------------|
| `persist` | Storage backend: `"localStorage"` or `"sessionStorage"` |
| `persist-key` | Unique storage key. **Required** when `persist` is set |
| `persist-fields` | Comma-separated list of fields to persist. Omit to persist all fields |

### `persist-schema` — Validate Restored State

Add `persist-schema` to validate that keys restored from storage match the initial state schema. Unknown keys are ignored and type mismatches trigger a console warning:

```html
<div state="{ theme: 'dark', sidebar: true }"
     persist="localStorage"
     persist-key="settings"
     persist-schema>
  <!-- If storage has { theme: 123, unknown: true }, warns about type mismatch
       on "theme" and ignores "unknown" -->
</div>
```

---

### Using i18n in State and Store Expressions

The `$i18n` reactive proxy is available in all expression contexts, including `state` and `store`. This lets you initialize reactive data with translated strings that automatically update when the locale changes.

```html
<!-- Initialize state with translated labels -->
<div state="{ saveLabel: $i18n.common.buttons.save, title: $i18n.shell.sidebar.introduction }">
  <h2 bind="title"></h2>
  <button bind="saveLabel"></button>
</div>

<!-- Store with translated defaults -->
<div store="ui" value="{
  heading: $i18n.home.hero.title,
  searchPlaceholder: $i18n.common.search.placeholder
}"></div>

<!-- Access from anywhere -->
<input bind-placeholder="$store.ui.searchPlaceholder">
```

For interpolation or pluralization, use `$i18n.t()` instead of dot-notation. Call it directly in a `bind=` expression so it re-runs on locale change — putting `$i18n.t()` in a `state` initializer snapshots the result once at init and is **not** locale-reactive:

```html
<div state="{ user: { name: 'Ada' } }">
  <p bind="$i18n.t('welcome', { name: user.name })"></p>
</div>
```

See [Internationalization](i18n.md) for the full `$i18n.*` reference.

---

### Context Scoping

Reactive contexts inherit from parent elements, like lexical scoping. A child `state` can shadow a parent's property:

```html
<div state="{ color: 'red' }">
  <span bind="color"></span> <!-- "red" -->

  <div state="{ color: 'blue' }">
    <span bind="color"></span> <!-- "blue" (shadows parent) -->
  </div>
</div>
```

---

## `NoJS.notify()` — Flush Store Updates from JavaScript

When external JavaScript (interceptors, helper functions, `<script>` blocks) mutates a store via `NoJS.store`, the DOM bindings don't update automatically because the mutation bypasses the framework's expression engine. Call `NoJS.notify()` after mutating the store to flush all pending DOM updates.

```html
<script>
  function addToCart(item) {
    NoJS.store.cart.items.push(item);
    NoJS.store.cart.total += item.price;
    NoJS.notify(); // ← triggers DOM update
  }
</script>

<div store="cart" value="{ items: [], total: 0 }"></div>
<span bind="$store.cart.items.length + ' items'"></span>
```

### Interceptor example

```html
<script>
  NoJS.interceptor('response', (response) => {
    if (response.status === 401) {
      NoJS.store.auth.user = null;
      NoJS.store.auth.token = null;
      NoJS.notify(); // ← flush before redirect
      NoJS.router.push('/login');
      throw new Error('Session expired');
    }
    return response;
  });
</script>
```

> **When do I need `notify()`?** Only when you mutate `NoJS.store` from plain JavaScript — outside of HTML expressions like `on:click` or `bind`. If you write `on:click="$store.cart.count++"` directly in HTML, the framework handles notification automatically.

---

---

## See Also

- [Data Binding](data-binding.md) — reading state with `bind` and `model`
- [Data Fetching](data-fetching.md) — `into` for writing fetch results to stores
- [Configuration](configuration.md) — pre-initializing stores via `config()`

**Previous:** [Data Binding ←](data-binding.md) | **Next:** [Conditionals →](conditionals.md)
