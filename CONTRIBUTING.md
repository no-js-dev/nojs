# Contributing to No.JS

Thank you for your interest in contributing to No.JS! Whether you're fixing a bug, adding a feature, improving documentation, or translating content — every contribution makes the framework better for everyone.

This guide will walk you through everything you need to get started.

---

## Table of Contents

- [Contributing to No.JS](#contributing-to-nojs)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
  - [Project Structure](#project-structure)
    - [Framework (`@no-js-dev/nojs`)](#framework-no-js-devnojs)
  - [Development Setup](#development-setup)
    - [Prerequisites](#prerequisites)
    - [Framework](#framework)
    - [LSP](#lsp)
  - [Code Conventions](#code-conventions)
    - [Framework (JavaScript)](#framework-javascript)
    - [LSP (TypeScript)](#lsp-typescript)
    - [General](#general)
  - [Contribution Workflows](#contribution-workflows)
    - [Adding a New Directive](#adding-a-new-directive)
    - [Adding a New Filter](#adding-a-new-filter)
    - [Adding a New Validator](#adding-a-new-validator)
    - [Fixing a Bug](#fixing-a-bug)
    - [Documentation Only](#documentation-only)  - [Adding or Updating Translations](#adding-or-updating-translations)  - [Branch \& Commit Conventions](#branch--commit-conventions)
    - [Branch Naming](#branch-naming)
    - [Commit Messages](#commit-messages)
  - [Pull Request Guidelines](#pull-request-guidelines)
  - [Quality Gates](#quality-gates)
    - [Framework](#framework-1)
    - [LSP](#lsp-1)
    - [Quick Verification](#quick-verification)
  - [Version Management](#version-management)
  - [The LSP Companion](#the-lsp-companion)
  - [Need Help?](#need-help)

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and kind in all interactions.

---

## Getting Started

No.JS consists of **two separate repositories**:

| Repository | Package | Purpose |
| --- | --- | --- |
| [no-js](https://github.com/no-js-dev/nojs) | `@no-js-dev/nojs` | The core framework |
| [nojs-lsp](https://github.com/no-js-dev/nojs-lsp) | `nojs-lsp` | VS Code language server extension |

Most contributions touch the **framework repo**. If your change affects developer tooling (completions, hover docs, diagnostics), you'll need to update the **LSP repo** as well. See [The LSP Companion](#the-lsp-companion) for details.

---

## Project Structure

### Framework (`@no-js-dev/nojs`)

```plaintext
src/
├── index.js              # Public API (NoJS.config, init, directive, filter, etc.)
├── cdn.js                # CDN entry point — exposes window.NoJS, auto-inits
├── globals.js            # All shared state (_config, _filters, _stores, _eventBus)
├── context.js            # Reactive proxy contexts with change tracking & batching
├── evaluate.js           # Expression parser: evaluate(), resolve(), _interpolate()
├── registry.js           # registerDirective(), processTree() — DOM tree walking
├── dom.js                # DOM helpers, template loading, HTML sanitization
├── router.js             # SPA router: path matching, guards, nested routes, prefetch
├── i18n.js               # Locale switching, namespace loading, pluralization
├── filters.js            # 32 built-in filters (side-effect registration)
├── animations.js         # Transitions and stagger support
├── fetch.js              # Declarative HTTP (get/post/put/patch/delete)
├── devtools.js           # Browser devtools bridge
└── directives/           # One file per directive category
    ├── state.js           # state, store, computed, watch
    ├── binding.js         # bind, bind-*, model
    ├── conditionals.js    # if, else-if, show, hide, switch
    ├── loops.js           # each, foreach
    ├── http.js            # get, post, put, patch, delete, call
    ├── events.js          # on-*, debounce, throttle
    ├── styling.js         # class, style
    ├── refs.js            # ref, focus, scroll
    ├── validation.js      # form validation (required, email, url, min, max, custom)
    ├── i18n.js            # t, i18n-ns, i18n-html
    └── dnd.js             # draggable, droppable, sortable

__tests__/               # Jest unit tests (jsdom environment)
e2e/tests/               # Playwright E2E tests
docs/                    # Documentation site
├── md/                  #   Markdown feature docs
├── templates/           #   HTML template files (.tpl)
├── locales/             #   i18n translations (en, es, fr, it, pt)
├── playground/          #   Interactive playground
└── assets/              #   Stylesheets
```

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Framework

```bash
# Clone and install
git clone https://github.com/no-js-dev/nojs.git
cd no-js
npm install

# Build (outputs to dist/)
npm run build

# Start the dev server (docs site at http://localhost:3000)
npm start

# Run unit tests
npm test

# Run E2E tests (requires Playwright browsers)
npx playwright install    # first time only
npm run test:e2e

# Run all tests
npm run test:all
```

### LSP

```bash
git clone https://github.com/no-js-dev/nojs-lsp.git
cd nojs-lsp
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run tests
npm test

# Type check
npx tsc --noEmit
```

---

## Code Conventions

### Framework (JavaScript)

| Convention | Example |
| --- | --- |
| Private API uses `_` prefix | `_config`, `_log()`, `_loadRemoteTemplates()` |
| Public API exported on `NoJS` object | `NoJS.init()`, `NoJS.directive()` |
| Logging via `_log()` / `_warn()` | Never use `console.log` directly |
| Global state lives in `globals.js` | All modules import shared state from there |
| Cache objects use `Map` | `_templateHtmlCache`, `_i18nCache` |
| Side-effect registration | Directives and filters self-register on import |
| One file per module | Directives grouped by category in `src/directives/` |

### LSP (TypeScript)

| Convention | Example |
| --- | --- |
| Strict TypeScript (`strict: true`) | All types explicit |
| Provider functions | `onCompletion`, `onHover`, `onDefinition` |
| Metadata interfaces | `DirectiveMeta`, `FilterMeta` |
| Function-based architecture | No classes — pure functions for parsing/matching |
| Data-driven metadata | Directive/filter/validator info lives in JSON files |

### General

- Keep functions small and focused
- Write tests for all new functionality
- Never use `eval()` or `Function()` on untrusted input — expression evaluation is security-sensitive

---

## Contribution Workflows

### Adding a New Directive

This is the most involved type of contribution. A directive touches both repos and requires documentation and translations.

**Framework checklist:**

- [ ] Create or update the handler in `src/directives/<category>.js`
- [ ] Call `registerDirective(name, handler)` in the handler file
- [ ] Add unit tests in `__tests__/directives-*.test.js`
- [ ] Add E2E tests in `e2e/tests/` with an HTML fixture in `e2e/examples/`
- [ ] Write documentation in `docs/md/`
- [ ] Add i18n keys to **all 5 locales** (`docs/locales/{en,es,fr,it,pt}/`)

**LSP checklist:**

- [ ] Add entry to `server/src/data/directives.json`
- [ ] Add HTML attribute to `data/nojs-custom-data.json`
- [ ] Update relevant test files in `test/unit/`

---

### Adding a New Filter

**Framework checklist:**

- [ ] Add the filter function in `src/filters.js`
- [ ] Add unit tests in `__tests__/filters.test.js`
- [ ] Update documentation in `docs/md/filters.md`

**LSP checklist:**

- [ ] Add entry to `server/src/data/filters.json`
- [ ] Update completion tests in `test/unit/completion.test.ts`

---

### Adding a New Validator

**Framework checklist:**

- [ ] Add the validator in `src/directives/validation.js`
- [ ] Add unit tests in `__tests__/`
- [ ] Add E2E tests in `e2e/tests/forms.spec.ts`
- [ ] Update documentation in `docs/md/forms-validation.md`

**LSP checklist:**

- [ ] Add entry to `server/src/data/validators.json`
- [ ] Update relevant test files in `test/unit/`

---

### Fixing a Bug

- [ ] Write a **failing test** that reproduces the bug
- [ ] Fix the bug
- [ ] Verify **all existing tests** still pass (`npm test && npm run test:e2e`)
- [ ] If the fix affects LSP-visible behavior, update the LSP repo as well

---

### Documentation Only

- [ ] Markdown docs go in `docs/md/`
- [ ] Template files go in `docs/templates/` (`.tpl` extension)
- [ ] i18n: **all 5 locales** must stay in sync — `en` is the source of truth
- [ ] Preview your changes locally with `npm start` (http://localhost:3000)

---

### Adding or Updating Translations

- [ ] Translation files live in `docs/locales/{en,es,fr,it,pt}/`
- [ ] `en` is the source of truth — add new keys there first
- [ ] Add the same keys to **all other 4 locales** with translated values
- [ ] Keys are referenced in templates via the `t="key.path"` attribute
- [ ] Verify key parity: every locale must have the same set of keys

---

## Branch & Commit Conventions

### Branch Naming

Create your branch from `main` using one of these prefixes:

| Prefix | Use for |
| --- | --- |
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring (no behavior change) |
| `chore/` | Tooling, deps, CI, config |

Examples: `feat/drag-handle`, `fix/router-hash-scroll`, `docs/filters-page`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```plaintext
<type>: <short description>

[optional body]
```

**Types:**

| Type | Purpose |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Maintenance (deps, CI, tooling) |
| `test` | Adding or updating tests |

**Examples:**

```plaintext
feat: add drag-handle attribute for sortable lists
fix: prevent router re-render on hash-only popstate changes
docs: add form validation examples to cheatsheet
test: add E2E coverage for wildcard routes
```

---

## Pull Request Guidelines

1. **One concern per PR** — don't mix unrelated changes
2. **Describe what and why** — your PR description should explain the change and the reasoning behind it
3. **Link related issues** — use `Closes #123` or `Fixes #456` in the description
4. **Ensure all quality gates pass** before requesting review (see below)
5. **Keep it reviewable** — if a change is large, consider splitting it into smaller PRs
6. **Respond to feedback** — address review comments promptly and push updates

---

## Quality Gates

All of the following must pass before a PR can be merged.

### Framework

| Gate | Command |
| --- | --- |
| Unit tests (900+) | `npm test` |
| E2E tests (if applicable) | `npm run test:e2e` |
| Build succeeds | `npm run build` |
| i18n key parity (if locale files changed) | All 5 locales have matching keys |

### LSP

| Gate | Command |
| --- | --- |
| Unit tests | `npm test` |
| Type checking | `npx tsc --noEmit` |
| Build succeeds | `npm run compile` |

### Quick Verification

Run this from the framework repo root before pushing:

```bash
npm run build && npm test && npm run test:e2e
```

---

## Version Management

- The framework version lives in **two places**: `package.json` and `src/index.js` — they must always match
- The LSP version must **always match** the framework version
- **Contributors should NOT bump versions** — maintainers handle version bumps and releases

---

## The LSP Companion

The [NoJS LSP](https://github.com/no-js-dev/nojs-lsp) extension provides VS Code IntelliSense for No.JS attributes. When your framework change introduces or modifies a directive, filter, or validator, the LSP needs to be updated so developers get accurate completions, hover docs, and diagnostics.

**Files you may need to update in the LSP repo:**

| File | When to update |
| --- | --- |
| `server/src/data/directives.json` | New or changed directive |
| `server/src/data/filters.json` | New or changed filter |
| `server/src/data/validators.json` | New or changed validator |
| `data/nojs-custom-data.json` | New HTML attribute for VS Code IntelliSense |
| `snippets/nojs.json` | New code snippet |
| `test/unit/*.test.ts` | Any of the above |

If you're not comfortable updating the LSP, note it in your PR description and a maintainer will handle it.

---

## Need Help?

- **Questions?** Open a [Discussion](https://github.com/no-js-dev/nojs/discussions) on GitHub
- **Found a bug?** Open an [Issue](https://github.com/no-js-dev/nojs/issues) with a minimal reproduction
- **First-time contributor?** Look for issues labeled [`good first issue`](https://github.com/no-js-dev/nojs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

We appreciate every contribution, no matter how small. Welcome aboard!
