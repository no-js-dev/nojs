# Events

## `on:*` — Event Handlers

Bind any DOM event directly in HTML:

```html
<!-- Click -->
<button on:click="count++">Increment</button>
<button on:click="handleLogout()">Logout</button>

<!-- Input -->
<input on:input="search = $event.target.value" />
<input on:focus="focused = true" on:blur="focused = false" />

<!-- Keyboard -->
<input on:keydown.enter="submitForm()"
       on:keydown.escape="cancel()" />

<!-- Mouse -->
<div on:mouseenter="hovered = true"
     on:mouseleave="hovered = false">
  Hover me
</div>

<!-- Custom events -->
<div on:custom-event="handleCustom($event.detail)"></div>

<!-- Load errors (img, script, video, …) -->
<img src="/avatar.png" on:error="avatarFailed = true" />
```

### Multiple statements and local variables

Separate statements with `;`. Use `const` or `let` for values that only the handler needs — they are local to that handler run and are never written to state:

```html
<div state="{ items: ['a', 'b', 'c'] }">
  <!-- move the first item to the end -->
  <button on:click="const m = items.splice(0, 1)[0]; items.splice(2, 0, m)">Rotate</button>
  <button on:click="let n = items.length; n = n * 2; total = n">Double count</button>
</div>
```

| Form | Behaviour |
|------|-----------|
| `const name = value`, `let name = value`, `let name` | Handler-local binding; visible to the following statements of the same handler only |
| `const a = 1, b = 2` | Several declarations in one statement |
| `name = value` (no `const`/`let`) | Writes to the owning state; creates a new state key on the nearest context when none exists |
| Reassigning a `const` | `TypeError` — the handler stops and none of its state writes apply |
| `const` without a value, declaring a name twice, destructuring (`const [a] = list`), names starting with `$` | Rejected with a warning naming the statement; the handler does not run |

Errors in a handler are logged as `[No.JS] Expression error: <statement>` and dispatch a `nojs:error` event on the element, so `error-boundary` can catch them.

---

## Event Modifiers

```html
<!-- .prevent — calls preventDefault() -->
<form on:submit.prevent="handleSubmit()">

<!-- .stop — calls stopPropagation() -->
<button on:click.stop="handleClick()">

<!-- .once — listener fires only once -->
<button on:click.once="initializeApp()">

<!-- .self — only fires if target is the element itself -->
<div on:click.self="closeModal()">

<!-- .debounce — debounce the handler -->
<input on:input.debounce.300="search($event.target.value)" />

<!-- .throttle — throttle the handler -->
<div on:scroll.throttle.100="handleScroll()">

<!-- Key modifiers -->
<input on:keydown.enter="submit()"
       on:keydown.ctrl.enter="save()"
       on:keydown.shift.delete="deleteAll()" />

<!-- Combine modifiers -->
<form on:submit.prevent.once="register()">
```

### All Key Modifiers

| Modifier | Key |
|----------|-----|
| `.enter` | Enter |
| `.escape` | Escape |
| `.tab` | Tab |
| `.space` | Space |
| `.delete` | Delete or Backspace |
| `.backspace` | Backspace only |
| `.up` | ArrowUp |
| `.down` | ArrowDown |
| `.left` | ArrowLeft |
| `.right` | ArrowRight |
| `.ctrl` | Control key held |
| `.alt` | Alt key held |
| `.shift` | Shift key held |
| `.meta` | Meta/Command key held |

> **Note:** Only the modifiers listed above are supported. Single-letter key modifiers (e.g. `.s`, `.a`) are **not** recognized and will be silently ignored. Combine `.ctrl`, `.alt`, `.shift`, or `.meta` with named keys like `.enter`, `.escape`, `.space`, etc.

---

## `$event` — The Event Object

Inside any `on:*` handler, `$event` refers to the native DOM event:

```html
<input on:input="name = $event.target.value" />
<div on:click="handleClick($event.clientX, $event.clientY)"></div>
```

---

## `$el` — The Current Element

```html
<input on:focus="$el.select()" />
<div on:click="$el.classList.toggle('expanded')"></div>
```

---

## Lifecycle Hooks

```html
<!-- Run when element is inserted into the DOM -->
<div on:mounted="initChart($el)">
  <canvas ref="chart"></canvas>
</div>

<!-- Run when element is removed from the DOM -->
<div on:unmounted="cleanup()"></div>

<!-- Run once when the element is first processed -->
<div on:init="fetchInitialData()"></div>

<!-- Run every time a bound value changes -->
<div on:updated="logChange()"></div>
```

| Hook | When |
|------|------|
| `on:init` | Directive first processed |
| `on:mounted` | Element inserted into visible DOM |
| `on:updated` | DOM mutation observed (childList, attributes, characterData) |
| `on:unmounted` | Element removed from DOM |

> `on:error` is a regular DOM event, not a lifecycle hook: it runs when the element itself fires `error` (for example an `<img>` that fails to load), with `$event` like any other event. Load errors do not bubble, so put `on:error` on the element that loads the resource. If an `<img>` with a `src` already failed before No.JS processed it, its `on:error` handlers get the error replayed once (`$event.isTrusted` is `false`); inline `onerror`, other listeners and `error-boundary` are not notified again. For other elements an error fired before that point is not seen.

---

## `trigger` — Emit Custom Events

The `trigger` directive emits a custom event from the element, typically used for child-to-parent communication. See [Actions & Refs → trigger](actions-refs.md#trigger--emit-custom-events) for full details.

---

## See Also

- [Actions & Refs](actions-refs.md) — `call`, `trigger`, and `ref` directives
- [Forms & Validation](forms-validation.md) — form event handling with `$form`
- [Data Binding](data-binding.md) — `$event` and `$el` in context

**Previous:** [Templates ←](templates.md) | **Next:** [Forms & Validation →](forms-validation.md)
