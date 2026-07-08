/**
 * Keyed-loop scenario benchmark — mirrors the js-framework-benchmark
 * workloads (create / update-every-10th / select / swap / remove) against
 * the exact HTML shape used in the official keyed implementation.
 *
 * Two jobs:
 *  1. Timing signal for the reactive-perf optimization stages (wall time in
 *     jsdom — directional, not absolute).
 *  2. Correctness net: every operation asserts the resulting DOM, pinning
 *     the load-bearing semantics the optimizations must not break —
 *     especially in-place item mutation followed by `rows.slice()`.
 */

import { _stores, _storeWatchers, _globals } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import { _execStatement } from '../src/evaluate.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';
import '../src/directives/styling.js';

const ROWS = 1000;

function buildRows(n, startId) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ id: startId + i, label: 'row ' + (startId + i) });
  return rows;
}

// Recreates the benchmark HTML shape: single tbody, keyed <tr>, class-danger
// selection bound to parent state, per-row bind + click handlers.
function setup() {
  const host = document.createElement('div');
  host.setAttribute('state', '{"rows": [], "sel": 0}');
  host.innerHTML = `
    <table><tbody>
      <tr each="row in rows" key="row.id" class-danger="row.id === sel">
        <td class="id" bind="row.id"></td>
        <td><a class="lbl" on:click="sel = row.id" bind="row.label"></a></td>
      </tr>
    </tbody></table>`;
  document.body.appendChild(host);
  processTree(host);
  const ctx = findContext(host.querySelector('tbody'));
  return { host, ctx, tbody: host.querySelector('tbody') };
}

function rowsIn(tbody) {
  return [...tbody.querySelectorAll('tr')];
}

function time(fn) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

// Runs the statement the way a real on:click does (through _execStatement),
// so the measurement includes the same notify path as the browser benchmark.
function run(ctx, host, stmt) {
  return time(() => _execStatement(stmt, ctx, { el: host }));
}

describe('keyed scenarios — js-framework-benchmark workloads', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _storeWatchers.clear();
    Object.keys(_globals).forEach((k) => delete _globals[k]);
  });

  test('create / update-in-place / select / swap / remove — correct and timed', () => {
    const { host, ctx, tbody } = setup();
    const timings = {};

    // ── Create 1000 rows ─────────────────────────────────────────────
    const rows = buildRows(ROWS, 1);
    timings.create = time(() => { ctx.rows = rows; });
    let trs = rowsIn(tbody);
    expect(trs.length).toBe(ROWS);
    expect(trs[0].querySelector('.id').textContent).toBe('1');
    expect(trs[999].querySelector('.lbl').textContent).toBe('row 1000');

    // ── Update every 10th row — IN-PLACE mutation + slice() ──────────
    // This is exactly what the official benchmark's $upd does. Item refs
    // do NOT change; only their internals do. The framework must still
    // refresh the DOM. Any ref-based dirty skip breaks this assertion.
    ctx.__raw.rows.forEach((r, i) => { if (i % 10 === 0) r.label += ' !!!'; });
    timings.update = time(() => { ctx.rows = ctx.__raw.rows.slice(); });
    trs = rowsIn(tbody);
    expect(trs[0].querySelector('.lbl').textContent).toBe('row 1 !!!');
    expect(trs[10].querySelector('.lbl').textContent).toBe('row 11 !!!');
    expect(trs[11].querySelector('.lbl').textContent).toBe('row 12');

    // ── Select row (parent-state change, class-danger on rows) ───────
    timings.select = run(ctx, host, 'sel = 42');
    trs = rowsIn(tbody);
    expect(trs[41].classList.contains('danger')).toBe(true);
    expect(trs.filter((tr) => tr.classList.contains('danger')).length).toBe(1);

    timings.select2 = run(ctx, host, 'sel = 43');
    trs = rowsIn(tbody);
    expect(trs[41].classList.contains('danger')).toBe(false);
    expect(trs[42].classList.contains('danger')).toBe(true);

    // ── Swap rows 1 and 998 (same objects, new array) ────────────────
    timings.swap = run(
      ctx, host,
      'tmp = rows.slice(); t = tmp[1]; tmp[1] = tmp[998]; tmp[998] = t; rows = tmp',
    );
    trs = rowsIn(tbody);
    expect(trs[1].querySelector('.id').textContent).toBe('999');
    expect(trs[998].querySelector('.id').textContent).toBe('2');
    expect(trs[0].querySelector('.id').textContent).toBe('1');
    expect(trs[2].querySelector('.id').textContent).toBe('3');
    // Selection must survive the swap (row id 43 moved nowhere).
    expect(trs[42].classList.contains('danger')).toBe(true);

    // ── Remove one row ───────────────────────────────────────────────
    timings.remove = run(ctx, host, 'rows = rows.filter(r => r.id !== 3)');
    trs = rowsIn(tbody);
    expect(trs.length).toBe(ROWS - 1);
    expect(trs[2].querySelector('.id').textContent).not.toBe('3');

    // ── Clear ────────────────────────────────────────────────────────
    timings.clear = run(ctx, host, 'rows = []');
    expect(rowsIn(tbody).length).toBe(0);

    console.log('\n  keyed-scenarios (ms, jsdom, ' + ROWS + ' rows):');
    console.table(
      Object.fromEntries(
        Object.entries(timings).map(([k, v]) => [k, { ms: +v.toFixed(1) }]),
      ),
    );
  }, 120000);
});
