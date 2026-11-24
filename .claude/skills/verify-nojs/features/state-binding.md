# State and binding

A site author declares reactive state in HTML and the visitor sees bound text, inputs and derived values update as they click and type; persisted state survives a reload.

## Sub-features

- `state-counter` updates `bind` output when an `on:click` handler mutates `state`.
- `state-computed` recomputes a `computed` value from its dependencies.
- `state-watch` runs a `watch` handler with the new value.
- `state-model` mirrors an input into bound text through `model`.
- `state-store` shares a global `store` between sections.
- `state-bind-html` renders sanitized markup through `bind-html`.
- `state-persist` restores `persist="localStorage"` state after a reload.
- `state-notify` re-renders after page JavaScript mutates `NoJS.store` and calls `NoJS.notify()`.

## How to get to it (user POV)

- Open `/e2e/examples/state-binding.html`; each section is one sub-feature with its own buttons and inputs.

## Driving it with verify.mjs

Preconditions:

- `doctor --port <port>` exits 0.
- Fresh browser context (every drive), so the persisted value starts empty.

Run the whole recipe with `node .claude/skills/verify-nojs/scripts/verify.mjs drive --journey .claude/skills/verify-nojs/journeys/state-binding.json`.

- **Open the page.** Step `["goto", "/e2e/examples/state-binding.html"]`. `[data-test=counter-value]` reads `0`.
- **Increment twice.** Steps `["click", "[data-test=counter-inc]"]` twice. `[data-test=counter-value]` reads `2`, `[data-test=computed-value]` reads `4`, `[data-test=watch-output]` reads `changed to 2`.
- **Decrement.** Step `["click", "[data-test=counter-dec]"]`. The counter reads `1`.
- **Type a name.** Step `["fill", "[data-test=name-input]", "Ada Lovelace"]`. `[data-test=name-display]` reads `Ada Lovelace`.
- **Toggle the store.** Step `["click", "[data-test=store-toggle]"]`. `[data-test=store-display]` and `[data-test=notify-display]` (another section bound to the same store) both read `dark`.
- **Read the HTML binding.** Step `["expect-contains", "[data-test=html-output] strong", "bold"]`. The markup renders as elements, not escaped text.
- **Persist a value.** Step `["fill", "[data-test=persist-input]", "kept across reload"]`, then `["reload"]`. After the reload `[data-test=persist-input]` has value `kept across reload` and `[data-test=persist-display]` shows it, while the non-persisted counter is back to `0`.
- **Proof.** Steps `["screenshot", "01-after-actions"]`, `["aria", "01-after-actions"]` before the reload and `["screenshot", "02-after-reload"]` after it.
- **External notify.** Run `drive --journey .claude/skills/verify-nojs/journeys/state-binding-notify.json`. Step `["click", "[data-test=notify-toggle]"]` flips `[data-test=notify-display]` and `[data-test=store-display]` to `dark`.

## Gotchas

- The `Toggle via JS` button is wired with a native `addEventListener`, not `on:click`: NoJS expressions cannot call window functions (expression allow-list). Up to d168ccb it used `on:click="toggleThemeExternal()"`, which only logged `Expression error: ... toggleThemeExternal is not defined`.
- The watcher output is `changed to <n>` only after the first change; on load it is empty.
- `persist-key="e2e-test"` writes localStorage key `e2e-test`. A drive's context starts empty, so a stale value from another run cannot leak in; inside one journey, assert persistence only after `reload`.
