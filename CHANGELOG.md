# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.13.0] - 2026-05-27

### Changed

- **BREAKING:** DnD directives (`drag`, `drop`, `drag-list`, `drag-multiple`) replaced with deprecation stubs — moved to `@erickxavier/nojs-elements`
- **BREAKING:** `validate` directive replaced with deprecation stub — moved to `@erickxavier/nojs-elements`
- Extracted `error-boundary` to standalone file `src/directives/error-boundary.js` (stays in core)

### Added

- `NoJS.internals` frozen getter exposing semi-private APIs for plugin access: `execStatement`, `cloneTemplate`, `disposeChildren`, `warn`, `validators`, `removeCoreDirective`, `onDispose`
- `_removeCoreDirective(name)` in registry — allows plugins to replace core stub directives
- Deprecation stubs emit clear migration warnings pointing to `@erickxavier/nojs-elements`
- Stub and internals unit tests

### Removed

- `src/directives/dnd.js` (1,162 lines) — replaced by `dnd-stub.js`
- `src/directives/validation.js` (552 lines) — replaced by `validate-stub.js`
- DnD and validation unit tests (migrated to Elements)
- DnD and validation E2E tests (migrated to Elements)

## [1.12.0](https://github.com/ErickXavier/no-js/compare/v1.11.1...v1.12.0) — 2026-05-21

### Added

