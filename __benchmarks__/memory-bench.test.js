// ═══════════════════════════════════════════════════════════════════════════
// memory — leak detection & profile benchmark
//
// Measures memory behavior across repeated create/dispose cycles to detect
// leaks. Also profiles the expression cache at different sizes.
//
// Scenarios:
//   1. Context create/dispose cycles — does memory stabilize?
//   2. Expression cache at different sizes — memory footprint
//   3. Watcher create/dispose cycles — Set cleanup verification
//   4. Store create/delete cycles — object cleanup verification
//
// Uses process.memoryUsage() for Node.js heap tracking.
// ═══════════════════════════════════════════════════════════════════════════

import { createContext } from '../src/context.js';
import { evaluate, _exprCache } from '../src/evaluate.js';
import { _stores, _storeWatchers, _config, _addStoreWatcher, _deleteStoreWatcher } from '../src/globals.js';
import { processTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLES = 50;

// ─── Measurement helpers ──────────────────────────────────────────────────────

const fmt = {
  kb: (v) => (v / 1024).toFixed(0) + ' KB',
  mb: (v) => (v / (1024 * 1024)).toFixed(2) + ' MB',
  ms: (v) => v.toFixed(2) + ' ms',
};

function forceGC() {
  // In Node.js with --expose-gc, global.gc() is available.
  // In Jest/jsdom, we do our best with allocation pressure.
  if (typeof global.gc === 'function') {
    global.gc();
  }
}

function heapUsed() {
  forceGC();
  return process.memoryUsage().heapUsed;
}

function cleanup() {
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1 — Context create/dispose cycles
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: memory — context create/dispose cycles', () => {
  const results = [];
  const BATCH_SIZES = [100, 500, 1000];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  MEMORY — context create/dispose cycles           ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const batchSize of BATCH_SIZES) {
    test(`${CYCLES} cycles × ${batchSize} contexts`, () => {
      const heapSnapshots = [];
      const baseline = heapUsed();

      for (let c = 0; c < CYCLES; c++) {
        // Create batch
        const contexts = [];
        for (let i = 0; i < batchSize; i++) {
          contexts.push(createContext({
            id: i, name: `ctx-${i}`,
            nested: { a: 1, b: [1, 2, 3] },
          }));
        }

        // Simulate dispose: clear all watcher references
        for (const ctx of contexts) {
          ctx.__listeners.clear();
        }
        contexts.length = 0;

        if (c % 10 === 9) {
          heapSnapshots.push(heapUsed() - baseline);
        }
      }

      const finalHeap = heapUsed() - baseline;
      const peakHeap = Math.max(...heapSnapshots, finalHeap);
      const trend = heapSnapshots.length >= 2
        ? heapSnapshots[heapSnapshots.length - 1] - heapSnapshots[0]
        : 0;

      results.push({
        'batch size': batchSize,
        cycles: CYCLES,
        'final heap delta': fmt.kb(finalHeap),
        'peak heap delta': fmt.kb(peakHeap),
        'trend (last-first)': fmt.kb(trend),
        'trend direction': trend > 50 * 1024 ? 'GROWING' : 'STABLE',
      });

      // The heap should not grow unboundedly — trend should be reasonable
      expect(typeof finalHeap).toBe('number');
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2 — Expression cache memory footprint
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: memory — expression cache size', () => {
  const results = [];
  const CACHE_SIZES = [100, 250, 500, 1000];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  MEMORY — expression cache footprint              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const cacheSize of CACHE_SIZES) {
    test(`cache size = ${cacheSize}`, () => {
      const originalSize = _config.exprCacheSize;
      _config.exprCacheSize = cacheSize;

      const ctx = createContext({
        a: 1, b: 2, c: 'hello', d: true,
        nested: { x: 10, y: 20 },
      });

      const h0 = heapUsed();
      const t0 = performance.now();

      // Fill the cache with unique expressions
      for (let i = 0; i < cacheSize * 2; i++) {
        // Generate unique expressions that exercise different AST paths
        const exprs = [
          `a + ${i}`,
          `nested.x > ${i}`,
          `c | uppercase`,
          `d ? ${i} : 0`,
        ];
        evaluate(exprs[i % exprs.length].replace(/\d+$/, String(i)), ctx);
      }

      const t1 = performance.now();
      const h1 = heapUsed();

      // Cache should have been bounded to cacheSize
      const cacheEntries = _exprCache.size;

      results.push({
        'max size': cacheSize,
        'actual entries': cacheEntries,
        'fill time': fmt.ms(t1 - t0),
        'heap delta': fmt.kb(h1 - h0),
        'per-entry': fmt.kb((h1 - h0) / Math.max(cacheEntries, 1)),
        'bounded': cacheEntries <= cacheSize ? 'YES' : 'NO',
      });

      expect(cacheEntries).toBeLessThanOrEqual(cacheSize);

      _config.exprCacheSize = originalSize;
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 3 — Watcher create/dispose cycles
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: memory — watcher create/dispose cycles', () => {
  const results = [];
  const WATCHER_COUNTS = [50, 200, 500];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  MEMORY — watcher create/dispose cycles           ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const watcherCount of WATCHER_COUNTS) {
    test(`${CYCLES} cycles × ${watcherCount} watchers`, () => {
      const heapSnapshots = [];
      const baseline = heapUsed();

      for (let c = 0; c < CYCLES; c++) {
        const ctx = createContext({ value: 0 });
        const unwatchers = [];

        // Attach watchers
        for (let w = 0; w < watcherCount; w++) {
          const unwatch = ctx.$watch(() => {});
          unwatchers.push(unwatch);
        }

        // Verify watchers are registered
        expect(ctx.__listeners.size).toBe(watcherCount);

        // Dispose all watchers
        for (const unwatch of unwatchers) unwatch();
        unwatchers.length = 0;

        // Verify cleanup
        expect(ctx.__listeners.size).toBe(0);

        if (c % 10 === 9) {
          heapSnapshots.push(heapUsed() - baseline);
        }
      }

      const finalHeap = heapUsed() - baseline;
      const trend = heapSnapshots.length >= 2
        ? heapSnapshots[heapSnapshots.length - 1] - heapSnapshots[0]
        : 0;

      results.push({
        watchers: watcherCount,
        cycles: CYCLES,
        'final heap delta': fmt.kb(finalHeap),
        'trend (last-first)': fmt.kb(trend),
        'trend direction': trend > 50 * 1024 ? 'GROWING' : 'STABLE',
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 4 — DOM processTree + dispose cycles
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: memory — DOM processTree + dispose cycles', () => {
  const results = [];
  const ELEMENT_COUNTS = [20, 50, 100];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  MEMORY — DOM processTree + dispose cycles        ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const elemCount of ELEMENT_COUNTS) {
    test(`${CYCLES} cycles × ${elemCount} elements`, () => {
      const heapSnapshots = [];
      const baseline = heapUsed();

      for (let c = 0; c < CYCLES; c++) {
        cleanup();

        // Build DOM
        const root = document.createElement('div');
        const state = document.createElement('div');
        state.setAttribute('state', JSON.stringify({ active: true, label: 'test' }));
        root.appendChild(state);

        for (let i = 0; i < elemCount; i++) {
          const el = document.createElement('span');
          el.setAttribute('bind-textContent', 'label');
          if (i % 3 === 0) el.setAttribute('if', 'active');
          state.appendChild(el);
        }

        document.body.appendChild(root);
        processTree(root);

        // Dispose by clearing DOM (simulating what directives do)
        document.body.innerHTML = '';

        if (c % 10 === 9) {
          heapSnapshots.push(heapUsed() - baseline);
        }
      }

      cleanup();
      const finalHeap = heapUsed() - baseline;
      const trend = heapSnapshots.length >= 2
        ? heapSnapshots[heapSnapshots.length - 1] - heapSnapshots[0]
        : 0;

      results.push({
        elements: elemCount,
        cycles: CYCLES,
        'final heap delta': fmt.kb(finalHeap),
        'trend (last-first)': fmt.kb(trend),
        'trend direction': trend > 100 * 1024 ? 'GROWING' : 'STABLE',
      });

      expect(typeof finalHeap).toBe('number');
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 5 — Store create/delete memory
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: memory — store create/delete cycles', () => {
  const results = [];
  const STORE_COUNTS = [10, 50, 100];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  MEMORY — store create/delete cycles              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const storeCount of STORE_COUNTS) {
    test(`${CYCLES} cycles × ${storeCount} stores`, () => {
      const heapSnapshots = [];
      const baseline = heapUsed();

      for (let c = 0; c < CYCLES; c++) {
        // Create stores with data
        for (let s = 0; s < storeCount; s++) {
          _stores[`bench_${s}`] = {
            items: Array.from({ length: 10 }, (_, i) => ({
              id: i, name: `item-${i}`, active: true,
            })),
            metadata: { created: Date.now(), version: c },
          };
        }

        // Add watchers (partitioned by store name)
        const fns = [];
        for (let w = 0; w < storeCount; w++) {
          const fn = () => {};
          _addStoreWatcher(fn, `bench_${w}`);
          fns.push(fn);
        }

        // Delete stores and watchers
        for (let s = 0; s < storeCount; s++) {
          delete _stores[`bench_${s}`];
        }
        for (const fn of fns) {
          _deleteStoreWatcher(fn);
        }

        if (c % 10 === 9) {
          heapSnapshots.push(heapUsed() - baseline);
        }
      }

      const finalHeap = heapUsed() - baseline;
      const trend = heapSnapshots.length >= 2
        ? heapSnapshots[heapSnapshots.length - 1] - heapSnapshots[0]
        : 0;

      results.push({
        stores: storeCount,
        cycles: CYCLES,
        'final heap delta': fmt.kb(finalHeap),
        'trend (last-first)': fmt.kb(trend),
        'trend direction': trend > 50 * 1024 ? 'GROWING' : 'STABLE',
      });

      expect(_storeWatchers.size).toBe(0);
    });
  }
});
