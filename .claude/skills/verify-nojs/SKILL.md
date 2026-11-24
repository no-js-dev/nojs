---
name: verify-nojs
description: Launch, health-check and drive the NoJS core framework in a real Chromium browser — the docs site (/) and the per-feature e2e fixture pages (/e2e/examples/*.html) served by test-server.js — and capture screenshots, ARIA snapshots, console and network logs as proof. Use when you need to prove a change to NoJS core (directives, router, fetch, i18n, docs site) works the way a site author or visitor sees it, not just that Jest passes.
---

# verify-nojs

NoJS core has no app of its own. A user is a site author who writes HTML with NoJS directives, and the visitor of that site. This skill proves behavior on two surfaces served from this checkout:

- **Fixture pages** `http://127.0.0.1:<port>/e2e/examples/<area>.html`: one page per feature area, every interactive element has a `data-test` handle. Primary surface.
- **Docs site** `http://127.0.0.1:<port>/`: the real no-js.dev site (SPA in history mode, i18n, Elements dropdowns) running on the local build.

Everything runs through one helper, `scripts/verify.mjs` (Node + the repo's own `@playwright/test` Chromium). Run every command from the repo root. Feature recipes live in [`features/`](features/README.md); ready-made journeys live in `journeys/`.

## Launch

```bash
npm ci                                                        # once per checkout
node .claude/skills/verify-nojs/scripts/verify.mjs launch      # port 4311
node .claude/skills/verify-nojs/scripts/verify.mjs launch --port 4312 --build
```

- Starts `node test-server.js` detached with `PORT=<port>` and `TEST_SERVER_HOST=127.0.0.1`, cwd = repo root. Run state goes to `.verify/run/<port>/` (`server.pid`, `server.log`, `meta.json`).
- Ready means usable: the helper polls until `/__local__/no.js` returns 200 and contains `version:"<package.json version>"` and a fixture page returns 200. It then prints `READY http://127.0.0.1:4311 pid=<pid> nojs=<version> sha=<git sha> log=...`. No `READY` line within 15 s means a failed launch: it prints the server log tail and exits 1.
- `--build` runs `node build.js` first. Use it whenever `src/` changed: fixtures and the docs site load `dist/iife/no.js`, not `src/`. The build rewrites tracked files (`dist/iife/no.js`, `.map`, `dist/compiler/compiler.mjs`); on a clean checkout of `main` it produces no diff. `launch` prints `WARN dist/iife/no.js is older than src/` when you forgot.
- Use a port in 4301-4399. `launch` refuses a port another process holds and refuses to start twice on the same port.
- Do not use `npm start` for verification: `docs/dev-server.js` hardcodes port 3999 (the repo CLAUDE.md still says 3000), so two instances cannot run side by side.

## Doctor

```bash
node .claude/skills/verify-nojs/scripts/verify.mjs doctor --port 4311
```

Read-only. Prints one `OK`/`WARN`/`FAIL` line per check and exits 1 on any `FAIL`:

- the recorded pid is alive and is the process listening on the port;
- that process is `test-server.js` with cwd = this checkout (not a sibling worktree or the shared `../NoJS`);
- `/__local__/no.js` serves the version in `package.json`;
- `dist/iife/no.js` is newer than every file in `src/` (`WARN` otherwise: stop, then `launch --build`);
- Playwright Chromium is installed.

Run it first whenever a drive fails in a way that looks environmental.

## Drive

```bash
node .claude/skills/verify-nojs/scripts/verify.mjs drive --journey .claude/skills/verify-nojs/journeys/state-binding.json
node .claude/skills/verify-nojs/scripts/verify.mjs drive --journey my-journey.json --port 4312 --headed
```

Each drive opens a fresh headless Chromium context (1280x800, locale `en-US`, empty localStorage), runs the journey's steps in order, stops at the first failing step, and exits 0 only if every step passed and the page threw no uncaught error. Requests to Google Analytics are aborted (the docs site embeds gtag), so a drive never sends analytics.

A journey is JSON: `{ "name": "...", "steps": [[verb, ...args], ...] }` (set `"allowPageErrors": true` only for a page that is expected to throw). Selectors are Playwright selector strings. Prefer, in order: `[data-test=...]` on fixtures, `[route="..."]` on docs navigation links, `role=<role>[name="..."]` scoped with `>>`, then a CSS class. `>> nth=0` picks one of several matches; every action is strict, so an ambiguous selector fails instead of guessing.

| Verb | Args | Effect |
| --- | --- | --- |
| `mock` | glob, status, body, `{method, delay, contentType}`? | Answer matching requests (register before `goto`). Object body = JSON, string body = HTML. Only for the site's backend API, which NoJS treats as external. |
| `goto` | path or URL | Navigate, relative to the server base. |
| `click`, `hover`, `check` | selector | User action. |
| `fill` | selector, value | Replace an input's value (fires `input`). |
| `press` | selector, key | Key press on an element, for example `Enter`. |
| `select` | selector, value | Choose a `<select>` option. |
| `reload`, `back` | none | Browser reload or history back. |
| `wait-for` | selector | Wait until visible. |
| `expect-text` | selector, text | Whitespace-collapsed `textContent` equals `text`. |
| `expect-contains` | selector, text | Text contains `text`. |
| `expect-value` | selector, value | Input value equals `value`. |
| `expect-visible`, `expect-hidden` | selector | Visible, or hidden/absent. |
| `expect-count` | selector, n | Exactly `n` matches. |
| `expect-url` | substring | Full URL contains it (hash routes: `#/about`). |
| `expect-path` | pathname | `location.pathname` equals it (history routes: `/docs`). |
| `expect-request` | method, glob, bodyIncludes? | A request was sent, optionally with a body containing the string. Proves side effects. |
| `screenshot` | name | `<name>.png` in the evidence dir. |
| `aria` | name, selector? | ARIA snapshot (`<name>.aria.yml`) of `body` or the selector. |

Expectations poll for up to 5 s (`VERIFY_STEP_TIMEOUT=<ms>` changes it). Fixture pages for areas not yet in the feature map: `animations`, `conditionals`, `events`, `filters`, `loops`, `styling`, `templates`, `sse`, `pagination-*`, `nested-routing`, `security-*`, `view-transitions*` (all under `/e2e/examples/`). Their `e2e/tests/<area>.spec.ts` lists the expected behavior per `data-test` handle; translate a spec into a journey, but drive the page's own controls instead of copying `page.evaluate` shortcuts.

## Evidence

Every drive writes `.verify/evidence/<YYYYMMDD-HHMMSS>-<journey name>/`:

- `steps.log`: one `PASS`/`FAIL` line per step with its arguments and duration.
- `result.json`: pass/fail, failed step and error, git sha, NoJS version, page errors, aborted analytics requests.
- `console.log`: every console message and uncaught page error. The aborted analytics request shows up as `[error] Failed to load resource: net::ERR_FAILED`; NoJS expression errors show up as `[warning] [No.JS] Expression error: ...`.
- `network.jsonl`: one line per request with method, URL, status and request body.
- `<name>.png` / `<name>.aria.yml` for each `screenshot`/`aria` step, plus `failure.png` and `failure.aria.yml` on a failure.

Proof standards:

- Drive the real user path: click the page's own buttons and links, type into its inputs. Do not call `NoJS.*` or set state from a script; that skips the directive under test.
- Capture the action and the resulting state: an `expect-*` step after each action, and a screenshot or ARIA snapshot of the end state.
- Verify side effects next to what is visible: `expect-request` for HTTP calls and bodies, `reload` for persistence (`persist`, i18n `persist: true`), `back` for history entries.
- `mock` only the site's backend (`/api/...`). Never mock `/__local__/no.js`, templates, locale files or the fixture page itself.
- Report a failing step as a failure, with the evidence directory. Do not rewrite a journey until it passes; record the reason in the feature's `Gotchas`.

## Cleanup

```bash
node .claude/skills/verify-nojs/scripts/verify.mjs stop --port 4311
git status --short    # dist/ changes only if you used --build on purpose
```

`stop` kills only the pid recorded in `.verify/run/<port>/server.pid`, and only after confirming it is still this checkout's `test-server.js`; otherwise it refuses. It copies `server.log` to `.verify/evidence/_server-logs/port<port>-<stamp>.log`, then deletes `.verify/run/<port>/`. It never deletes `.verify/evidence/`, which is gitignored and survives every teardown. Never kill by process name (`pkill node`, `killall`): other worktrees and the owner's Docker reference site run Node servers too. Run `stop` after a failed launch or drive as well.

## Helpers

`scripts/verify.mjs` (executable, `#!/usr/bin/env node`):

```bash
node .claude/skills/verify-nojs/scripts/verify.mjs launch [--port 4311] [--build]
node .claude/skills/verify-nojs/scripts/verify.mjs doctor [--port 4311]
node .claude/skills/verify-nojs/scripts/verify.mjs drive  --journey <file.json> [--port 4311] [--name <label>] [--headed]
node .claude/skills/verify-nojs/scripts/verify.mjs stop   [--port 4311]
```

`VERIFY_PORT` sets the default port. Journeys in `journeys/` are the executable form of the recipes in `features/`; keep the two in sync.

## Isolation

- Run state and evidence live in this checkout's `.verify/`, keyed by port, so two worktrees (or two ports in one worktree) can verify side by side.
- Each drive is a new browser context: no cookies or localStorage leak between drives, so persistence is proven with `reload` inside one journey.
- `npm run test:e2e` starts its own `test-server.js` on port 3000 and reuses any server already there. Set `E2E_PORT=43xx` if port 3000 belongs to someone else.
