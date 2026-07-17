# NoJS Core — Security Audit (2026-07)

- **Task:** NOJS-289 (T6 of EPIC NOJS-283)
- **Target:** NoJS Core framework, `src/`, built bundle `dist/iife/no.js` @ `origin/main` 8beef83 (v1.20.0)
- **Auditor role:** adversarial security review, exploitability-first
- **Verdict:** **No exploitable High/Critical/Medium findings.** 6 defense-in-depth / hardening observations (all LOW), none reachable under the threat model. The code is defensively built and the sandbox holds under runtime battery testing.

## Threat model

Attacker controls **untrusted DATA** (HTTP/SSE response bodies, URL/route params, query strings, `localStorage`) **or is a third-party plugin**. The attacker is **NOT** the page author. Template expressions, directive attributes, and route/redirect attributes are author-authored and therefore trusted. The security goal: untrusted data must never become executable code or active markup (event handlers, script, dangerous URL schemes), and the documented redaction/freeze boundaries must hold.

Note on plugins: NoJS has **no plugin sandbox** — a plugin's `install(NoJS, options)` runs arbitrary JS in the page. "Malicious plugin runs code" is therefore not itself a finding; a plugin finding only matters if it defeats a boundary the framework explicitly advertises (header redaction, response redaction, core-directive freeze) in a way the plugin could not already trivially achieve.

## Methodology

- Manual source review of the CSP-safe evaluator (`evaluate.js`), plugin system (`index.js`), directive registry (`registry.js`), reactive context (`context.js`), HTML sanitizer (`dom.js`), attribute sanitizer (`binding.js`), router (`router.js`), head directives (`head.js`), state/persist (`directives/state.js`), and the previously-completed SSE + fetch layer.
- **Runtime battery testing** against the real built bundle loaded inside the project's jsdom realm (`runScripts: 'dangerously'`, so all globals resolve as in a browser):
  - 34-payload XSS/mXSS battery driven end-to-end through `bind-html` → `_sanitizeHtml` → live `innerHTML` (the real parse→serialize→reparse pipeline, i.e. the mutation-XSS surface).
  - 41-expression sandbox-escape battery driven through `bind` → `evaluate`, with `document.cookie` seeded, checking every result for code-exec primitives and sensitive-global leakage.
- Harnesses: `scratchpad/sanitizer-battery2.js`, `scratchpad/evaluator-escape.js` (reproducible; not committed).

---

## Angle 1 — Evaluator sandbox escape (`evaluate.js`) — CLEAN

Reviewed both evaluation paths (tree-walking interpreter and the compiled-closure path; the bundle uses the compiled path by default) and confirmed parity of every guard.

Defenses verified in code AND at runtime:

- **`_FORBIDDEN_PROPS`** (`evaluate.js:725`) blocks `__proto__`, `constructor`, `prototype`, `alert`, `confirm`, `prompt` on **every** member read and call, in both interpreter (`:1137,1158,1205`) and compiled (`:1492,1508,1522,1538,1586,1601`) paths, including computed access `x['constructor']`.
- **`_rewrapResult`** (`:985`) neutralizes the real `Function`/`eval` to `undefined` by identity, and re-wraps any same- or cross-realm `Document`/`Window` (incl. iframe `contentDocument`/`contentWindow` via `nodeType===9` / `val.window===val` duck-typing) back to the safe proxies.
- **`_FORBIDDEN_REALM_ACCESSORS`** (`:739`) refuses `contentDocument`/`contentWindow`/`frames`/`parent`/`top`/`self` off raw DOM elements (NOJS-239 fix).
- **Allow-list identifier resolution** (`_inScope` own-property walk stopping before `Object.prototype`, `_inSafeGlobals` own-key only) — inherited natives never resolve.
- **`_safeObject`** (`:757`) exposes only enumerable statics; every reflection/prototype static (`getOwnPropertyDescriptor`, `getPrototypeOf`, `defineProperty`, `create`, …) is omitted, closing the `Object.getOwnPropertyDescriptor(...).value` → `Function` walk (F3).
- **Proxy wrappers** block `fetch`/`eval`/`Function`/`localStorage`/`XMLHttpRequest`/`WebSocket`/`open`/`postMessage` on `window`; `cookie`/`write`/`domain` on `document`; navigation on `location`/`history`; `sendBeacon`/`credentials` on `navigator`. Timers reject string callbacks.
- **`_globals`** is `Object.create(null)` (`globals.js:41`) — prototype-free; `$name` resolution uses `in`/bracket safely with no prototype-chain reach.

