// ═══════════════════════════════════════════════════════════════════════════
// loops.js — key reconciliation vs full-rebuild benchmark
//
// Measures DOM node creation count, execution time, and heap allocation for
// push / sort / splice / in-place-update / full-replace operations.
//
// List sizes span 5 → 50,000 to answer the reviewer's question about when
// keyed reconciliation pays off vs when full-rebuild is cheaper.
//
// Each scenario runs RUNS iterations; reports avg/min/max time and heap delta.
// ═══════════════════════════════════════════════════════════════════════════

import { _stores } from '../src/globals.js';
import { processTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/loops.js';

// ─── Data generators ─────────────────────────────────────────────────────────

/** Simple flat objects — low-complexity item */
function makeItems(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: offset + i + 1,
    name: `item-${offset + i + 1}`,
  }));
}

/** Complex nested objects — higher-complexity item (more realistic data shape) */
function makeComplexItems(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: offset + i + 1,
    name: `item-${offset + i + 1}`,
    meta: {
      score: Math.round(Math.random() * 1000),
      tags: [`tag-a`, `tag-b`, `tag-${i % 5}`],
      active: i % 3 !== 0,
    },
    createdAt: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

// ─── DOM scaffold ─────────────────────────────────────────────────────────────

function setupDOM(items, keyed, complex = false) {
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);

  const tpl = document.createElement('template');
  tpl.id = 'bench-tpl';
  // Complex template has multiple bound children — closer to real-world usage
  tpl.innerHTML = complex
    ? '<div class="row"><span class="name"></span><span class="score"></span></div>'
    : '<span class="row"></span>';
  document.body.appendChild(tpl);

  const state = document.createElement('div');
  state.setAttribute('state', JSON.stringify({ items }));
  document.body.appendChild(state);

  const list = document.createElement('div');
  list.setAttribute('each', 'item in items');
  list.setAttribute('template', 'bench-tpl');
  if (keyed) list.setAttribute('key', 'item.id');
  state.appendChild(list);

  processTree(state);
  return { state, list, ctx: state.__ctx };
}

// ─── Measurement helpers ──────────────────────────────────────────────────────

/** Intercept DOM mutation APIs to count raw operations. */
function measureDOMOps(fn) {
  let creates = 0, clones = 0, removes = 0, inserts = 0;

  const origCreate = document.createElement.bind(document);
  const origClone  = Element.prototype.cloneNode;
  const origRemove = Element.prototype.remove;
  const origInsert = Element.prototype.insertBefore;

  document.createElement           = (...a) => { creates++; return origCreate(...a); };
  Element.prototype.cloneNode      = function (...a) { clones++;  return origClone.call(this, ...a); };
  Element.prototype.remove         = function (...a) { removes++; return origRemove.call(this, ...a); };
  Element.prototype.insertBefore   = function (...a) { inserts++; return origInsert.call(this, ...a); };

  fn();

  document.createElement         = origCreate;
  Element.prototype.cloneNode    = origClone;
  Element.prototype.remove       = origRemove;
  Element.prototype.insertBefore = origInsert;

  return { creates, clones, removes, inserts };
}

/**
 * Run fn RUNS times, discarding the first (warm-up), and return stats.
 * Returns avg/min/max time (ms) and avg heap delta (bytes).
 */
function benchmark(fn, runs = 6) {
  const times = [], heaps = [];
  for (let r = 0; r < runs + 1; r++) {         // +1 for warm-up
    const h0 = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    const h1 = process.memoryUsage().heapUsed;
    if (r === 0) continue;                       // discard warm-up
    times.push(t1 - t0);
    heaps.push(h1 - h0);
  }
  const avg  = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    avgTime: avg(times),
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    avgHeap: avg(heaps),
  };
}

const fmt = {
  ms:  (v) => v.toFixed(2) + ' ms',
  kb:  (v) => (v / 1024).toFixed(0) + ' KB',
};

// ─── List sizes ───────────────────────────────────────────────────────────────
//
// Four tiers covering reviewer's request:
//   tens      → 10, 50
//   hundreds  → 100, 500
//   thousands → 1 000, 5 000
//   tens of thousands → 10 000, 50 000
//
// Large sizes (≥ 5 000) only run for operations that are meaningfully different
// between strategies to keep CI time reasonable.

