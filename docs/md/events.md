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
```

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
| `on:error` | Any error in this element's subtree |

---

## `trigger` — Emit Custom Events

The `trigger` directive emits a custom event from the element, typically used for child-to-parent communication. See [Actions & Refs → trigger](actions-refs.md#trigger--emit-custom-events) for full details.

---

## See Also

- [Actions & Refs](actions-refs.md) — `call`, `trigger`, and `ref` directives
- [Forms & Validation](forms-validation.md) — form event handling with `$form`
- [Data Binding](data-binding.md) — `$event` and `$el` in context

**Previous:** [Templates ←](templates.md) | **Next:** [Forms & Validation →](forms-validation.md)
