# Drag & Drop

> **Moved to NoJS Elements** — As of v1.13.0, the drag-and-drop directives (`drag`, `drop`, `drag-list`, `drag-multiple`) are part of the `@erickxavier/nojs-elements` plugin.
>
> See the [NoJS Elements documentation](https://github.com/ErickXavier/nojs-elements) for the full reference.
>
> **Migration:** Install `@erickxavier/nojs-elements` and add `NoJS.use(NoJSElements)` before `NoJS.init()`.

## Quick Start

```html
<!-- 1. Load core + Elements -->
<script src="https://cdn.no-js.dev/"></script>
<script src="https://cdn.no-js.dev/elements/"></script>

<!-- 2. Enable plugin -->
<script>NoJS.use(NoJSElements);</script>

<!-- 3. Use directives as before -->
<div drag="task" drag-data="item">Drag me</div>
<div drop="task">Drop here</div>
```