**Runtime result:** all 41 escape expressions returned empty/undefined. `constructor.constructor('return 1')()`, `Function('return 9')()`, `eval('10')`, `[].map.constructor(...)()`, `String.fromCharCode(65).constructor.constructor(...)()`, `$store.constructor.constructor(...)()`, `document.cookie`, `window.eval`, `window.fetch`, `window.localStorage`, `navigator.sendBeacon`, `document.defaultView.eval`, `setTimeout('alert(1)',0)` → **all blocked**. `window`/`document` resolve only to the hardened safe proxies (every sensitive sub-property blocked).

**LRU expression cache:** keyed by exact expression string → pure compiled closure `(ctx, locals) ⇒ value`. Data flows only as `ctx`/`locals` arguments; no data-dependent cache key or shared mutable compiled state. No cross-expression poisoning. Bounded by `exprCacheSize`. CLEAN.

## Angle 2 — Plugin / context (`index.js`, `registry.js`, `context.js`) — CLEAN (2 hardening notes)

- **Plugin-globals validation (`NoJS.global`, `index.js:274`).** Blocks `__proto__`/`constructor`/`prototype` names, reserved names, invalid identifiers, and direct `eval`/`Function`/`window.eval`/`window.Function` refs (`_DANGEROUS_REFS`). Plain-object values are JSON round-tripped (drops functions and defuses nested refs); non-serializable values run `_deepCheckUnsafe` (throws on forbidden keys or eval/Function refs, recursively). A plugin storing its **own** helper function as a global is expected and equivalent to the plugin calling it directly — not an escalation, and it cannot smuggle the real `eval`/`Function` (blocked by identity at `:299` and `_rewrapResult`). No path lets plugin-globals surface a code-exec primitive to a template expression.
- **`internals.removeCoreDirective` freeze bypass — hardening H5.** `_removeCoreDirective` (`registry.js:33`) deletes a name from `_coreDirectives`+`_directives`; a subsequent `registerDirective` of that name then succeeds (the freeze check keys on `_coreDirectives.has(name)`). So any code holding the `NoJS` reference — including a plugin — can remove and replace a core directive (e.g. swap sanitizing `bind-html` for an unsanitized one). **Not exploitable as an escalation:** `NoJS.internals` is documented "for trusted plugins", plugins are already arbitrary JS, and the same plugin could equally set `_config.sanitizeHtml`, monkeypatch, or `document.write`. The freeze protects against *accidental* collisions, not malicious plugins. Hardening only: the `internals` escape hatch has no trust gate; document that plugins are fully trusted, or gate it behind an explicit capability.
- **Wildcard-directive shadowing — CLEAN.** `_MATCH_PATTERNS` (`registry.js:49`) is `Object.freeze`d and static (`class-*`, `on:*`, `style-*`, `bind-*` only). A plugin cannot introduce a new wildcard pattern, and cannot register any of the four (they are frozen core directives). No shadowing of core matching is possible.
- **Prototype pollution via context — CLEAN.** `set` trap and `$set` (`context.js:156,198`) reject `__proto__`/`constructor`/`prototype` path parts; `has` and `get` never expose them. `_FORBIDDEN_CTX_KEYS` enforced.

## Angle 3 — HTML sanitizer mutation (`_sanitizeHtml`, `dom.js:169`) — CLEAN (1 hardening note)

Structural DOMParser-based sanitizer: parse once, walk the tree, remove `_BLOCKED_TAGS` (script, style, iframe, object, embed, base, form, meta, link, noscript, **svg, math, template, xmp**, applet) with their subtrees, strip `on*` attributes and `javascript:`/`vbscript:`/`blob:`/non-image-`data:` URL schemes (with U+0000–U+0020 control/whitespace collapse to defeat `java\tscript:` and entity tricks), and deep-sanitize `data:image/svg+xml` URIs.

**Runtime battery (34 payloads, end-to-end through the live `bind-html` → `innerHTML` sink): 0 bypasses.** Confirmed neutralized: `<img onerror>`, `<script>`, `javascript:`/mixed-case/tab-split/entity-encoded URLs, `<iframe javascript:>`, `<svg><script>`, `<svg onload>`, MathML/`mglyph`/`annotation-xml`-style namespace-confusion mXSS, `<svg></p><style>...` foreign-content breakout, `<noscript>` scripting-flag mXSS, `data:text/html`, `<base>`, `<meta refresh>`, `on\tclick` (tab splits it into an inert bogus attribute), `xlink:href`, `<image>`, `<video><source onerror>`, `<details ontoggle>`.

