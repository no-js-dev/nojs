# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.13.x  | :white_check_mark: |
| 1.12.x  | :white_check_mark: |
| < 1.12  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in No.JS, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **<contact@no-js.dev>** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The affected version(s)
- Any potential impact assessment

### What to expect

- **Acknowledgment** within 48 hours of your report
- **Status update** within 7 days with an assessment and expected timeline
- **Fix and disclosure** coordinated with you before any public announcement

### Scope

The following are in scope:

- Expression evaluation injection or sandbox escapes (`src/evaluate.js`)
- Cross-site scripting (XSS) via directive processing or HTML sanitization (`src/dom.js`)
- Server-side request forgery (SSRF) via fetch directives (`src/fetch.js`)
- Router-based open redirects (`src/router.js`)
- Prototype pollution via reactive contexts (`src/context.js`)

### Out of scope

- Vulnerabilities in third-party dependencies (we have zero runtime dependencies)
- Issues requiring physical access to the user's machine
- Social engineering attacks

## Security Measures

No.JS implements the following security measures:

### Expression evaluation sandbox (`src/evaluate.js`)

- **Zero `eval()` or `new Function()`** — custom recursive-descent parser (tokenizer + AST tree-walker) for all expression evaluation
- **CSP-compliant by default** — no `unsafe-eval` CSP directive required
- **Allow-list for globals** — template expressions can only access an explicit set of safe globals. `_SAFE_GLOBALS` exposes a curated subset of standard JS built-ins (e.g. `Array`, `Object`, `Math`, `JSON`, `Date`, `console`) while `_BROWSER_GLOBALS` opts in to a limited set of browser APIs (e.g. `window`, `document`, `setTimeout`, `Promise`). Network and storage APIs — `fetch`, `XMLHttpRequest`, `localStorage`, `sessionStorage`, `WebSocket`, `indexedDB` — are **not** on the allow-list, so interpolated external data cannot trigger unintended requests from template code
- **Double-layer defense for forbidden properties** — access to `__proto__`, `constructor`, and `prototype` is blocked at two independent layers: (1) the **tokenizer** tags these identifiers as `Forbidden` tokens during lexing, and (2) the **evaluator** checks `_FORBIDDEN_PROPS` at every property access, assignment, and spread operation, returning `undefined` for any match. Both layers must be bypassed for an exploit to succeed

### HTML sanitization (`src/dom.js`)

- **DOMParser-based structural sanitizer** — instead of regex-based stripping (which is bypassable via SVG/MathML event handlers, nested `srcdoc` attributes, and HTML entity encoding), No.JS parses untrusted HTML through the browser's `DOMParser` to build a real DOM tree, then walks the tree to remove dangerous elements (`script`, `style`, `iframe`, `object`, `embed`, `base`, `form`, `meta`, `link`, `noscript`) and strips `on*` event-handler attributes, `javascript:`/`vbscript:` scheme URLs, and non-image `data:` URLs
- **Pluggable sanitizer hook** — set `_config.sanitizeHtml` to a custom function (e.g. DOMPurify) to replace the built-in sanitizer without bundling it as a hard dependency
