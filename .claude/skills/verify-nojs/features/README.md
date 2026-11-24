# NoJS core verification map

This directory is the maintained source for verifying what a NoJS site author and the visitor of their site can observe. Read this index before driving, then use the matching feature file as the recipe. Each feature has an executable journey in `../journeys/<feature>.json`.

## Baseline preconditions

- Dependencies installed with `npm ci` in this checkout.
- `dist/iife/no.js` built from the `src/` under test (`launch --build` after any `src/` change).
- A verify server started by this run: `node .claude/skills/verify-nojs/scripts/verify.mjs launch --port <4301-4399>`, and `doctor --port <port>` exits 0.
- Never drive a server this run did not start (another worktree's, the shared `../NoJS` checkout's, or port 3000).

## Driving conventions

- Every journey starts from a fresh browser context with empty storage.
- Fixture handles are `data-test` attributes; docs-site navigation handles are `route` attributes. The router never adds `href`: links written with only `route` (the e2e fixtures) are not `role=link`; docs-site links have `href` written next to `route`.
- Treat every step as literal: keep selectors, quotes and values unchanged.
- Mock only the site's backend under `/api/`. Everything else is served by `test-server.js` from this checkout.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is a screenshot plus an ARIA snapshot from the same drive, with the page identity (fixture title or docs heading) visible.
- Side-effect proof: `expect-request` for HTTP, `reload` for persistence, `back` for history.
- Report the evidence directory (`.verify/evidence/<stamp>-<name>/`) and the journey used with every claim.
- A journey marked "currently fails" in its feature file is still the contract. Report it as failing; never weaken it to pass.
- Do not report an entry point as verified through a different one.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior, followed by exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify.mjs` (starts with `Preconditions:`, then labeled bullets pairing each user action with an exact step and its observable result), and `Gotchas`.

## Features

- [State and binding](./state-binding.md): `state`, `bind`, `model`, `computed`, `watch`, global `store`, `bind-html`, `persist`, external `NoJS.notify()`.
- [SPA routing](./routing.md): route links, outlet, params, query, guards with redirect, history back, `$router.push`, deep links.
- [HTTP data fetching](./http-fetch.md): `get` with loading, error and empty templates, reactive URLs, form `post`.
- [Internationalization](./i18n.md): `t`, interpolation, pluralization, runtime locale switch.
- [Docs site](./docs-site.md): no-js.dev on the local build: navigation, Elements dropdown language picker, persisted locale.

Not yet mapped (fixtures and specs exist under `e2e/`): conditionals, loops, events, filters, styling, templates, animations, SSE, pagination, nested routing, view transitions, security hardening, plugin system.