Why the parse→serialize→reparse (mutation-XSS) surface is closed here: the classic browser-only mXSS gadgets all require foreign content (`svg`/`math`) or scripting-flag-ambiguous / rawtext-ambiguous hosts (`noscript`/`style`/`template`/`xmp`) — **all removed at the tag level**, subtree included. Once serialized, the output string contains none of them, so a live reparse cannot spontaneously reintroduce foreign content. Attribute values are quote/`&`-escaped on serialization, closing attribute breakout.

- **Hardening H6:** `noembed`, `noframes`, `plaintext`, `textarea`, `title` are not in `_BLOCKED_TAGS`. Verified inert — they are always-RAWTEXT (`noembed`/`noframes`/`plaintext`) or RCDATA-escaped-on-serialize (`textarea`/`title`), so their contents parse identically (as text) in both the sanitizer and live-insertion contexts and never become active. Adding the always-rawtext trio to the blocklist is defense-in-depth only.

## Additional scoped areas

- **CSRF token handling — FIXED, CLEAN.** `fetch.js:127-142` gates the token on a real origin comparison `new URL(fullUrl.replace(/\\/g,'/'), location.href).origin === location.origin`. Protocol-relative `//evil.com`, backslash `\evil.com`, uppercase scheme → not same-origin → no token; parse failure fails closed. Not reachable via untrusted data (URL interpolation percent-encodes, so data cannot change origin).
- **Storage persistence (`state.js:44-98`) — CLEAN.** Restore blocks `__proto__`/`constructor`/`prototype` and **all** `__`-prefixed keys (line 52,56), then routes values through `ctx.$set` (which re-blocks forbidden path parts). `persist-schema` further restricts to keys present in `initialState` with type matching. `persist-fields` allow-lists. Nested `__proto__` surviving `JSON.parse` is stored inert (values are held, never `Object.assign`-merged into a plain object, and every read/spread path blocks dunder keys). Save side strips `__`-keys and honors the allow-list. No prototype pollution, no internal-key injection.
- **Router guard bypass / open redirect (`router.js`) — CLEAN (1 hardening note).** Guard `redirect` attributes are author-static (read raw via `getAttribute`, never interpolated from data). `navigate` updates the URL only via `history.pushState`/`replaceState` (browser-enforced same-origin — throws on cross-origin) or `location.hash` (same-origin by construction). Route params flow into `$route.params` as data and reach HTML only through `_sanitizeHtml`/`bind` textContent.
  - **Hardening H4:** `_isSafeRedirect` (`router.js:22`) returns `true` for `//host` (matches `startsWith('/')`). Mitigated in depth (redirect is author-static; `pushState('//host')` throws cross-origin), so not exploitable — but tightening to reject `//` would remove the latent foot-gun.
- **`page-jsonld` head injection (`head.js:153`, `router.js:359`) — CLEAN.** Output is written to a `type="application/ld+json"` (non-executable) `<script>` via `textContent`, with `</` → `<\/` escaping preventing `</script>` breakout even when untrusted data is interpolated into the JSON template. `page-canonical`/`page-description` write to inert `<link rel=canonical>`/`<meta>` (non-navigable, non-executing).

---

## Salvaged section — SSE + HTTP/Fetch layer (completed prior, folded in verbatim)

**Verdict:** No exploitable High/Critical in the SSE surface or HTTP/fetch layer.

