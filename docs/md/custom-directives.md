# Custom Directives

Extend No.JS with your own attribute-driven behaviors.

## `NoJS.directive()`

```html
<script>
  NoJS.directive('tooltip', {
    priority: 25,
    init(el, name, value) {
      const ctx = NoJS.findContext(el);
      const text = NoJS.evaluate(value, ctx);

      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = text;

      el.addEventListener('mouseenter', () => document.body.appendChild(tip));
      el.addEventListener('mouseleave', () => tip.remove());
    }
  });

  NoJS.directive('clipboard', {
    priority: 25,
    init(el, name, value) {
      el.addEventListener('click', () => {
        const ctx = NoJS.findContext(el);
        const text = NoJS.evaluate(value, ctx);
        navigator.clipboard.writeText(text);
      });
    }
  });

  NoJS.directive('lazy-src', {
    priority: 25,
    init(el, name, value) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          const ctx = NoJS.findContext(el);
          el.src = NoJS.evaluate(value, ctx);
          observer.disconnect();
        }
      });
      observer.observe(el);
    }
  });
</script>
```

---

### Priority Levels

The `priority` number controls when your directive runs relative to built-in directives:

| Priority Range | Category | Example |
|---------------|----------|---------|
| 0-1 | State/Fetch | `state`, `get` |
| 2-5 | Computed/Refs | `computed`, `ref` |
| 10 | Structural | `if`, `foreach`, `use` |
| 15-20 | Rendering | `drag`, `bind`, `on:*` |
| 25+ | Custom | Your directives |
| 30 | Validation | `validate` |

Default priority when omitted: 50 (runs after all built-in directives).

### Cleanup / Disposal

If your directive adds event listeners, observers, or timers, register cleanup via the element's disposal system. Return a cleanup function or use `_onDispose`:

```html
<script>
  NoJS.directive('auto-resize', {
    priority: 25,
    init(el, name, value) {
      const observer = new ResizeObserver(() => {
        el.style.height = el.scrollHeight + 'px';
      });
      observer.observe(el);

      // Cleanup when element is removed from DOM
      el.__disposers = el.__disposers || [];
      el.__disposers.push(() => observer.disconnect());
    }
  });
</script>
```

> **Warning:** Custom directives cannot override built-in (core) directives — they are frozen after framework initialization. See [Plugins](plugins.md) for details.

---

## Usage

```html
<button tooltip="'Click to copy'" clipboard="user.email">📋 Copy Email</button>
<img lazy-src="user.avatarUrl" alt="avatar" />
```

---

## Web Components Compatibility

No.JS directives work on custom elements:

```html
<!-- Pass reactive data to web components -->
<user-avatar bind-prop-name="user.name"
             bind-prop-size="avatarSize"
             on:avatar-clicked="handleClick()">
</user-avatar>

<!-- Use No.JS inside shadow DOM -->
<my-widget>
  <template shadowroot="open">
    <div state="{ count: 0 }">
      <button on:click="count++">+</button>
      <span bind="count"></span>
    </div>
  </template>
</my-widget>
```

### Component-like Patterns with Templates

```html
<!-- Define a reusable "component" -->
<template id="counter-component" var="config">
  <div state="{ count: config.initial || 0 }">
    <span bind="config.label + ': '"></span>
    <button on:click="count--">−</button>
    <span bind="count"></span>
    <button on:click="count++">+</button>
  </div>
</template>

<!-- Use it multiple times -->
<div use="counter-component" var-config="{ label: 'Apples', initial: 5 }"></div>
<div use="counter-component" var-config="{ label: 'Oranges', initial: 3 }"></div>
```

---

---

## See Also

- [Plugins](plugins.md) — full plugin system with lifecycle hooks and globals
- [Configuration](configuration.md) — `NoJS.directive()` API reference
- [Filters & Pipes](filters.md) — `NoJS.filter()` for custom data transformations

**Previous:** [Head Management ←](head-management.md) | **Next:** [Plugins →](plugins.md)
