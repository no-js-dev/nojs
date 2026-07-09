# NoJS benchmark harness

Tooling for measuring NoJS against js-framework-benchmark and for gating
perf work (see `PERF-PLAN.md`, WS0). Two layers:

| Layer | What | Where | Signal |
|---|---|---|---|
| jsdom micro-bench | Jest benchmarks of loop/keyed scenarios | `__benchmarks__/` (`npm run bench`) | directional, fast, runs in CI |
| Browser A/B | Real js-framework-benchmark runs | `bench/run-ab.sh` | authoritative, slow, needs idle machine |

## Browser A/B protocol (`run-ab.sh`)

Rules learned the hard way (2026-07-08):

1. **Same session only.** Numbers from different benchmark sessions are not
   comparable — Chrome version, thermal state, and background load all shift
   the baseline. Always run BASE and CANDIDATE back-to-back in one invocation.
2. **Headed vs headless are different universes.** Never compare a headed run
   against a headless run. The official results are headed; default to headed.
3. **Idle machine.** Headed runs measure the foreground Chrome. Using the
   machine during a run produces huge stddev and phantom regressions
   (observed: +49ms on partial-update purely from foreground activity).
   `compare-ab.py` flags suspicious stddev in its raw-stats section.
4. **Median, not mean.** Report medians; stddev is the sanity check.

### Setup (once)

```bash
# js-framework-benchmark checkout next to the NoJS workspace repos
cd ../js-framework-benchmark
npm ci && npm start                # HTTP server on :8080 — keep running
cd webdriver-ts && npm ci && npm run compile
```

### Run

```bash
# Baseline build = any saved no.js (e.g. built from main)
git worktree add /tmp/nojs-main main
(cd /tmp/nojs-main && npm ci && node build.js)

bench/run-ab.sh --base /tmp/nojs-main/dist/iife/no.js
# candidate defaults to a fresh build of the current working tree
```

Useful variants:

```bash
bench/run-ab.sh --base <js> --benchmark 03_update10th1k_x16   # one benchmark
bench/run-ab.sh --skip-base                                    # reuse ab-base results
python3 bench/compare-ab.py --dir ../js-framework-benchmark/webdriver-ts/results \
        --a ab-base --b ab-cand --competitors                  # re-print comparison
```

The script restores the benchmark framework dir (entry `no.js` +
`frameworkVersion`) on exit, pass or fail.

## jsdom micro-bench gate

```bash
npm run bench                      # all __benchmarks__/ suites (~15s, sizes capped at 1000)
npm run bench:keyed                # keyed-scenarios gate only (~2s)
BENCH_MAX_N=50000 npm run bench    # full size sweep — deep dives only (30-60 min)
```

`keyed-scenarios-bench.test.js` mirrors the js-framework-benchmark workloads
(create / partial update / select / swap / remove / clear) and **asserts the
resulting DOM**, so it doubles as the semantics pin for the patterns the
optimizations must never break — in-place item mutation + `rows.slice()`
above all. Timing output is directional only (jsdom, no layout); treat >2x
movement as signal, single-digit % as noise.

**Per-stage gate (PERF-PLAN.md):** every perf stage runs both layers — the
micro-bench must not regress any op beyond noise, and the browser A/B must
show the targeted benchmark moving without any other benchmark regressing
more than ~3%.
