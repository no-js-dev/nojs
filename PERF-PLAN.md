# NoJS Performance Plan — Road to #1 on js-framework-benchmark

**Date:** 2026-07-09
**Baseline:** `feat/reactive-perf` (PR #256) — geomean 1.54x over v1.18.0, currently 4/5 on most CPU benchmarks
**Goal:** Rank #1 against React 19.2, Vue 3.6, Alpine 3.14, Angular 22 on **all 15 parameters** (9 CPU, 3 memory, 2 size, first paint)
**Hard constraint:** Zero breakage. Full Jest (2130) + Playwright (475, 3 browsers) green after every stage. All documented semantics preserved and pinned by tests. CSP-safety (no eval/new Function) is non-negotiable.

---

## 1. Where we stand (perf branch vs best competitor)

| Benchmark | NoJS | Best | Gap | Dominant cost (root cause) |
|---|---:|---:|---:|---|
| Create 1K | 48.4 | 31.7 (React) | 1.5x | Per-element TreeWalker + attribute scan + context/proxy creation per row |
| Replace 1K | 54.9 | 36.9 (Vue) | 1.5x | Disposal walk of old 1000 + same create cost |
| Partial update ×16 | 91.8 | 17.6 (Angular) | 5.2x | `rows` notify → each reconcile re-assigns all 1000 item contexts → 2000+ binding re-evals per click, 100 needed |
| Select row | 32.0 | 7.4 (Vue) | 4.3x | 1000 `class-danger="row.id === sel"` interpreted evals; 2 DOM writes needed |
| Swap rows | 96.3 | 15.4 (Vue) | 6.3x | LIS reorder is now minimal (2 moves); residual = full-list re-assign + binding re-evals |
| Remove row | 51.1 | 12.8 (React) | 4.0x | Reconcile touches 1 row but re-evals bindings for 999 |
| Create 10K | 517.2 | 307.5 (Vue) | 1.7x | Same as Create 1K, scaled |
| Append 1K | 74.2 | 31.0 (Vue) | 2.4x | Reconcile re-visits 1000 existing + creates 1000 |
| Clear rows | 28.5 | 13.5 (Vue) | 2.1x | Per-node disposal walk (listeners/watchers/ctx teardown) on detached tree |
| Ready memory | 1.03 | 0.80 (Alpine) | +29% | Framework init structures |
| Run memory 1K | 7.69 | 3.71 (Vue) | 2.1x | Per-row Proxy context + listener Sets + watcher key Sets |
| Run+clear memory | 1.89 | 1.17 (Vue) | +62% | Retained caches after clear |
| Size gzip | 34.2 | 14.7 (Alpine) | 2.3x | Monolithic IIFE ships router/i18n/validation/dnd/devtools always |
| First paint | 187.1 | 76.3 (Alpine) | 2.5x | Script size + synchronous full-DOM init walk |

**Shape of the problem:** DOM-move costs are solved (LIS). Every remaining CPU gap is **interpreted re-evaluation fan-out** (evals that produce no DOM change) plus **per-element setup cost**. Memory gap is per-row reactive machinery. Size/paint gap is monolith shipping.

---

## 2. Workstreams

### WS0 — Measurement harness first (prerequisite, no framework code)

Build the tooling that keeps every later stage honest:

- Script `bench/run-ab.sh`: same-session idle-machine A/B runs of js-framework-benchmark (base tag vs branch tag), auto-comparison table output. Codifies the methodology validated on 2026-07-08 (polluted-run incident).
- Chrome tracing profile per benchmark (`--cpuprofile`) archived per stage; cost attribution table updated in this doc after each stage.
- Add jsdom micro-bench gates to `__benchmarks__/keyed-scenarios-bench.test.js`: each stage must not regress any op > 5%.
- Fix pre-existing `loops-benchmark.test.js` failure (`list.parentElement.__ctx` null) so the whole bench suite is usable as a gate.

*Tests: the harness itself is test-adjacent; gate = reproducible numbers ±noise on two consecutive runs.*

**RESULT (2026-07-08):** Shipped — `bench/run-ab.sh` (headed same-session A/B), `bench/compare-ab.py`, `bench/profile-create.mjs` (CDP CPU profiler for create-1k), loops-benchmark fix. PR #257.

### WS1 — Loop template compilation (biggest create/append/10K win)

Today every cloned row runs: TreeWalker → per-element attribute scan → match-cache lookup → directive init. The loop body's *shape is identical for every clone* — compute it once.

- Compile a **template plan** per loop template: ordered list of `(childIndexPath, directiveDescriptor[], staticAttrValues)` discovered on first clone.
- Subsequent clones: `cloneNode(true)` then walk **direct index paths** (`children[i].children[j]`) applying pre-matched descriptors — no TreeWalker, no attribute scans, no match-cache hashing.
- Interpolation-only text nodes get precompiled part lists.
- Plan invalidation: keyed by template element identity + template content revision; falls back to the generic path for dynamic shapes (`if` inside loops that changes structure keeps working — plan only covers the static skeleton).
- Expected: Create 1K 48 → ~33, Create 10K 517 → ~360, Append 74 → ~45, Replace 55 → ~40.

*Tests: new `__tests__/template-plan.test.js` — plan correctness vs generic path (render same fixture both ways, assert identical DOM), plan invalidation on template mutation, nested loops, loops with `if`/`use`/`include` inside, else-templates. Full e2e loops + examples suites. Pin: cloned-attribute stripping (Safety Rule 9) still enforced.*

**RESULT (2026-07-09, headed A/B, idle machine):** Create 1K 47.1→39.0 (1.21x), Replace 55.2→46.8 (1.18x), Create 10K 498→441 (1.13x), Append 70.4→62.9 (1.12x), run-memory 7.7→6.5 MB; zero CPU regressions; +0.5 KB gzip. CPU profile (`bench/profile-create.mjs`) shows remaining create-1k JS self-time is `evaluate` (~6.4 ms/run) + watcher registration (~2.7 ms/run) — WS3/WS5 scope; WS1 machinery is down to ~2.3 ms/run over a ~2.8 ms native clone/insert floor. Gate accepted: the "~33 ms" figure above is cumulative (needs WS3 closures on top of the plan replay).

### WS2 — Skip-unchanged reconciliation (partial update / remove / append / swap residuals)

The reconcile currently re-assigns every item context and lets bindings re-evaluate. Make unchanged rows cost ~0:

- **Item-stable contexts:** when reconcile sees `key match && item ref unchanged && index unchanged`, skip the context re-assign *and its notify entirely*. (In-place mutation + `slice()` — the benchmark's own `_update` — keeps item refs identical for changed rows too, so this alone can't skip their re-render; see next bullet. Pinned semantics stay intact because bindings that DO re-run still see fresh values.)
- **Binding value memo:** every binding (`bind`, `class-*`, `style-*`, interpolation) stores its last evaluated result; identical result = no DOM touch (some directives already do this — make it universal and cheap).
- **Index-free fast path:** rows whose bindings don't reference `$index`/loop position skip re-eval on pure reorders (swap: only 2 rows changed position AND nothing binds position → near-zero re-eval).
- Expected: Partial update 92 → ~35 (still 1000 memo-evals ×16, cut further by WS3), Remove 51 → ~18, Swap 96 → ~25, Append residual −10.

*Tests: extend `reactive-perf-fixes.test.js` — in-place mutation + slice still updates (THE pinned benchmark pattern), ref-changed items re-render, index-binding loops still update on reorder, eval-count spy assertions (unchanged rows: 0 DOM writes). e2e: loops, drag-drop (reorder-sensitive), pagination.*

### WS3 — Expression evaluator: interpreted → precompiled closures (CSP-safe)

The remaining eval fan-out (1000 `row.id === sel` on select; 1000 label memo-evals on partial update) is bounded by interpreter speed. Compile the AST **once** into a tree of plain JS closures (no eval — closure composition is CSP-safe):

- `compile(ast) → (scope) => value`: each node becomes a closure capturing child closures; identifier lookup compiled to direct slot access where the scope shape is known (loop scopes have fixed shape: item var, $index, parent ref).
- Loop-scope **slot resolution**: `row.label` inside `each="row in rows"` compiles to `scope.item.label` — no proxy `get` trap, no parent-chain walk, no `_collectKeys`.
- Keep the current interpreter as fallback for dynamic scope shapes; differential-test the two.
- Expected: per-eval cost 5–10x down → Select 32 → ~8–10, Partial update (post-WS2) ~35 → ~20, all reconcile residuals shrink.

*Tests: differential fuzz suite — run the ENTIRE existing evaluate.test.js corpus + generated expression corpus through both engines, assert identical results/errors. Security pins: prototype-pollution set, allow-list identifier resolution, `_execStatement` ReferenceError behavior (Safety Rule 7), sensitive-key redaction. This WS touches the security core — mandatory extra review pass + all e2e.*

### WS4 — Disposal fast path (clear / replace / remove)

`_disposeTree` walks every node doing per-node work even when the whole subtree is being discarded:

- **Detached-tree fast path:** when the parent is being emptied, collect listener/watcher deregistrations in bulk (single pass, no per-node `__declared` reset on nodes that will be GC'd), clear store/i18n watcher sets by owner tag instead of per-fn `delete`.
- Fix the +2ms clear regression from PR #256 (batch-drain bookkeeping on mass disposal).
- Expected: Clear 28.5 → ~13, Replace −5, Remove −3.

*Tests: leak tests — after clear, store watcher count returns to pre-render baseline, i18n listener set empty, contexts released (existing devtools registry as probe). Re-render after clear works (Safety Rule 1 pins). e2e full suite.*

### WS5 — Memory diet (run memory 7.69 → target < 3.7)

Per-row cost today: Proxy + raw object + listeners Set + watcher fns with `_keys` Sets.

- **Lazy listener Sets:** allocate on first `$watch`, not per context.
- **Shared key sets:** intern `fn._keys` — loop clones watching the same expression share one frozen Set.
- **Slim loop contexts:** loop item scopes with fixed shape (WS3 slots) can drop the full Proxy for a lightweight scope object; Proxy only materialized if user code needs `$set`/`$watch` dynamically (measure: benchmark rows never do).
- Retained-cache audit for run+clear: expression cache, match cache, template plans — cap + clear-on-idle where safe.
- Expected: Run memory ~7.7 → 3.0–3.5, Run+clear 1.89 → ~1.2, Ready 1.03 → ~0.85.

*Tests: memory assertions via `process.memoryUsage` deltas in jsdom (coarse) + the benchmark's own memory runs as gate. Behavioral: `$watch`/`$set` on loop items still works (lazy materialization), devtools ctx inspection still works.*

### WS6 — Bundle slimming (size gzip 34.2 → target < 14.7)

The only way to beat Alpine's 14.7 KB is to stop shipping everything always:

- **Build-flag stripping:** compile-time dead-code elimination for devtools hooks, debug logging, deprecation shims (esbuild `define`).
- **`no.slim.js` build:** core reactivity + directives (state/bind/each/if/on/model/show/class/style) only; router, i18n, validation, dnd, animations, head, fetch-extras become **opt-in plugin files** (`no.router.js` etc.) loadable as additional script tags. Full `no.js` remains the default CDN artifact — zero breaking change; slim is additive.
- Benchmark entry uses slim build (legitimate — Vue's entry uses runtime-only build; the benchmark measures what the page ships).
- Expected: slim core ~12–14 KB gzip. Full build also −2–3 KB from flag stripping.

*Tests: plugin-split e2e matrix — each optional module loaded standalone + combinations; full build byte-diff test asserting identical public API; docs site runs on full build unchanged; new CI job builds and smoke-tests slim+router combo.*

### WS7 — First paint (187 → target < 76)

- Slim bundle (WS6) cuts parse/compile time — largest single lever.
- **Init fast path:** first paint currently waits for full synchronous DOM walk. Split init: process above-the-fold synchronously, defer non-visible subtree processing to microtask/idle (opt-in `init-lazy` config to avoid any behavior change by default; benchmark page opts in — single root, trivial).
- Defer built-in style injection and i18n/router boot until first use.
- Expected: benchmark page first paint ~60–75.

*Tests: e2e first-paint ordering pins (no FOUC, directives processed before visibility where required), existing 475 e2e as regression net, new lazy-init e2e fixture.*

---

## 3. Projected end state (honest targets)

| Benchmark | Now | Target | Best rival | Verdict |
|---|---:|---:|---:|:--|
| Create 1K | 48.4 | ~31 | 31.7 | **Beatable** (WS1+WS3) |
| Replace 1K | 54.9 | ~35 | 36.9 | **Beatable** (WS1+WS4) |
| Partial update | 91.8 | ~17 | 17.6 | **Beatable, tight** (WS2+WS3) |
| Select row | 32.0 | ~7 | 7.4 | **Beatable, tight** (WS2+WS3) |
| Swap rows | 96.3 | ~15 | 15.4 | **Stretch** (WS2 index-free path must go to ~0 re-evals) |
| Remove row | 51.1 | ~12 | 12.8 | **Beatable** (WS2+WS4) |
| Create 10K | 517.2 | ~300 | 307.5 | **Beatable** (WS1+WS5 alloc pressure) |
| Append 1K | 74.2 | ~30 | 31.0 | **Beatable** (WS1+WS2) |
| Clear rows | 28.5 | ~12 | 13.5 | **Beatable** (WS4) |
| Ready memory | 1.03 | ~0.78 | 0.80 | **Beatable** (WS5+WS6 slim) |
| Run memory | 7.69 | ~3.4 | 3.71 | **Stretch** (WS5 slim contexts must land fully) |
| Run+clear memory | 1.89 | ~1.15 | 1.17 | **Stretch** (WS5 cache audit) |
| Size gzip | 34.2 | ~13 | 14.7 | **Beatable** (WS6 slim build) |
| First paint | 187.1 | ~65 | 76.3 | **Beatable** (WS6+WS7) |

Every "stretch" has a concrete mechanism, not hope — but those three get validated by WS0 profiling before commitment.

---

## 4. Sequencing & non-breakage protocol

**Order:** WS0 → WS1 → WS2 → WS3 → WS4 → WS5 → WS6 → WS7. Each is one `perf/`-branch, one PR, independently shippable. WS3 (security-core) gets an extra review pass. WS6/WS7 can parallelize with WS4/WS5 (different files).

**Per-stage gate (all mandatory, in order):**
1. New unit tests written *with* the change (≥80% coverage on new code)
2. Full Jest suite green (2130+, zero skips added)
3. jsdom micro-bench: no op regresses >5%
4. Build + full Playwright e2e green (chromium/firefox/webkit)
5. Docs-site manual smoke (all pages + playground kanban, per 2026-07-08 checklist)
6. Same-session idle A/B js-framework-benchmark run (WS0 harness); target movement confirmed, no other benchmark regresses >3%
7. Semantics pins re-verified: in-place-mutation+slice pattern, sync-DOM-on-return, keyless `$notify` fan-out, CSP-safety, Safety Rules 1–12

**Rollback rule:** any gate failure that can't be fixed same-stage → stage reverted, finding documented here, plan re-sequenced.

**Ecosystem:** no directive/API surface changes planned; if WS6 plugin-split adds new script artifacts, sync LSP/Skill docs per Cross-Repo Sync table before release.
