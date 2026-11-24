# HTTP data fetching

A site author binds server data with `get`, shows loading, error and empty templates while it arrives, refetches when a bound value in the URL changes, and submits forms with `post`; the visitor sees each state and the request really goes out.

## Sub-features

- `fetch-get-list` renders a fetched array with `each`.
- `fetch-loading` shows the `loading` template until the response arrives.
- `fetch-error` shows the `error` template on a 5xx.
- `fetch-empty` shows the `empty` template for an empty array.
- `fetch-reactive-url` refetches `/api/users/{userId}` when the bound input changes.
- `fetch-form-post` submits a form body and shows the `success` template.

## How to get to it (user POV)

- Open `/e2e/examples/fetch.html`; each section is one sub-feature. The page talks to a backend at `/api/...`, which the journey supplies with `mock` steps (no server in this repo answers those paths).

## Driving it with verify.mjs

Preconditions:

- `doctor --port <port>` exits 0.
- Backend mocks registered before `goto`: `GET /api/users` (3 users), `POST /api/users`, `/api/slow` (1.5 s delay), `/api/error` (500), `/api/empty` (`[]`), `/api/users/1`, `/api/users/2`, `/api/search/*`, `/api/search-form`. All are in the journey file.

Run `node .claude/skills/verify-nojs/scripts/verify.mjs drive --journey .claude/skills/verify-nojs/journeys/http-fetch.json`.

- **Open the page.** Step `["goto", "/e2e/examples/fetch.html"]`. `[data-test=loading-msg]` is visible while `/api/slow` is pending.
- **List renders.** Step `["expect-count", "[data-test=user-item]", 3]`. The first item reads `Alice`.
- **Error and empty states.** Steps `["expect-visible", "[data-test=error-msg]"]` and `["expect-visible", "[data-test=empty-msg]"]`.
- **Loading resolves.** Step `["expect-text", "[data-test=loaded-data]", "Done!"]`, then `[data-test=loading-msg]` is gone.
- **Reactive URL.** Step `["fill", "[data-test=user-id-input]", "2"]`. `[data-test=reactive-user]` changes from `Leanne` to `Ervin` and `["expect-request", "GET", "**/api/users/2"]` passes.
- **Form POST.** Steps `["fill", "[data-test=form-name]", "Ada"]`, `["click", "[data-test=form-submit]"]`. `[data-test=post-result]` appears and `["expect-request", "POST", "**/api/users", "Ada"]` proves the body carried the typed value.
- **Proof.** Steps `["screenshot", "01-all-states"]` and `["aria", "01-all-states"]`; `network.jsonl` lists every request with its status and body.

## Gotchas

- Mocks match on the full URL glob. `**/api/users` does not match `/api/users/1`; register both, and pass `{"method": "GET"}` / `{"method": "POST"}` when one path serves two verbs.
- The loading template is visible only while the mock delays. Without `delay` the step `expect-visible [data-test=loading-msg]` races the response.
- Without mocks the page shows error templates everywhere: `test-server.js` answers `/api/...` with 404.
- The QUERY sections (7 and 8) render too but this journey does not assert them yet; `e2e/tests/fetch.spec.ts` has their expectations.
