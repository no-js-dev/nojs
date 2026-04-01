# Compilation

No.JS works out of the box with zero build steps — but for production, an
optional **compile** step can dramatically close the performance gap with
hand-written Vanilla JS.

> **TL;DR:** Development → write normal No.JS HTML. Production → run
> `nojs prebuild --compile` and deploy the output. Your users get near-native
> speed; your DX stays the same.

---

## Why compile?

No.JS interprets directives at runtime: it walks the DOM, parses attribute
expressions, and creates reactive bindings on every page load. This is fast
enough for development and most sites, but it adds overhead compared to
hand-optimized JavaScript.

The compiler **pre-resolves** directives at build time so the browser does
less work at runtime:

| Mode | Relative to Vanilla JS |
|------|----------------------|
| No.JS (interpreted) | ~3.84x |
| No.JS (compiled) | ~1.2x |

That means compiled No.JS runs at roughly **80–85 %** of raw Vanilla JS speed
— with no changes to your source HTML.

---

## Compilation levels

The compiler supports four incremental optimization levels. Higher levels
produce faster output but perform deeper transformations.

### Level 1 — Static extraction

Evaluates expressions that contain no reactive references and replaces them
with their literal values. Removes the directive attribute from the element.

```html
<!-- Before -->
<span bind="'Hello, ' + 'world'"></span>

<!-- After (level 1) -->
<span>Hello, world</span>
```

### Level 2 — Directive inlining

Converts simple reactive directives into lightweight inline scripts that run
once, eliminating the generic directive processor for those elements.

```html
<!-- Before -->
<p bind="user.name"></p>

<!-- After (level 2) -->
<p data-nojs-c="bind:user.name"></p>
```

The `data-nojs-c` attribute tells the runtime to use the fast-path binding
instead of the full expression parser.

### Level 3 — Template pre-compilation

Pre-compiles `each` loops, `if`/`else` blocks, and template includes into
optimized DOM fragments that the runtime can stamp out without parsing.

```html
<!-- Before -->
<ul>
  <li each="items" bind="name"></li>
</ul>

<!-- After (level 3) — internal compiled fragment -->
<ul data-nojs-c="each:items#tpl0"></ul>
```

### Level 4 — Full optimization

Combines all previous levels plus dead-code elimination, expression
constant-folding, and scope hoisting. This is the recommended level for
production deployments.

```html
<!-- Before -->
<div state='{"count": 0}'>
  <span bind="count"></span>
  <button on:click="count = count + 1">+1</button>
</div>

<!-- After (level 4) — fully optimized -->
<div data-nojs-c="s0">
  <span data-nojs-c="b:s0.count"></span>
  <button data-nojs-c="e:click:s0.count++">+1</button>
</div>
```

---

## CLI usage

The compiler is invoked through the NoJS CLI `prebuild` command:

```bash
# Compile with default level (4)
nojs prebuild --compile

# Specify a level
nojs prebuild --compile --level 2

# Compile specific files
nojs prebuild --compile src/index.html src/about.html

# Compile an entire directory
nojs prebuild --compile src/ --out dist/
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--compile` | — | Enable compilation |
| `--level` | `4` | Optimization level (1–4) |
| `--out` | `dist/` | Output directory |
| `--sourcemap` | `false` | Generate source maps |
| `--minify` | `true` | Minify HTML output |
| `--watch` | `false` | Re-compile on file changes |

---

## Before / After

### A reactive counter (full round-trip)

**Source (development):**

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@nicajs/no.js"></script>
</head>
<body>
  <div state='{"count": 0}'>
    <h1 bind="'Count: ' + count"></h1>
    <button on:click="count = count + 1">Increment</button>
    <p if="count > 10" bind="'You passed 10!'"></p>
  </div>
</body>
</html>
```

**Compiled output (production):**

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@nicajs/no.js"></script>
</head>
<body>
  <div data-nojs-c="s0:count=0">
    <h1 data-nojs-c="b:s0.'Count: '+count"></h1>
    <button data-nojs-c="e:click:s0.count++">Increment</button>
    <p data-nojs-c="if:s0.count>10|b:'You passed 10!'"></p>
  </div>
</body>
</html>
```

The compiled version is served as-is. No.JS runtime detects the `data-nojs-c`
attributes and uses the fast path — no expression parsing, no directive
resolution overhead.

---

## Dev mode vs Production mode

| | Development | Production |
|--|-------------|------------|
| **Source** | Normal No.JS HTML | Same source files |
| **Build step** | None | `nojs prebuild --compile` |
| **Runtime** | Full interpreter | Fast-path runtime |
| **Debugging** | Full attribute names visible | Compiled attributes (use `--sourcemap`) |
| **Hot reload** | Edit and refresh | Use `--watch` for rebuild |

**Recommended workflow:**

1. Develop with plain No.JS — no build step, instant refresh.
2. Before deploying, run `nojs prebuild --compile`.
3. Deploy the `dist/` output.

---

## Configuration

Create a `nojs-prebuild.config.js` (or `.mjs`) in your project root:

```js
export default {
  // Input files or directories
  input: ['src/'],

  // Output directory
  output: 'dist/',

  // Compilation settings
  compile: {
    enabled: true,
    level: 4,           // 1–4
    sourcemap: false,
    minify: true,
  },

  // Files to exclude from compilation
  exclude: [
    'src/admin/**',
    '**/*.draft.html',
  ],

  // Copy static assets to output
  assets: ['public/'],
};
```

When a config file is present, `nojs prebuild` reads it automatically. CLI
flags override config-file values.

---

## FAQ

### Do I need this?

**No.** No.JS works perfectly without compilation. The runtime interpreter is
production-ready and used by many sites without a build step. Compilation is
purely an optimization.

### Should I use it?

**For production, yes.** If you care about squeezing every millisecond out of
initial page load and reactive updates, the compiler gets you within ~20 % of
hand-written Vanilla JS performance — for free.

### Does it change my source files?

**No.** The compiler reads your source and writes compiled output to a
separate directory (`dist/` by default). Your source files are never modified.

### Can I mix compiled and non-compiled pages?

**Yes.** The No.JS runtime handles both regular directive attributes and
compiled `data-nojs-c` attributes in the same document. You can compile your
critical pages and leave others interpreted.

### Does it work with plugins?

**Yes.** Plugins that register custom directives are supported. The compiler
calls into the plugin's directive metadata at build time to determine whether
a custom directive can be compiled.

### What about SSR / SSG?

Compilation and SSG are complementary. You can run your SSG tool (Eleventy,
Astro, etc.) first, then run `nojs prebuild --compile` on the SSG output to
optimize the No.JS directives in the generated HTML.

---

**Next:** [Plugins →](plugins.md)
