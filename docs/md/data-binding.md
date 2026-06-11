# Data Binding

Data binding connects your reactive state to the DOM. When state changes, bound elements update automatically — no manual DOM manipulation needed.

## `bind` — Text Content

Replaces the element's `textContent` with the evaluated expression.

```html
<span bind="user.name"></span>
<span bind="user.age + ' years old'"></span>
<span bind="items.length === 0 ? 'Empty' : items.length + ' items'"></span>
```

Expressions inside `bind` are reactive — they re-evaluate automatically whenever the referenced state changes. You can also use [filters](filters.md) to transform values for display:

```html
<span bind="price | currency"></span>
<span bind="user.name | uppercase"></span>
<span bind="user.bio | truncate:100"></span>
```

---

## `bind-html` — Inner HTML

Renders evaluated expression as HTML. Sanitized by default.

```html
<div bind-html="article.content"></div>
<div bind-html="`<em>${user.bio}</em>`"></div>
```

> ⚠️ Uses built-in DOMParser-based sanitization to prevent XSS.

> **Tip:** You can configure a custom sanitizer via `NoJS.config({ sanitizeHtml: fn })`. See [Configuration → Security](configuration.md#security) for details.

---

## `bind-*` — Attribute Binding

Bind any HTML attribute dynamically.

```html
<!-- src, href, alt, title, etc. -->
<img bind-src="user.avatarUrl"
     bind-alt="user.name + ' avatar'" />

<a bind-href="'/users/' + user.id"
   bind-title="'View ' + user.name">
  Profile
</a>

<!-- disabled, readonly, checked -->
<button bind-disabled="!form.isValid">Submit</button>
<input type="checkbox" bind-checked="user.isActive" />

<!-- data attributes -->
<div bind-data-id="user.id"
     bind-data-role="user.role"></div>
```

---

## `model` — Two-Way Binding

For form inputs, `model` creates automatic two-way data binding:

```html
<div state="{ name: '', age: 0, agreed: false }">

  <input type="text" model="name" />
  <input type="number" model="age" />
  <input type="checkbox" model="agreed" />
  <select model="role">
    <option value="admin">Admin</option>
    <option value="user">User</option>
  </select>
  <textarea model="bio"></textarea>

  <p>Hello, <span bind="name"></span>. You are <span bind="age"></span>.</p>

</div>
```

### Radio Buttons

```html
<div state="{ color: 'red' }">
  <label><input type="radio" model="color" value="red" /> Red</label>
  <label><input type="radio" model="color" value="green" /> Green</label>
  <label><input type="radio" model="color" value="blue" /> Blue</label>
  <p>Selected: <span bind="color"></span></p>
</div>
```

### Multi-Select (Planned)

> **Warning:** Multi-select `model` binding is **not yet implemented**. The current `model` directive uses `el.value` for `<select>` elements and does not read `selectedOptions` or handle the `multiple` attribute. An array-backed model will write back a single string value, not an array of selected values. This feature is planned for a future release.

```html
<!-- NOT YET FUNCTIONAL — shown for reference only -->
<div state="{ selected: [] }">
  <select model="selected" multiple>
    <option value="a">Option A</option>
    <option value="b">Option B</option>
    <option value="c">Option C</option>
  </select>
  <p bind="selected | join:', '"></p>
</div>
```

---

## Common Mistakes

```html
<!-- WRONG: bind-html without understanding sanitization -->
<div bind-html="userInput"></div>

<!-- RIGHT: use bind for user-generated text content -->
<span bind="userInput"></span>

<!-- WRONG: model on a non-form element -->
<div model="name"></div>

<!-- RIGHT: model only on input, select, textarea -->
<input model="name" />
```

---

## See Also

- [State Management](state-management.md) — creating the state that `bind` reads from
- [Filters & Pipes](filters.md) — transform bound values for display
- [Forms & Validation](forms-validation.md) — `model` with form validation
- [Dynamic Styling](styling.md) — bind CSS classes and styles reactively

---

**Previous:** [Data Fetching ←](data-fetching.md) | **Next:** [State Management →](state-management.md)