**Load-bearing defense — URL interpolation encoding.** `_interpolate` (`evaluate.js:2223-2229`) wraps every `{expr}` substitution in `encodeURIComponent(String(val))`. Untrusted data injected into any URL template (`sse="{x}"`, `get="{x}"`, `get="https://api/{x}"`) can never introduce `:` / `/` / `//` / `\` — it is confined to path/query content on an author-fixed origin and cannot change scheme or origin. Applies to SSE (`sse.js:236`) and HTTP (`http.js:349`); params encode via `URLSearchParams` (`http.js:357-370`).

**CSRF cross-origin — FIXED, CLEAN** (see Additional scoped areas above; `fetch.js:127-142`).

**SSE — CLEAN.** (1) URL interpolation → `EventSource` origin is percent-encoded, stays on author origin. (2) SSE message → context → HTML sink: `e.data` is JSON-parsed/stored as plain data; only the `bind-html` sink routes through `_sanitizeHtml` (`binding.js:52`). (3) Error template is hardcoded `{message:"SSE connection closed"}` — no reflected server text. (4) `then` expr is author code; attacker `$event` is data-only under the allow-list evaluator. (5) `into` store name/`as` key are author attributes; only data flows. (6) Connection Map keyed by origin, used only for the >6-connection warning; never reused/shared; `_openConnection` closes+untracks old; `_onDispose(_closeConnection)`; handlers guard `el.isConnected`. No hijack/leak.

**Fetch — CLEAN.** Request-header redaction (`fetch.js:146-211`) strips `_SENSITIVE_HEADERS` (authorization/cookie/x-api-key/x-csrf-token + `/^x-(auth|api)-/i`) before untrusted interceptors, re-applies for trusted/after-chain. Response redaction (`fetch.js:44-59,249-250`) hands untrusted interceptors a frozen `_redactResponse` shell; the real Response lives in a module-private WeakMap. Cache key is `method:url[:body]` with the URL carrying encoded untrusted data → distinct keys.

**Salvaged hardening observations (not untrusted-data-exploitable):**
- **H1 — Credentialed SSE has no same-origin guard (parity gap with CSRF).** `sse.js:66/148` `sse-credentials` → `new EventSource(url,{withCredentials:true})` with no same-origin restriction. Only bites if an author hardcodes a foreign origin + `sse-credentials`; not reachable by untrusted data. Fix: warn/block credentials when the resolved EventSource origin ≠ `location.origin`, mirroring fetch CSRF.
- **H2 — Request interceptors receive un-redacted URL and body (asymmetry vs response interceptors).** `fetch.js:170` passes the raw `fullUrl` to request interceptors while `fetch.js:250` passes `_redactUrlParams(fullUrl)` to response interceptors; `interceptorOpts` (165-167) includes `opts.body`. An untrusted plugin's request interceptor thus sees full URL query (`?api_key=…`) + body (password/token) even though the framework redacts equally-sensitive **headers** from that same interceptor. Defense-in-depth gap (a plugin could also monkeypatch `fetch`), but worth closing for redaction parity: apply `_redactUrlParams` to the URL for untrusted request interceptors and document that bodies are not redacted.
- **H3 — Cache ignores headers/credentials.** `fetch.js:323/355` + `http.js:394` key on method+URL(+body) only; the same URL under different auth contexts (anon vs `Authorization`) collides. Correctness/isolation hazard, not untrusted-data-exploitable. Fix: fold a credentials-mode/auth discriminator into the cache key, or document.

---

## "Checked, clean" summary

| Area | Result |
|------|--------|
| Evaluator sandbox (interpreter + compiled), `constructor`/`Function`/`eval` reach, realm escape, prototype pollution | CLEAN (41/41 blocked at runtime) |
| LRU expression-cache poisoning | CLEAN |
| Plugin-globals eval/Function smuggling | CLEAN |
| Core-directive freeze / wildcard shadowing | CLEAN (H5 hardening) |
| HTML sanitizer XSS/mXSS (bind-html, t-html) | CLEAN (34/34 blocked at runtime; H6 hardening) |
| Attribute-value sanitizer (`bind-*` URL schemes) | CLEAN |
| CSRF cross-origin token leak | FIXED / CLEAN |
| Storage persist restore (dunder inject, prototype pollution, schema) | CLEAN |
| Router guard bypass / open redirect | CLEAN (H4 hardening) |
| page-jsonld / head injection | CLEAN |
| SSE surface | CLEAN (H1 hardening) |
| HTTP/fetch redaction + cache | CLEAN (H2, H3 hardening) |

## Hardening backlog (all LOW, none exploitable — no GitHub issues filed)

| ID | Area | File | Suggested fix |
|----|------|------|---------------|
| H1 | Credentialed SSE same-origin parity | `sse.js:66,148` | Block/warn `withCredentials` when EventSource origin ≠ `location.origin` |
| H2 | Request-interceptor URL/body redaction parity | `fetch.js:170` | `_redactUrlParams` the URL for untrusted request interceptors; document body exposure |
| H3 | Cache key ignores auth/credentials | `fetch.js:323,355`, `http.js:394` | Add credentials/auth discriminator to the cache key |
| H4 | `_isSafeRedirect` accepts `//host` | `router.js:22` | Reject values starting with `//` (protocol-relative) |
| H5 | `internals.removeCoreDirective` freeze bypass | `registry.js:33`, `index.js:580` | Gate `internals` behind an explicit capability, or document plugins as fully trusted |
| H6 | Sanitizer blocklist omits always-rawtext tags | `dom.js:163` | Add `noembed`, `noframes`, `plaintext` for defense-in-depth |

## Recommendation

No release-blocking issues. H4 and H6 are one-line, zero-risk changes that can fold into the current **v1.20.1** patch (hand to @lead → dev). H1/H2/H3/H5 are small, self-contained hardening tasks for a follow-up. Coverage note: a security audit's coverage improves with additional independent runs; a future run should weight toward creative/business-logic chaining and the animation/dnd/error-boundary directives not deeply exercised here.
