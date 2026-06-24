# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build              # esbuild → dist/{iife,esm,cjs}/no.js (minified + sourcemaps)
npm test                   # Jest (jsdom)
npm run test:watch         # Jest watch mode
npm run test:coverage      # Jest with coverage
npm run test:e2e           # Playwright (chromium, firefox, webkit)
npm run test:e2e:headed    # Playwright with visible browser
npm run test:all           # Jest + Playwright
npm run bench              # Loop performance benchmarks (__benchmarks__/)
npm start                  # Dev server for docs site (port 3000)
```

Run a single test file: `npx jest --no-coverage __tests__/filters.test.js`

Coverage for a specific module: `npx jest --coverage --collectCoverageFrom='src/<module>.js' __tests__/<module>.test.js`

No linter configured.

## Architecture

**No.JS** is an HTML-first reactive framework — one `<script>` tag, zero external dependencies, no build step for users. Walks the DOM on init, matches HTML attributes to directives, executes them by priority.

### Build outputs

| Format | Entry | Output | Use case |
|--------|-------|--------|----------|
| IIFE | `src/cdn.js` | `dist/iife/no.js` | CDN `<script>` tag |
| ESM | `src/index.js` | `dist/esm/no.js` | `import` |
| CJS | `src/index.js` | `dist/cjs/no.js` | `require` |

`build.js` uses esbuild.

### Core modules (src/)

- **index.js** — Public API, plugin system, lifecycle. Exposes `NoJS.config()`, `init()`, `use()`, `directive()`, `filter()`, `validator()`, `router`, `store`, etc.
- **globals.js** — Shared mutable state: `_config`, `_stores`, `_interceptors`, plugin registry. `_log()` only fires when `_config.debug` is true; `_warn()` always fires.
- **context.js** — Reactive Proxy-based contexts with parent chain inheritance (lexical scoping). `createContext()`, `findContext()`, `$watch`. Batch operations via `_startBatch()` / `_endBatch()`.
- **evaluate.js** — CSP-safe expression parser (no eval/Function). Allow-list approach: `_SAFE_GLOBALS` for JS builtins, `_BROWSER_GLOBALS` for curated browser APIs. Expression cache is LRU-bounded (`_config.exprCacheSize`, default 500). Functions: `evaluate()`, `resolve()`, `_interpolate()`.
- **dom.js** — DOM walking, template loading (`_loadTemplateElement`), disposal (`_disposeTree`), `processTree()`. Templates with `route` attribute are treated as route templates; without it, they're content-includes that get injected inline.
- **router.js** — SPA routing: hash/history mode, file-based routes, nested outlets, View Transition API, guards, prefetch, head management. `_loadNestedIndexRoutes()` handles `route-index` on nested outlets after VT completes.
- **fetch.js** — HTTP with interceptors, caching, retries, CSRF, credential handling. Sentinel symbols: `CANCEL`, `RESPOND`, `REPLACE`.
- **registry.js** — Directive registration via `registerDirective(name, handler)`. Core directives frozen after init — plugins can add but not override.
- **filters.js** — 32+ built-in filters (currency, date, uppercase, etc.). Self-register on import. Custom: `NoJS.filter('name', fn)`.
- **directives/** — 15+ directive files organized by category (state, http, binding, conditionals, loops, styling, events, refs, validation, i18n, dnd, head, animations). One file per category, side-effect imports for registration.
  - **Loop/else pattern:** loop directives (`foreach`, `each`, `for`) support empty-state rendering via `else="templateId"` on the loop element, referencing a `<template>`. The sibling else pattern was removed in v1.15. The conditional `else` handler skips elements that carry a loop directive.

### Directive priority order

0 (state/store) → 1 (fetch/i18n/head) → 2 (computed/watch) → 5 (ref) → 10 (structural: if/each/for/use) → 15 (dnd) → 20 (bind/events/style/model) → 30 (validate)

### Code style

- Private API uses `_` prefix: `_config`, `_loadRemoteTemplates()`, `_disposeTree()`
- Logging: `_log()` / `_warn()` from `globals.js` — never `console.log`
- Global state: always import from `globals.js`
- Caching: `Map` objects (`_templateHtmlCache`, `_i18nCache`, `_autoTemplateCache`)

## Mandatory Safety Rules

These rules exist because real bugs were found and fixed. Every rule has a tracked origin issue.

### 1. Disposal before clearing DOM

Always `_disposeTree()` children BEFORE `innerHTML = ""`. Iterate `el.children`, not the parent (disposing the parent breaks re-rendering).

```js
// WRONG — leaks contexts, listeners, watchers
el.innerHTML = "";

