# No.JS Framework — Project Guidelines

## Overview

No.JS is an HTML-first reactive framework with zero dependencies. Users build dynamic web apps using HTML attributes only — no JavaScript required. Distributed via CDN (`cdn.no-js.dev`).

## Architecture

```
src/
├── index.js          # Public API: NoJS.config(), init(), directive(), filter(), validator(), etc.
├── cdn.js            # CDN entry: exposes window.NoJS, auto-inits on DOMContentLoaded
├── globals.js        # All shared state (_config, _filters, _stores, _eventBus, etc.)
├── context.js        # Reactive proxy contexts with change tracking and batching
├── evaluate.js       # Expression parser: evaluate(), resolve(), _interpolate()
├── registry.js       # registerDirective(), processTree() — DOM tree walking
├── dom.js            # DOM helpers, template loading, HTML sanitization
├── router.js         # SPA router: path matching, guards, nested routes, prefetch
├── i18n.js           # Locale switching, namespace loading, pluralization
├── filters.js        # 32+ built-in filters (side-effect registration)
├── animations.js     # Transitions and stagger support
├── fetch.js          # Declarative HTTP (get/post/put/patch/delete)
├── devtools.js       # Browser devtools bridge
└── directives/       # One file per directive category (state, http, binding, loops, etc.)
```

- **Directives** register via `registerDirective(name, handler)` and are invoked by `processTree()` during DOM walking
- **Directive priority**: 0 (state/store) → 1 (fetch/i18n/head) → 2 (computed/watch) → 5 (ref) → 10 (structural: if/each/for/use) → 15 (dnd) → 20 (bind/events/style/model) → 30 (validate)
- **Reactivity** uses JavaScript `Proxy` objects in `createContext()` with `_startBatch()` / `_endBatch()` for batched updates
- **Global state** lives exclusively in `globals.js` — all modules import from there

## Conventions

- **Private API**: prefix with `_` (e.g., `_config`, `_loadRemoteTemplates()`)
- **Public API**: exported via `src/index.js` on the `NoJS` object
- **Side-effect imports**: directives and filters self-register on import
- **Logging**: use `_log()` / `_warn()` (respects `_config.debug`), never `console.log`
- **Cache maps**: use `Map` objects (`_templateHtmlCache`, `_i18nCache`)

## Build

```sh
node build.js        # → dist/{iife,esm,cjs}/no.js (esbuild, minified + sourcemaps)
```

Build target is ES2020. Three output formats: IIFE (`src/cdn.js`), ESM and CJS (`src/index.js`). Version must be updated in **both** `package.json:3` and `src/index.js:493`.

## Testing

```sh
npm test                  # Jest unit tests (jsdom environment)
npm run test:e2e          # Playwright E2E tests (chromium, firefox, webkit)
npm run test:all          # Both unit + E2E
npm run bench             # Performance benchmarks (__benchmarks__/)
```

- Unit tests: `__tests__/*.test.js`, one file per module. Coverage target: ≥80% on new code.
- E2E tests: `e2e/tests/*.spec.ts` + fixtures in `e2e/examples/*.html`. Use `data-test` attributes for selectors. Cross-browser required.
- Single file: `npx jest --no-coverage __tests__/filters.test.js`
- Environment: `jest-environment-jsdom` with `@testing-library/jest-dom`

## Documentation Site

- Dev server: `npm start` → `http://localhost:3000`
- Templates: `docs/templates/*.tpl` — no hardcoded text, always `t="key.path"` i18n placeholders
- Locales: `docs/locales/{en,es,pt,fr,it}/` — JSON files per namespace, `en` is source of truth
- Production: loads `https://cdn.no-js.dev/`. Switch to `./no.js` in `docs/index.html` for local testing.

## Safety Rules

These are mandatory — each originated from a real tracked bug.

1. **Disposal before clearing**: Always `_disposeTree()` children before `innerHTML = ""`. Iterate `el.children`, not the parent.
2. **Listener cleanup**: `_onDispose(() => el.removeEventListener(...))` immediately after every `addEventListener`. Exception: `{ once: true }`.
3. **Watcher unsubscribe**: Capture `ctx.$watch()` return, register via `_onDispose()`.
4. **Timer guards**: `if (!el.isConnected) { clearInterval(id); return; }` + `_onDispose(() => clearInterval(id))`.
5. **HTML sanitization**: DOMParser-based, never regex. URL attrs pass through `_sanitizeAttrValue()`.
6. **Expression resolution**: Allow-list only (`_SAFE_GLOBALS`, `_BROWSER_GLOBALS`). Never eval/Function.
7. **Expression errors**: Catch, `_warn()`, return `undefined`. One bad attr must not kill the page.
8. **Cloned elements**: Strip directive attributes before `processTree()`.

## Commit & Release

Conventional commits: `<type>[scope][!]: <description>`. Types: `feat` (MINOR), `fix` (PATCH), `perf` (MINOR), `docs`/`chore`/`refactor`/`test`/`style`/`ci` (PATCH). `BREAKING CHANGE:` or `!` → MAJOR.

### Ecosystem versioning

All 3 repos share the same version — never bump individually:

| Repo | Version locations | Publish |
|------|-------------------|---------|
| **NoJS** | `package.json:3` + `src/index.js:493` | nothing (CDN-only) |
| **NoJS-LSP** | `package.json:5` | `npx vsce package` (VSIX) |
| **NoJS-Skill** | `SKILL.md:4` (frontmatter) | none |

### Release order

bump → changelog → build → commit on `release/v<x.y.z>` → push → PR → merge → tag (`git tag v<x.y.z>`) → publish → cleanup branches → verify.

### Sync mapping

| Framework change | LSP updates | Skill updates |
|-----------------|-------------|---------------|
| New/changed directive | `directives.json`, `snippets/nojs.json`, `nojs-custom-data.json` | `references/directives.md`, `SKILL.md` |
| New/changed filter | `filters.json` | `references/filters.md`, `SKILL.md` |
| New/changed validator | `validators.json` | `references/validation.md` |
| New config/API | config support | `references/api.md`, `SKILL.md` |
