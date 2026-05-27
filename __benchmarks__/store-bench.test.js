// ═══════════════════════════════════════════════════════════════════════════
// store — watcher scaling benchmark
//
// Measures store notification throughput at different watcher counts.
// The store notification path is separate from context reactivity —
// _notifyStoreWatchers iterates _storeWatchers (a partitioned Map).
//
// Scenarios:
//   1. Single store change with 10/50/200/500 watchers
//   2. Multiple simultaneous store changes
//   3. Watcher registration/deregistration throughput
//
// Reports: mean, median, p95, min, max per watcher count.
// ═══════════════════════════════════════════════════════════════════════════

import { _stores, _storeWatchers, _notifyStoreWatchers, _addStoreWatcher, _deleteStoreWatcher } from '../src/globals.js';
import { createContext } from '../src/context.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const RUNS = 200;
const WATCHER_COUNTS = [10, 50, 200, 500];

// ─── Measurement helpers ──────────────────────────────────────────────────────

function stats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { mean, median, p95, min, max };
}

const fmt = {
  us: (v) => (v * 1000).toFixed(2) + ' µs',
  ms: (v) => v.toFixed(3) + ' ms',
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────

function cleanupStore() {
  _storeWatchers.clear();
  Object.keys(_stores).forEach((k) => delete _stores[k]);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1 — Store notification fan-out
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: store notification — watcher scaling', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  STORE NOTIFICATION — watcher fan-out             ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  afterEach(() => cleanupStore());

  for (const count of WATCHER_COUNTS) {
    test(`${count} store watcher(s) — single notification`, () => {
      const times = [];

      for (let r = 0; r < RUNS; r++) {
        cleanupStore();
        _stores.counter = { value: 0 };
        let fired = 0;

        // Register watchers (simulating what _watchExpr does internally)
        for (let w = 0; w < count; w++) {
          const fn = () => { fired++; };
          _addStoreWatcher(fn, 'counter');
        }

        fired = 0;
        const t0 = performance.now();
        _notifyStoreWatchers('counter');
        const t1 = performance.now();

        times.push(t1 - t0);
        expect(fired).toBe(count);
      }

      const s = stats(times);
      results.push({
        watchers: count,
        mean: fmt.us(s.mean),
        median: fmt.us(s.median),
        p95: fmt.us(s.p95),
        min: fmt.us(s.min),
        max: fmt.us(s.max),
        'per-watcher': fmt.us(s.mean / count),
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2 — Multiple simultaneous store changes
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: multiple store changes — notification cost', () => {
  const results = [];
  const STORE_COUNTS = [1, 5, 10, 20];
  const WATCHERS_PER_RUN = 50;

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  MULTIPLE STORE CHANGES — notification cost       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  afterEach(() => cleanupStore());

  for (const storeCount of STORE_COUNTS) {
    test(`${storeCount} store change(s) × ${WATCHERS_PER_RUN} watchers`, () => {
      const times = [];

      for (let r = 0; r < RUNS; r++) {
        cleanupStore();

        // Set up multiple stores
        for (let s = 0; s < storeCount; s++) {
          _stores[`store_${s}`] = { value: 0 };
        }

        let fired = 0;
        for (let w = 0; w < WATCHERS_PER_RUN; w++) {
          // Distribute watchers across stores via wildcard for cross-store notification
          _addStoreWatcher(() => { fired++; }, '*');
        }

        // Simulate changing all stores and notifying each
        fired = 0;
        const t0 = performance.now();
        for (let s = 0; s < storeCount; s++) {
          _stores[`store_${s}`].value++;
          _notifyStoreWatchers(`store_${s}`);
        }
        const t1 = performance.now();

        times.push(t1 - t0);
        // Wildcard watchers fire once per store notification
        expect(fired).toBe(WATCHERS_PER_RUN * storeCount);
      }

      const s = stats(times);
      results.push({
        stores: storeCount,
        watchers: WATCHERS_PER_RUN,
        mean: fmt.us(s.mean),
        median: fmt.us(s.median),
        p95: fmt.us(s.p95),
        min: fmt.us(s.min),
        max: fmt.us(s.max),
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 3 — Watcher registration/deregistration throughput
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: watcher registration/deregistration', () => {
  const results = [];
  const COUNTS = [100, 500, 1000, 5000];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  WATCHER REGISTRATION/DEREGISTRATION throughput   ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  afterEach(() => cleanupStore());

  for (const count of COUNTS) {
    test(`register + deregister ${count} watchers`, () => {
      const regTimes = [];
      const deregTimes = [];

      for (let r = 0; r < 50; r++) {
        cleanupStore();
        const fns = [];

        // Register
        const t0 = performance.now();
        for (let w = 0; w < count; w++) {
          const fn = () => {};
          fns.push(fn);
          _addStoreWatcher(fn, 'bench');
        }
        const t1 = performance.now();
        regTimes.push(t1 - t0);

        // Deregister
        const t2 = performance.now();
        for (const fn of fns) {
          _deleteStoreWatcher(fn);
        }
        const t3 = performance.now();
        deregTimes.push(t3 - t2);

        expect(_storeWatchers.size).toBe(0);
      }

      const regS = stats(regTimes);
      const deregS = stats(deregTimes);
      results.push({
        count,
        'reg mean': fmt.us(regS.mean),
        'reg p95': fmt.us(regS.p95),
        'dereg mean': fmt.us(deregS.mean),
        'dereg p95': fmt.us(deregS.p95),
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 4 — Store + context watcher interaction
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: context watchers + store watchers combined', () => {
  const results = [];
  const CONFIGS = [
    { ctxWatchers: 10, storeWatchers: 10 },
    { ctxWatchers: 50, storeWatchers: 50 },
    { ctxWatchers: 100, storeWatchers: 100 },
    { ctxWatchers: 200, storeWatchers: 200 },
  ];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  COMBINED — context + store watchers              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  afterEach(() => cleanupStore());

  for (const cfg of CONFIGS) {
    test(`${cfg.ctxWatchers} ctx + ${cfg.storeWatchers} store watchers`, () => {
      const times = [];

      for (let r = 0; r < RUNS; r++) {
        cleanupStore();
        _stores.data = { count: 0 };

        const ctx = createContext({ value: 0 });
        let ctxFired = 0;
        let storeFired = 0;

        for (let w = 0; w < cfg.ctxWatchers; w++) {
          ctx.$watch(() => { ctxFired++; });
        }
        for (let w = 0; w < cfg.storeWatchers; w++) {
          _addStoreWatcher(() => { storeFired++; }, 'data');
        }

        ctxFired = 0;
        storeFired = 0;

        // Trigger both context and store notifications
        const t0 = performance.now();
        ctx.value = r + 1;
        _stores.data.count++;
        _notifyStoreWatchers('data');
        const t1 = performance.now();

        times.push(t1 - t0);
        expect(ctxFired).toBe(cfg.ctxWatchers);
        expect(storeFired).toBe(cfg.storeWatchers);
      }

      const s = stats(times);
      results.push({
        'ctx watchers': cfg.ctxWatchers,
        'store watchers': cfg.storeWatchers,
        total: cfg.ctxWatchers + cfg.storeWatchers,
        mean: fmt.us(s.mean),
        median: fmt.us(s.median),
        p95: fmt.us(s.p95),
        min: fmt.us(s.min),
        max: fmt.us(s.max),
      });
    });
  }
});