// push/update/splice: O(1) DOM ops for keyed — affordable at 50 000
const SIZES_ALL    = [10, 50, 100, 500, 1000, 5000, 10000, 50000];
// sort/replace/complex: O(n) DOM ops even for keyed — cap at 10 000 for CI
const SIZES_HEAVY  = [10, 50, 100, 500, 1000, 5000, 10000];
// full-replace + complex scenarios: capped further due to rebuild overhead
const SIZES_MEDIUM = [10, 50, 100, 500, 1000, 5000];
const RUNS = 6;

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1 — push one item
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: push(1 item) onto existing list', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 1 — push(1 item)                       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_ALL) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const extra = { id: size + 1, name: `item-${size + 1}` };

        const { state } = setupDOM(makeItems(size), keyed);
        const domOps = measureDOMOps(() => {
          state.__ctx.items = [...state.__ctx.items, extra];
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeItems(size), keyed);
          ctx.items = [...ctx.items, { id: size + 1, name: `item-${size + 1}` }];
        }, RUNS);

        results.push({
          strategy: label, n: size,
          avgTime: fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size + 1);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2 — sort / reverse
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: sort/reverse entire list', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 2 — sort/reverse                       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_HEAVY) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const { state } = setupDOM(makeItems(size), keyed);
        const domOps = measureDOMOps(() => {
          state.__ctx.items = [...state.__ctx.items].reverse();
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeItems(size), keyed);
          ctx.items = [...ctx.items].reverse();
        }, RUNS);

        results.push({
          strategy: label, n: size,
          avgTime: fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 3 — splice: remove 1 from middle, insert 1 new
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: splice(mid, 1, newItem)', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 3 — splice(mid, 1, newItem)            ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_HEAVY) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const mid = Math.floor(size / 2);
        const newItem = { id: size + 999, name: 'spliced' };

        const { state } = setupDOM(makeItems(size), keyed);
        const domOps = measureDOMOps(() => {
          const next = [...state.__ctx.items];
          next.splice(mid, 1, newItem);
          state.__ctx.items = next;
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeItems(size), keyed);
          const next = [...ctx.items];
          next.splice(mid, 1, newItem);
          ctx.items = next;
        }, RUNS);

        results.push({
          strategy: label, n: size,
          avgTime: fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 4 — in-place update (same keys, updated values)
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: in-place update — same keys, new name values', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 4 — in-place update (same keys)        ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_ALL) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const { state } = setupDOM(makeItems(size), keyed);
        const domOps = measureDOMOps(() => {
          state.__ctx.items = state.__ctx.items.map(
            (it) => ({ ...it, name: it.name + '-v2' }),
          );
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeItems(size), keyed);
          ctx.items = ctx.items.map((it) => ({ ...it, name: it.name + '-v2' }));
        }, RUNS);

        results.push({
          strategy: label, n: size,
          avgTime: fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 5 — full replacement (all-new IDs, worst case for keyed)
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: full replacement — all-new IDs (worst case for keyed)', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 5 — full replacement (all-new IDs)     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_MEDIUM) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const { state } = setupDOM(makeItems(size), keyed);
        const domOps = measureDOMOps(() => {
          state.__ctx.items = makeItems(size, size * 100);
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeItems(size), keyed);
          ctx.items = makeItems(size, size * 100);
        }, RUNS);

        results.push({
          strategy: label, n: size,
          avgTime: fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 6 — complex nested items, in-place update
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: complex nested items — in-place update', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 6 — complex items, in-place update     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_MEDIUM) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const { state } = setupDOM(makeComplexItems(size), keyed, true);
        const domOps = measureDOMOps(() => {
          state.__ctx.items = state.__ctx.items.map(
            (it) => ({ ...it, meta: { ...it.meta, score: it.meta.score + 1 } }),
          );
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeComplexItems(size), keyed, true);
          ctx.items = ctx.items.map((it) => ({ ...it, meta: { ...it.meta, score: it.meta.score + 1 } }));
        }, RUNS);

        results.push({
          strategy: label, n: size,
          avgTime: fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 7 — batch: 10 sequential push operations
// ═══════════════════════════════════════════════════════════════════════════

describe('Benchmark: 10 sequential push operations (cumulative cost)', () => {
  const results = [];

  afterAll(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  SCENARIO 7 — 10× sequential push               ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.table(results);
  });

  for (const size of SIZES_MEDIUM) {
    for (const keyed of [false, true]) {
      const label = keyed ? 'keyed' : 'full';
      test(`[${label}] n=${size}`, () => {
        const PUSHES = 10;

        const { state } = setupDOM(makeItems(size), keyed);
        const domOps = measureDOMOps(() => {
          for (let p = 0; p < PUSHES; p++) {
            const ctx = state.__ctx;
            ctx.items = [...ctx.items, { id: size + 1000 + p, name: `pushed-${p}` }];
          }
        });

        const { avgTime, minTime, maxTime, avgHeap } = benchmark(() => {
          const { ctx } = setupDOM(makeItems(size), keyed);
          for (let p = 0; p < PUSHES; p++) {
            ctx.items = [...ctx.items, { id: size + 1000 + p, name: `pushed-${p}` }];
          }
        }, RUNS);

        results.push({
          strategy: label, n: size,
          'avgTime (10×)': fmt.ms(avgTime), minTime: fmt.ms(minTime), maxTime: fmt.ms(maxTime),
          heapDelta: fmt.kb(avgHeap),
          createElement: domOps.creates, insertBefore: domOps.inserts, remove: domOps.removes,
        });
        expect(state.children.length).toBe(size + PUSHES);
      });
    }
  }
});
