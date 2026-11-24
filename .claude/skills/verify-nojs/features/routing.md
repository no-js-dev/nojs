# SPA routing

A visitor follows route links and sees the matching template render in the outlet without a page load, with params and query strings bound, guarded routes redirected, history entries usable with Back, and deep links rendering directly.

## Sub-features

- `route-link` renders the matching `<template route>` in `route-view` and sets the active class.
- `route-params` binds `$route.params` from `/users/:id`.
- `route-query` binds `$route.query` from `?q=`.
- `route-guard` redirects a falsy `guard` to its `redirect` target.
- `route-back` restores the previous route on browser Back.
- `route-guard-back` returns to the page the visitor left when Back follows a guard redirect.
- `route-push` navigates from an expression with `$router.push`.
- `route-deep-link` renders a route when the page loads with its hash.

## How to get to it (user POV)

- Open `/e2e/examples/routing.html` (hash mode) and use the nav links `Home`, `About`, `User 42`, `Search`, `Protected`, or the `Go to About` button.
- Load `/e2e/examples/routing.html#/users/7` directly.
- On the docs site, the top navigation (`/`, `/features`, `/docs`, ...) is the same feature in history mode; see [Docs site](./docs-site.md).

## Driving it with verify.mjs

Preconditions:

- `doctor --port <port>` exits 0.

Run `node .claude/skills/verify-nojs/scripts/verify.mjs drive --journey .claude/skills/verify-nojs/journeys/routing.json`.

- **Land on home.** Step `["goto", "/e2e/examples/routing.html"]`. `[data-test=outlet] [data-test=page-home]` is visible.
- **Open About.** Step `["click", "[data-test=nav-about]"]`. URL contains `#/about`, `[data-test=page-about]` renders in the outlet and the home template is gone.
- **Open a param route.** Step `["click", "[data-test=nav-user]"]`. URL contains `#/users/42`; `[data-test=user-id]` reads `42`.
- **Open a query route.** Step `["click", "[data-test=nav-search]"]`. URL contains `#/search?q=hello`; `[data-test=search-query]` reads `hello`.
- **Go back.** Step `["back"]`. URL contains `#/users/42` and the user page renders again.
- **Hit a guard.** Step `["click", "[data-test=nav-protected]"]`. URL contains `#/login`, `[data-test=page-login]` is visible and `[data-test=page-protected]` never renders.
- **Navigate from an expression.** Step `["click", "[data-test=prog-nav]"]`. URL contains `#/about` and the About page renders.
- **Deep link.** Step `["goto", "/e2e/examples/routing.html#/users/7"]`. `[data-test=user-id]` reads `7`.
- **Proof.** Steps `["screenshot", "01-about-via-router-push"]`, `["aria", "01-about-via-router-push"]`, `["screenshot", "02-deep-link"]`.
- **Back after a guard redirect (currently fails).** Run `drive --journey .claude/skills/verify-nojs/journeys/routing-guard-back.json`: About, then Protected (redirected to `#/login`), then `["back"]`. URL should contain `#/about`; it lands on `#/`.

## Gotchas

- `routing-guard-back.json` fails at step 8 on `main` (ede16b0). The guard redirect calls `navigate(redirect, true)` before the blocked URL is ever pushed, so the replace overwrites the entry of the page the visitor clicked from (`#/about`), and Back skips it. Same code path in history mode.
- The fixture runs in hash mode (`router.useHash: true`): assert with `expect-url "#/..."`. History-mode routes (docs site) need `expect-path`.
- `Home` uses `route-active-exact`, the other links `route-active`; the class is `active`. Assert the rendered template, not only the class.
- Route links have no `href`, so they are not exposed as links in the ARIA snapshot (they appear as text) and are not reachable with Tab.