// RIGHT
for (const child of [...el.children]) _disposeTree(child);
el.innerHTML = "";
```

Applies to: every directive that swaps content (`if`/`else`, `each`/`foreach`, `get`/`post`, `switch`/`case`, `use`, `error-boundary`).

### 2. Event listener cleanup

Always register cleanup via `_onDispose()` immediately after `addEventListener`. Exception: `{ once: true }` auto-removes.

```js
el.addEventListener(event, handler, opts);
_onDispose(() => el.removeEventListener(event, handler, opts));
```

### 3. Watcher unsubscribe

Always capture `$watch()` return value and register via `_onDispose()`.

```js
const unwatch = ctx.$watch(fn);
_onDispose(() => { if (unwatch) unwatch(); _storeWatchers.delete(fn); });
```

### 4. Timer guards

Timers need both a disconnection guard AND `_onDispose` cleanup.

```js
const id = setInterval(() => {
  if (!el.isConnected) { clearInterval(id); return; }
  doRequest();
}, interval);
_onDispose(() => clearInterval(id));
```

### 5. Safety-net timeouts

Use `|| 0` (next tick), not hardcoded durations. If all code paths have a safety-net timeout, ALL analogous paths must too.

### 6. HTML sanitization

Always DOMParser-based, never regex. Blocked tags in `_BLOCKED_TAGS`. URL attributes (`href`, `src`, `action`, etc.) pass through `_sanitizeAttrValue()` — blocks `javascript:`, `vbscript:`, non-image `data:` URIs. Returns `"#"` for blocked values.

### 7. Expression identifier resolution

Allow-list only (`_SAFE_GLOBALS`, `_BROWSER_GLOBALS`). Unknown identifiers → `undefined`. Scope variables shadow browser globals. `_execStatement` throws `ReferenceError` for unlisted function calls. Never mutate cached `keys[]`/`vals{}` from `_collectKeys()`.

### 8. Expression error handling

Catch expression errors, warn via `_warn()`, return `undefined`. One broken attribute must not abort the entire page render.

### 9. Cloned elements

Strip directive attributes from clones before `processTree()` to prevent double-execution.

### 10. Storage persistence

`persist-fields` uses allow-list filtering. Never persist entire context objects to localStorage.

### 11. Plugin security

Freeze core directives after init. Validate plugin globals recursively. Plugins receive redacted headers unless `{ trusted: true }`.

### 12. Credential handling

Sensitive headers (authorization, x-api-key, cookie, etc.) are logged as `[REDACTED]` in debug mode. Strip before passing to untrusted interceptors.

## Testing

### Unit tests (Jest)

Config: `jest.config.js` — jsdom environment, babel-jest transform, ES2020.

Files: `__tests__/*.test.js` — grouped by feature: `core.test.js`, `directives-core.test.js`, `directives-data.test.js`, `directives-ui.test.js`, `directives-head.test.js`, `router.test.js`, `fetch.test.js`, `i18n.test.js`, `filters.test.js`, `animations.test.js`, `validation.test.js`, `plugins.test.js`, `registry.test.js`.

Coverage target: ≥80% on new code.

### E2E tests (Playwright)

Config: `e2e/playwright.config.ts` — `testIdAttribute: 'data-test'`, baseURL `http://localhost:3000`, cross-browser required (Chromium + Firefox + WebKit).

Structure: `e2e/examples/<feature>.html` (fixture) + `e2e/tests/<feature>.spec.ts` (spec).

Fixture rules: each scenario in `<section>`, NoJS loaded from `/__local__/no.js`, use `data-test` attributes. Network mocking via `page.route()`. Include `@axe-core/playwright` accessibility tests.

Test naming: `'N — Description'` format.

Dev server: `test-server.js` auto-started by Playwright.

### Docs site

`docs/` — static HTML + CSS. Dev server: `npm start` (port 3000). Uses CDN (`cdn.no-js.dev`) in production. Switch `docs/index.html` to `./no.js` for testing local builds.

Templates: `docs/templates/*.tpl`. Styles: `docs/assets/style.css`. No hardcoded user-facing text — always use `t="key.path"` i18n placeholders.

## i18n Structure

Locales: `docs/locales/{en,pt,es,fr,it}/` with JSON files per namespace (shell.json, landing.json, features.json, docs.json, examples.json, faq.json, playground.json).

**EN is the source of truth.** Other locales must match EN key structure. JSON format: 2-space indent, UTF-8, no trailing commas.

Template usage: `t="namespace.key.path"`, `t-html` modifier for HTML content, `bind-placeholder="$i18n.t('key.path')"`.

## Commit & Release Flow

### Conventional commits

```
<type>[scope][!]: <description>
```

| Type | Bump | Example |
|------|------|---------|
| `feat` | MINOR | `feat(router): add wildcard route support` |
| `fix` | PATCH | `fix(evaluate): prevent prototype pollution` |
| `perf` | MINOR | `perf(evaluate): cache compiled expressions` |
| `docs`, `chore`, `refactor`, `test`, `style`, `ci` | PATCH | `chore: release v1.11.0` |
| `BREAKING CHANGE:` in body or `!` after type | MAJOR | `feat(router)!: change default hash mode` |

### Branch conventions

- `release/vX.Y.Z` — release branches
- `feat/<name>`, `fix/<name>`, `chore/<desc>`, `docs/<name>`, `test/<name>` — work branches
- Never commit directly to `main` — all repos have protected branches

### Ecosystem versioning

All repos share the **same version**. Never bump individually. Highest bump across all repos wins.

| Repo | Path | Version locations | Build | Publish |
|------|------|-------------------|-------|---------|
| **NoJS** | `NoJS/` | `package.json:3` + `src/index.js:493` | `node build.js` | nothing (CDN-only) |
| **NoJS-LSP** | `NoJS-LSP/` | `package.json:5` | `npm run compile` | `npx vsce package` (VSIX only) |
| **NoJS-Skill** | `NoJS-Skill/` | `SKILL.md:4` (frontmatter) | none | none (markdown) |

All repos live under `/Users/erick/_projects/_personal/NoJS/`.

### Release steps

Order is strict — never skip or reorder:

1. **Rebase** working branches onto `main` if needed
2. **Investigate** commits since last tag: `git log v<prev>..HEAD --oneline` in each repo
3. **Sync** framework changes to satellite repos — see sync mapping below
4. **Decide** semver bump based on conventional commit analysis
5. **Bump** version in ALL repos simultaneously
6. **Update** `CHANGELOG.md` in each repo (Keep a Changelog format, commit hash links)
7. **Build**: NoJS `node build.js` (verify: `grep -c "x.y.z" dist/iife/no.js` > 0), LSP `npm run compile`
8. **Commit** on `release/v<x.y.z>` branch: `git commit -m "chore: release v<x.y.z>"`
9. **Push** release branch + **create PR** → main
10. **Merge** PR (merge commit, not squash)
11. **Tag** merge commit: `git tag v<x.y.z> && git push origin tag v<x.y.z>`
12. **Publish**: NoJS nothing (CDN-only), Elements nothing (CDN-only), LSP `npx vsce package`, Skill → nothing
13. **Cleanup** delete release branches (local + remote)
14. **Verify** all versions match, tags exist, CDN updates

Pre-publish checks: delete old VSIX before `npx vsce package`.

### CDN deployment

`cdn.no-js.dev` serves `dist/iife/no.js` via jsDelivr. After pushing a version tag, CDN auto-updates via jsDelivr from the GitHub release.

### Ecosystem sync mapping

When NoJS framework changes, propagate to satellite repos:

| Framework change | LSP files to update | Skill files to update |
|-----------------|--------------------|-----------------------|
| New/changed directive | `directives.json`, `snippets/nojs.json`, `nojs-custom-data.json` | `references/directives.md`, `SKILL.md` |
| New/changed filter | `filters.json` | `references/filters.md`, `SKILL.md` |
| New/changed validator | `validators.json` | `references/validation.md` |
| New config option | config support | `references/api.md`, `SKILL.md` |
| New API method | — | `references/api.md`, `SKILL.md` |
| New context key (`$something`) | completions | `SKILL.md` |

Sync branches: `chore/sync-<description>`. Validate LSP sync: `npx tsc --noEmit && npx jest --no-coverage`.

## Project structure

```
NoJS/
├── src/                   # Framework source
│   ├── directives/        # Built-in directives (one file per category)
│   ├── index.js           # Public API entry (ESM/CJS)
│   ├── cdn.js             # IIFE entry (auto-init)
│   └── globals.js         # Shared state
├── dist/                  # Build outputs (iife, esm, cjs)
├── docs/                  # Documentation site
│   ├── templates/         # Page templates (.tpl)
│   ├── locales/           # i18n JSON files (en, pt, es, fr, it)
│   ├── assets/            # CSS, images
│   └── dev-server.js      # Local dev server
├── __tests__/             # Jest unit tests
├── e2e/                   # Playwright E2E tests
│   ├── tests/             # Spec files (.spec.ts)
│   └── examples/          # HTML fixtures
├── __benchmarks__/        # Performance benchmarks
├── .github/
│   ├── specs/             # Feature specifications
│   └── reviews/           # Code/QA review reports
├── build.js               # esbuild config
├── jest.config.js         # Jest config
├── test-server.js         # E2E test server
└── CHANGELOG.md           # Release notes (Keep a Changelog)
```