- Route-index auto-load for nested outlets — empty `[route-view][route-index]` outlets automatically load their default template after navigation ([`dea03c2`](https://github.com/ErickXavier/no-js/commit/dea03c2))
- View Transition API integration for smooth route transitions with presets (`slide`, `fade`, `scale`, `none`) ([`a4db4db`](https://github.com/ErickXavier/no-js/commit/a4db4db))
- Nested routing with hierarchical segment resolution and layout-aware prefetch ([`aae67d5`](https://github.com/ErickXavier/no-js/commit/aae67d5), [`4f9546c`](https://github.com/ErickXavier/no-js/commit/4f9546c))
- `skeleton` attribute on `get` directive for CLS prevention ([`9121824`](https://github.com/ErickXavier/no-js/commit/9121824))
- Route head attributes: `page-title`, `page-description`, `page-canonical`, `page-jsonld` on `<template route>` ([`9cd8605`](https://github.com/ErickXavier/no-js/commit/9cd8605))
- `suppressHashWarning` router option ([`46bb48b`](https://github.com/ErickXavier/no-js/commit/46bb48b))
- Right-side table of contents with scroll spy on doc pages ([`92544b9`](https://github.com/ErickXavier/no-js/commit/92544b9))

### Changed

- Docs layout migrated to nested routing architecture ([`e4b7a4a`](https://github.com/ErickXavier/no-js/commit/e4b7a4a))
- View transitions switched from slide to fade ([`ee25c80`](https://github.com/ErickXavier/no-js/commit/ee25c80))
- All doc templates synced with markdown sources — expanded sections for state management, data binding, events, error handling, filters, animations, and more ([`2fd1c89`](https://github.com/ErickXavier/no-js/commit/2fd1c89))

### Removed

- SSG documentation page and all related i18n keys — SSG was never a framework feature ([`2fd1c89`](https://github.com/ErickXavier/no-js/commit/2fd1c89))
- GitHub Discussions links (replaced with Discord) ([`2fd1c89`](https://github.com/ErickXavier/no-js/commit/2fd1c89))
- 25 dead i18n keys cleaned from all 5 locales ([`2fd1c89`](https://github.com/ErickXavier/no-js/commit/2fd1c89))

### Fixed

- 22 `t-html` attribute misuses across cheatsheet, drag-and-drop, events, i18n, and routing templates ([`2fd1c89`](https://github.com/ErickXavier/no-js/commit/2fd1c89))
- Hash-only navigation skip re-render and unique view-transition-names ([`19ef85d`](https://github.com/ErickXavier/no-js/commit/19ef85d))
- Nested outlets skip in prefetch to prevent 404s ([`3870937`](https://github.com/ErickXavier/no-js/commit/3870937))
- Relative `src` path resolution in nested outlets ([`45e9771`](https://github.com/ErickXavier/no-js/commit/45e9771))
- Horizontal scrollbar during view transitions ([`5751c55`](https://github.com/ErickXavier/no-js/commit/5751c55))
- Missing hero titles on 5 doc pages ([`1e34526`](https://github.com/ErickXavier/no-js/commit/1e34526))
- Styling page broken t-html and heading hierarchy ([`1675a18`](https://github.com/ErickXavier/no-js/commit/1675a18))
- Full docs accuracy audit: removed bundle size claims (dynamic value), fixed 14 incorrect animation names, replaced 7 phantom filters with real ones in reference table, corrected `first`/`last`/`count` filter descriptions, removed fabricated `trigger-bubbles`/`trigger-once` attributes, fixed `NoJS.on('error')` callback signature, replaced `el.__nojs_dispose` with `el.__disposers`, removed nonexistent `route:change` event and `RTL support` claims, updated README version badge and npm package name, removed 9 broken `ssg.md` links, updated test count from 800+ to 1,350+ and filter count from 30+ to 32 across all 5 locales

## [1.11.1](https://github.com/ErickXavier/no-js/compare/v1.11.0...v1.11.1) — 2026-05-20

### Changed

- Unified loop directives in docs — all code examples and live demos now use `foreach` as primary syntax
- Deprecated NoJS-MCP server — removed all references from docs, tests, and agent configs

### Fixed

- Rebuilt dist bundles with v1.11.1 version string

## [1.11.0](https://github.com/ErickXavier/no-js/compare/v1.10.1...v1.11.0) — 2026-03-26

### Added

- Plugin system with lifecycle hooks, interceptors, reactive globals, and security hardening ([`b0c46bc`](https://github.com/ErickXavier/no-js/commit/b0c46bc))
- Head management directives: `page-title`, `page-description`, `page-canonical`, `page-jsonld` ([`8cd58c2`](https://github.com/ErickXavier/no-js/commit/8cd58c2))
- `focusBehavior` option for accessible SPA navigation with configurable focus strategy ([`a940f18`](https://github.com/ErickXavier/no-js/commit/a940f18))
- SSG and pre-rendering guide ([`9fd7bf0`](https://github.com/ErickXavier/no-js/commit/9fd7bf0))
- `bind-html` now emits a `console.warn` in `debug` or `devtools` mode when given a non-literal (dynamic) expression ([`460b883`](https://github.com/ErickXavier/no-js/commit/460b883))
- GitHub Actions CI workflow and npm publishing automation ([`762c739`](https://github.com/ErickXavier/no-js/commit/762c739))

### Fixed

- Replace hardcoded `|| 2000` / `|| 1000` animation fallback timeouts with `|| 0` in `_animateOut`, `_animateIn`, and the `each` / `foreach` animate-leave branches ([`a77136c`](https://github.com/ErickXavier/no-js/commit/a77136c))
- Add missing fallback timeout to `_animateIn` animName branch ([`a420735`](https://github.com/ErickXavier/no-js/commit/a420735))
- Update default template extension to `.tpl` for route rendering ([`69d4fd6`](https://github.com/ErickXavier/no-js/commit/69d4fd6))
- Remove duplicate declarations in `index.js` from plugin system merge ([`2e4834b`](https://github.com/ErickXavier/no-js/commit/2e4834b))

## [1.10.1](https://github.com/ErickXavier/no-js/compare/v1.10.0...v1.10.1) — 2026-03-23

### Security

- Add `set` traps to `document` and `navigator` proxies preventing sandbox escape via property assignment ([`d763d2f`](https://github.com/ErickXavier/no-js/commit/d763d2f))
- Block `navigator.sendBeacon` and add targeted `window` set trap to prevent data exfiltration ([`0faf54a`](https://github.com/ErickXavier/no-js/commit/0faf54a))
- Sanitize flag enforcement, event bus limits, SVG DOMParser hardening, template integrity checks, persist schema validation ([`e0c72ec`](https://github.com/ErickXavier/no-js/commit/e0c72ec))
- Proxy sandbox hardening, expression cache LRU eviction, `nl2br` filter sanitization, devtools redaction ([`6c2d68a`](https://github.com/ErickXavier/no-js/commit/6c2d68a))

### Fixed

- Security hardening across expression evaluator, fetch proxy, DOM binding, and state persistence ([`1f44849`](https://github.com/ErickXavier/no-js/commit/1f44849))
- Documentation accuracy and playground bug fixes ([`1f44849`](https://github.com/ErickXavier/no-js/commit/1f44849))

## [1.10.0](https://github.com/ErickXavier/no-js/compare/v1.9.1...v1.10.0) — 2026-03-23

### Added

- Key-based reconciliation in `each` and `foreach` directives for efficient list diffing ([#19](https://github.com/ErickXavier/no-js/pull/19))
- `persist-fields` attribute to limit which state properties get persisted to storage ([#10](https://github.com/ErickXavier/no-js/pull/10))
- `llms.txt`, `llms-full.txt`, `sitemap.xml`, and inline LLM metadata for AI discoverability
- OG and Twitter Card metadata with thumbnail image

### Fixed

- Replace `globalThis` deny-list with explicit browser globals allow-list in expression evaluator ([#18](https://github.com/ErickXavier/no-js/pull/18))
- Replace regex HTML sanitizer with `DOMParser` structural sanitization in `bind-html` ([#17](https://github.com/ErickXavier/no-js/pull/17))
- Warn when sensitive headers (Authorization, Cookie) are set inline ([#16](https://github.com/ErickXavier/no-js/pull/16))
- Clear outlet and warn when route guard fails without a redirect ([#14](https://github.com/ErickXavier/no-js/pull/14))
- Warn loudly when `sanitize` is explicitly disabled on `bind-html` ([#15](https://github.com/ErickXavier/no-js/pull/15))
- Reduce MutationObserver cost with `subtree:false`; register ResizeObserver via `_onDispose` ([#12](https://github.com/ErickXavier/no-js/pull/12))
- Stop polling and observers when element disconnects from DOM ([#11](https://github.com/ErickXavier/no-js/pull/11))
- Restrict `window.__NOJS_DEVTOOLS__` to localhost only ([#9](https://github.com/ErickXavier/no-js/pull/9))
- Sanitize `javascript:` URLs and encode interpolated `href` values ([#8](https://github.com/ErickXavier/no-js/pull/8))

### Changed

- Cap expression caches and fix `_collectKeys` cache mutation leak ([#13](https://github.com/ErickXavier/no-js/pull/13))
- Fix documentation accuracy across `llms-full.txt` and `llms.txt`
- Add NoJS LSP link to site navigation

## [1.9.1](https://github.com/ErickXavier/no-js/compare/v1.9.0...v1.9.1) — 2026-03-18

### Fixed

- Fix `foreach` directive infinite recursion: strip 15 directive attributes from inline template clone before `processTree` re-entry ([#5](https://github.com/ErickXavier/no-js/issues/5))
- Add `_warn()` call in `evaluate()` catch block for visible error reporting ([#5](https://github.com/ErickXavier/no-js/issues/5))
- Make `_deepMerge`, `_i18nCache`, `_loadedNs`, `_loadLocale` module-private in i18n.js ([#5](https://github.com/ErickXavier/no-js/issues/5))
- Fix docs Example 1 (Login): replace verbose `success` template with `then` + `redirect`
- Fix docs Example 3 (Live Search): replace unsupported `function()` syntax with arrow function
- Fix docs Example 5 (Live Polling): correct `poll` → `refresh` attribute across template and 5 locales

### Added

- 11 new unit tests covering `foreach` inline-template and `evaluate` error-reporting fixes
- Add NoJS LSP link (`https://lsp.no-js.dev/`) to desktop header nav, mobile nav, and footer

## [1.9.0](https://github.com/ErickXavier/no-js/compare/v1.8.2...v1.9.0) — 2026-03-17

### Added

- Custom recursive-descent expression parser — replaces all `new Function()` calls for full CSP compliance
- Statement interpreter with assignment, compound operators (`+=`, `-=`, `*=`, `/=`, `%=`), prefix/postfix `++`/`--`
- Deny-list (`_DENY_GLOBALS`) blocks `eval`, `Function`, `process`, `require`, `importScripts` from globalThis fallback
- Forbidden property checks on `__proto__`, `constructor`, `prototype` in object expressions and member access
- Arrow function rest parameters support in expression evaluator
- 24 new unit tests for statement interpreter

### Changed

- Expression evaluation no longer uses `new Function()` — zero `unsafe-eval` CSP requirement
- `csp` config option deprecated (no longer needed — framework is CSP-compliant by default)
- Documentation updated across 5 locales (en, es, pt, fr, it) reflecting CSP-by-default
- Landing page hero fills viewport height; responsive fixes for 768px and new 480px breakpoint

### Removed

- `csp` option from `NoJS.config()` (shows deprecation warning if used)

## [1.8.2](https://github.com/ErickXavier/no-js/compare/v1.8.1...v1.8.2) — 2026-03-17

### Fixed

- Fix memory leaks across 10 directive files: dispose child contexts before `innerHTML = ""` ([#4](https://github.com/ErickXavier/no-js/issues/4))
- Fix `_watchExpr` in `globals.js`: capture `$watch` unsubscribe and register via `_onDispose` so ancestor-context watchers are cleaned on element disposal ([#4](https://github.com/ErickXavier/no-js/issues/4))
- Fix `on:*` and `trigger` event listeners leaking on re-render: register `removeEventListener` via `_onDispose` ([#4](https://github.com/ErickXavier/no-js/issues/4))
- Fix `bind-*`, `model`, `call`, `drag`, `drag-list` listener/watcher leaks via `_onDispose` cleanup ([#4](https://github.com/ErickXavier/no-js/issues/4))

### Added

- `_disposeChildren(parent)` utility in `registry.js` for safe child disposal before `innerHTML` clear
- 27 new unit tests for disposal behavior across `registry`, `core`, `directives-core`, and `directives-data`

### Changed

- Remove 86 disposable unit tests (duplicates, no-assertion, trivially obvious) identified by QA audit
- Remove landing page E2E tests (docs site tests moved out of scope)
- Remove NPM/ESM install references from documentation (CDN-only distribution)

## [1.8.1](https://github.com/ErickXavier/no-js/compare/v1.8.0...v1.8.1) — 2026-03-17

### Changed

- Redesign landing page v8 with new hero, feature grid, and community sections
- Update all 5 locales (en/es/pt/fr/it) with new landing page translation keys
- Change language switcher from `<a>` to `<button>` for accessibility
- Update README with npm install instructions, `notify()`, drag & drop, and wildcard routes
- Update agent definitions with codebase-first workflow step

### Added

- CONTRIBUTING.md with contribution guidelines
- GitHub issue template for bug reports (`bug_report.yml`)
- Firefox and WebKit browsers to Playwright E2E config
- Landing page E2E tests

## [1.8.0](https://github.com/ErickXavier/no-js/compare/v1.7.0...v1.8.0) — 2026-03-16

### Added

- `NoJS.notify()` public API to flush store watchers after external JS mutations to `NoJS.store` ([`5317c83`](https://github.com/ErickXavier/no-js/commit/5317c83))
- Documentation for `NoJS.notify()` with interceptor and cart examples ([`5317c83`](https://github.com/ErickXavier/no-js/commit/5317c83))
- `route="*"` wildcard catch-all route support with built-in 404 fallback ([`1fe73b0`](https://github.com/ErickXavier/no-js/commit/1fe73b0))
- `$route.matched` boolean for matched/unmatched route detection ([`1fe73b0`](https://github.com/ErickXavier/no-js/commit/1fe73b0))
- Guard and redirect attributes on wildcard route templates ([`1fe73b0`](https://github.com/ErickXavier/no-js/commit/1fe73b0))
- Graceful handling of failed template loads with `__loadFailed` flag ([`1fe73b0`](https://github.com/ErickXavier/no-js/commit/1fe73b0))
- Call directive: loading template support with element disable during request ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- Call directive: AbortController switchMap — abort previous in-flight on re-click ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- Call directive: custom headers attribute support ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- Call directive: redirect attribute for SPA navigation on success ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- Call directive: `fetch:success` / `fetch:error` events and devtools bridge integration ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- Call directive: default `as` to `"data"` when not specified ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- Call directive: error body included in error template context ([`1f5517e`](https://github.com/ErickXavier/no-js/commit/1f5517e))
- GitHub Copilot agent definitions and project instructions ([`37d5136`](https://github.com/ErickXavier/no-js/commit/37d5136))

### Changed

- Router: migrate from `mode:"history"/"hash"` to `useHash` boolean API (default `false`) ([`c102df3`](https://github.com/ErickXavier/no-js/commit/c102df3))
- Router: backward-compat shim for `mode:"hash"` → `useHash:true` with deprecation warning ([`c102df3`](https://github.com/ErickXavier/no-js/commit/c102df3))
- Router: fix base stripping with anchored regex via `_stripBase()` helper ([`c102df3`](https://github.com/ErickXavier/no-js/commit/c102df3))
- Router: fix anchor link scroll in history mode (now intercepts in both modes) ([`c102df3`](https://github.com/ErickXavier/no-js/commit/c102df3))
- Router: add popstate same-path guard to prevent re-render on hash-only changes ([`c102df3`](https://github.com/ErickXavier/no-js/commit/c102df3))
- Router: skip wildcard routes during prefetch ([`1fe73b0`](https://github.com/ErickXavier/no-js/commit/1fe73b0))

### Fixed

- E2E form validation tests (8, 13, 14, 16) now interact with fields before asserting errors, matching pristine-aware validation ([`5317c83`](https://github.com/ErickXavier/no-js/commit/5317c83))

## [1.7.0](https://github.com/ErickXavier/no-js/compare/v1.6.1...v1.7.0) — 2026-03-13

### Added

- Complete form validation revamp with declarative HTML-first API ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Built-in validators: `required`, `email`, `url`, `min`, `max`, `custom` ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Per-rule error messages via `error-{rule}` attributes (e.g. `error-required="Field is required"`) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.errors` object with per-field error messages ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.firstError` — first error message in DOM order ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.errorCount` — count of invalid fields ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.fields` — per-field state (`valid`, `dirty`, `touched`, `error`, `value`) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.values` — reactive form values object ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.pending` — async validator support ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `$form.reset()` — reset form state (dirty, touched, errors) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `error-class` attribute for automatic CSS class toggling on invalid fields ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `validate-on` attribute to control validation trigger (`input`, `blur`, `submit`) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `validate-if` attribute for conditional field validation ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Error template references (`error-required="#tpl"`) for custom error rendering ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Pristine-aware validation: errors only display for fields the user has interacted with ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Submit automatically marks all fields as touched (revealing all errors) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- E2E test suite for form validation (Playwright) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Updated docs with interactive Registration Form demo ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- Updated all locale files (en, es, fr, it, pt) with new form demo content ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))

### Removed

- `cpf`, `cnpj`, `phone`, `creditcard` validators (region-specific, use `custom` instead) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `between` validator (use `min` + `max` instead) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))
- `match` validator (use `custom` instead) ([`cad7be4`](https://github.com/ErickXavier/no-js/commit/cad7be4))

## [1.6.1](https://github.com/ErickXavier/no-js/compare/v1.6.0...v1.6.1) — 2026-03-13

### Changed

- Migrate CDN URL from `unpkg.com` to `cdn.no-js.dev` across all files
- Update README, docs site, playground engine, and getting-started templates
- Update FAQ answers across all locales (en, es, fr, it, pt)
- Update dev-server and test-server CDN rewrite patterns
- Update design file references

## [1.6.0](https://github.com/ErickXavier/no-js/compare/v1.5.2...v1.6.0) — 2026-03-12

### Added

- DevTools Protocol module (`src/devtools.js`) with zero-overhead event emission
- Context lifecycle tracking: `ctx:created`, `ctx:updated`, `ctx:disposed` events
- Element inspection API: `inspect(selector)`, `inspectTree(selector)`
- Store inspection: `inspectStore(name)`, `get:stats`, `get:routes` commands
- Runtime mutation: `mutate(id, key, value)`, `mutateStore(name, key, value)`
- Visual highlight overlay for element selection from DevTools
- Custom event bus: `nojs:devtools` (emit), `nojs:devtools:cmd` (commands)
- Batch lifecycle events: `batch:start`, `batch:end`
- Fetch lifecycle events: `fetch:success`, `fetch:error`
- Route navigation events: `route:navigate`
- Store creation events: `store:created`
- Directive init events: `directive:init`
- Context registry with automatic disposal cleanup
- `window.__NOJS_DEVTOOLS__` public API with inspect/mutate/highlight/on
- 428-line DevTools test suite (937 tests total across 14 suites)

## [1.5.2](https://github.com/ErickXavier/no-js/compare/v1.5.1...v1.5.2) — 2026-03-11

### Removed

- Vanilla JS FAQ close-animation handler — `<details>/<summary>` now handles open/close natively ([`6ef3251`](https://github.com/ErickXavier/no-js/commit/6ef3251))
- `.faq-closing` CSS and `faq-slide-out` keyframes (no longer needed) ([`6ef3251`](https://github.com/ErickXavier/no-js/commit/6ef3251))

## [1.5.1](https://github.com/ErickXavier/no-js/compare/v1.5.0...v1.5.1) — 2026-03-11

### Added

- Floating scroll-to-top button on mobile
- Doc tables horizontal scroll on mobile

### Changed

- Mobile nav popover alignment now uses header height CSS variable
- Language selector uses CSS grid 3-column layout
- GitHub/Discord links displayed side-by-side in mobile popover
- Code panel scrollability improvements (`overflow: auto`)
- CSS globalization: sidebar/doc-layout CSS moved from per-page files to global `style.css`
- CSS-to-template migration: moved per-page CSS from external files into template `<style>` blocks

### Removed

- "Get Started" CTA from mobile popover (low contrast issue)

### Fixed

- Mobile nav popover alignment

## [1.5.0](https://github.com/ErickXavier/no-js/compare/v1.4.3...v1.5.0) — 2026-03-11

### Added

- Discord community link in header nav icon, footer, FAQ sidebar, and FAQ CTA buttons
- `discord` translation key across all 5 locales (en, pt, es, fr, it) in `shell.json` and `faq.json`
- Community section in README with Discord and GitHub Discussions links
- Logo in README header with vertical alignment
- Changelog link in README Contributing section
- `CHANGELOG.md` with full version history (1.0.0–1.4.3)
- Dark logo assets: `logo-dark.svg`, `logo-dark.png`, `logo-dark-round.png`
- CHANGELOG update step in release agent workflow

### Changed

- Redesign footer as horizontal nav mirroring header menu (Features, Examples, FAQ, Playground, Docs, GitHub, Discord)
- Discord icon hover uses brand color (#5865F2)

## [1.4.3](https://github.com/ErickXavier/no-js/compare/v1.4.2...v1.4.3) — 2026-03-10

### Fixed

- Make `init()` idempotent — prevent double router creation when `cdn.js` auto-init and user scripts both call `NoJS.init()` ([`c71d290`](https://github.com/ErickXavier/no-js/commit/c71d290))

## [1.4.2](https://github.com/ErickXavier/no-js/compare/v1.4.0...v1.4.2) — 2026-03-10

### Changed

- Rewrite FAQ content across all 5 locales (en, pt, es, fr, it) with improved tone and accuracy ([`8b1c997`](https://github.com/ErickXavier/no-js/commit/8b1c997))

### Fixed

- Fix i18n locale persistence — saved locale from `localStorage` was being ignored on reload ([`8b1c997`](https://github.com/ErickXavier/no-js/commit/8b1c997))

## [1.4.0](https://github.com/ErickXavier/no-js/compare/v1.3.1...v1.4.0) — 2026-03-10

### Added

- Route prefetching and subtemplate cache warming ([`a71b63a`](https://github.com/ErickXavier/no-js/commit/a71b63a))
- FAQ page with full i18n support ([`a71b63a`](https://github.com/ErickXavier/no-js/commit/a71b63a))
- CSS split into modular files ([`a71b63a`](https://github.com/ErickXavier/no-js/commit/a71b63a))

### Changed

- Hide FAQ navigation links during initial setup ([`3cee1ee`](https://github.com/ErickXavier/no-js/commit/3cee1ee))

## [1.3.1](https://github.com/ErickXavier/no-js/compare/v1.3.0...v1.3.1) — 2026-03-09

### Added

- Locale keys for drag-and-drop docs, examples, and playground UI ([`5765bd8`](https://github.com/ErickXavier/no-js/commit/5765bd8))

## [1.3.0](https://github.com/ErickXavier/no-js/compare/v1.2.1...v1.3.0) — 2026-03-09

### Added

- Complete i18n coverage for all doc templates, playground demos, and locale JSON files ([`d762f00`](https://github.com/ErickXavier/no-js/commit/d762f00))
- `t=` directives on all doc templates with synced locale keys ([`49ce64c`](https://github.com/ErickXavier/no-js/commit/49ce64c))

## [1.2.1](https://github.com/ErickXavier/no-js/compare/v1.2.0...v1.2.1) — 2026-03-05

### Fixed

- GitHub link in `build.js` ([`62a1d0f`](https://github.com/ErickXavier/no-js/commit/62a1d0f))

## [1.2.0](https://github.com/ErickXavier/no-js/compare/v1.1.0...v1.2.0) — 2026-03-05

### Added

- Drag-and-drop system with `drag`, `drop`, `drag-disabled`, `drop-max` directives ([`0bc4490`](https://github.com/ErickXavier/no-js/commit/0bc4490))
- Interactive playground with live code editing ([`0bc4490`](https://github.com/ErickXavier/no-js/commit/0bc4490))
- Comprehensive codebase audit and documentation overhaul ([`0bc4490`](https://github.com/ErickXavier/no-js/commit/0bc4490))

## [1.1.0](https://github.com/ErickXavier/no-js/compare/v1.0.2...v1.1.0) — 2026-03-03

### Added

- File-based routing with `route-view` and `src` attributes ([`bb61fe7`](https://github.com/ErickXavier/no-js/commit/bb61fe7))
- External i18n locale loading from JSON files ([`bb61fe7`](https://github.com/ErickXavier/no-js/commit/bb61fe7))
- `t-html` directive for HTML content translation ([`bb61fe7`](https://github.com/ErickXavier/no-js/commit/bb61fe7))
- GitHub Actions workflow for automated npm publishing ([`270a4d0`](https://github.com/ErickXavier/no-js/commit/270a4d0))

### Fixed

- Memory leak cleanup in reactive watchers ([`4358b75`](https://github.com/ErickXavier/no-js/commit/4358b75))

## [1.0.2](https://github.com/ErickXavier/no-js/compare/v1.0.1...v1.0.2) — 2026-02-28

### Added

- End-to-end test suite with Playwright ([`12fec61`](https://github.com/ErickXavier/no-js/commit/12fec61))

### Fixed

- Reactive directive binding issues ([`12fec61`](https://github.com/ErickXavier/no-js/commit/12fec61))

## [1.0.1](https://github.com/ErickXavier/no-js/compare/v1.0.0...v1.0.1) — 2026-02-27

### Added

- Anchor links support in hash-mode documentation ([`db4b69d`](https://github.com/ErickXavier/no-js/commit/db4b69d))
- Custom domain (CNAME) configuration ([`a79c780`](https://github.com/ErickXavier/no-js/commit/a79c780))

## [1.0.0](https://github.com/ErickXavier/no-js/releases/tag/v1.0.0) — 2026-02-27

### Added

- Core reactive engine with `state`, `bind`, `show`, `hide`, `if`, `else`, `switch`, `case` directives
- Event handling with `on:` prefix
- `each` directive for list rendering
- `model` directive for two-way data binding
- CSS class bindings with `class-*` and `style-*` directives
- `fetch` directive for declarative data fetching
- Client-side router with hash and history modes
- i18n system with `t` directive
- Animation system with `animate` and `transition` directives
- Scoped context system with parent inheritance
- Filter system with `|` pipe syntax
- Zero dependencies
