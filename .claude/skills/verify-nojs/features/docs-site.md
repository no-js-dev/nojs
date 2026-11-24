# Docs site

The no-js.dev documentation site, served from this checkout on the local build, lets a visitor navigate between sections without reloads, switch the interface language from the header dropdown, and come back later to the same language.

## Sub-features

- `docs-home` renders the landing hero.
- `docs-nav` navigates the top links (`/features`, `/docs`, `/examples`, `/faq`, `/playground`) in history mode and loads the section template.
- `docs-lang-switch` changes every `t` string after picking a locale in the `Select language` dropdown (a NoJS-Elements `dropdown`).
- `docs-lang-persist` restores the picked locale after a reload (`i18n persist: true`).

## How to get to it (user POV)

- Open `/` and use the top navigation links.
- Open the language dropdown (button `Select language`, shows the current locale code) and choose `EN`, `ES`, `PT`, `IT` or `FR`.
- At 600 px wide and below the links move into the hamburger drawer (`Toggle navigation menu`) and the language becomes pill buttons.

## Driving it with verify.mjs

Preconditions:

- `doctor --port <port>` exits 0.
- Network access to `cdn-elements.no-js.dev` / `cdn.jsdelivr.net` (the page loads NoJS-Elements from the public CDN).

Run `node .claude/skills/verify-nojs/scripts/verify.mjs drive --journey .claude/skills/verify-nojs/journeys/docs-site.json`.

- **Land.** Step `["goto", "/"]`. `h1.headline` contains `Build the Web.` and `.lang-select-toggle` reads `EN`.
- **Open Docs.** Step `["click", ".nav-links a[route=\"/docs\"]"]`. Pathname is `/docs`, `header.subpage-hero h1.section-title` reads `Documentation` and `#getting-started-introduction` is visible.
- **Switch to Portuguese.** Steps `["click", ".lang-select-toggle"]`, `["click", ".lang-select-menu >> role=menuitem[name=\"PT\"]"]`. The toggle reads `PT`, the Home link reads `Início` and the Docs heading becomes `Documentação` without a reload.
- **Go home.** Step `["click", ".nav-links a[route=\"/\"]"]`. Pathname is `/` and the hero contains `Construa a Web.`.
- **Reload.** Step `["reload"]`. The toggle still reads `PT` and the hero is still Portuguese, although the browser locale is `en-US`.
- **Proof.** Steps `["screenshot", "01-docs-en"]`, `["screenshot", "02-home-pt"]`, `["aria", "03-nav-pt-after-reload", ".nav-links"]`, `["screenshot", "03-home-pt-after-reload"]`.

## Gotchas

- `test-server.js` rewrites only `https://cdn.no-js.dev/` to the local build. NoJS-Elements still comes from `https://cdn-elements.no-js.dev/` (redirects to `nojs-elements@main` on jsDelivr), so the dropdown runs the published Elements, not a local checkout, and the journey fails offline.
- Language options are `role=menuitem`, not buttons. The mobile pills duplicate the codes as buttons, so unscoped `role=button[name="PT"]` is ambiguous.
- The docs site's route links carry `href` next to `route`, so they appear as links in ARIA snapshots (`link "Docs"` with `/url: /docs`). Keep selecting them by `[route="/..."]`: the accessible names change with the locale.
- The page embeds Google Analytics; the harness aborts it and logs one `[error] Failed to load resource: net::ERR_FAILED` in `console.log`. That line is expected.
- The playground (`/playground`) runs the editor in an iframe; it is not mapped yet.
