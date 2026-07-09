/**
 * Regression tests for the reactive-perf work (feat/reactive-perf).
 *
 * Stage 1 — keyed reconcile must invalidate each clone's _collectKeys
 * cache after writing new item data onto the clone's raw context.
 * The raw Object.assign in reconcileItems bypasses the proxy set trap,
 * so _ctxGeneration is not bumped; without an explicit cache delete the
 * clone's bindings can evaluate against stale cached vals.
 */

import { _stores, _storeWatchers, _globals } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import { createContext } from '../src/context.js';
import { _execStatement } from '../src/evaluate.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/loops.js';
import '../src/directives/styling.js';

function getManagedClones(host) {
  return [...host.childNodes].filter((n) => n.nodeType === 1);
}

describe('Stage 1 — keyed reconcile clone cache invalidation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _storeWatchers.clear();
  });

  test('reconcile triggered without a generation bump still renders fresh item data', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ "items": [{ "id": 1, "name": "old-A" }, { "id": 2, "name": "old-B" }] }');
    const el = document.createElement('div');
    el.setAttribute('each', 'item in items');
    el.setAttribute('key', 'item.id');
    el.innerHTML = '<span bind="item.name"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    const ctx = findContext(host);
    let clones = getManagedClones(host);
    expect(clones.map((c) => c.textContent)).toEqual(['old-A', 'old-B']);

    // Warm each clone's _collectKeys cache at the CURRENT generation by
    // touching a binding evaluation (already done during render above, but
    // re-assert the cache exists to make the setup explicit).
    expect(clones[0].__ctx.__raw.__collectKeysCache).toBeDefined();

    // Replace the array via a raw write + manual $notify — no proxy set,
    // so _ctxGeneration does NOT change. Reconcile reuses both clones
    // (same keys) and must still show the new names.
    ctx.__raw.items = [
      { id: 1, name: 'new-A' },
      { id: 2, name: 'new-B' },
    ];
    ctx.$notify();

    clones = getManagedClones(host);
    expect(clones.map((c) => c.textContent)).toEqual(['new-A', 'new-B']);
  });

  test('reconcile reorder without generation bump keeps positional vars fresh', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ "items": [{ "id": 1 }, { "id": 2 }, { "id": 3 }] }');
    const el = document.createElement('div');
    el.setAttribute('each', 'item in items');
    el.setAttribute('key', 'item.id');
    el.innerHTML = '<span bind="item.id + \':\' + $index"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    const ctx = findContext(host);
    const [a, b, c] = ctx.__raw.items;

    // Reverse order via raw write + manual notify (no generation bump).
    ctx.__raw.items = [c, b, a];
    ctx.$notify();

    const clones = getManagedClones(host);
    expect(clones.map((cl) => cl.textContent)).toEqual(['3:0', '2:1', '1:2']);
  });
});

/**
 * Stage 2 — LIS-based reorder in keyed reconcile.
 * Order must stay correct for every permutation, and a two-row swap must
 * cost O(2) DOM moves instead of cascading a move for every following row.
 */
describe('Stage 2 — keyed reconcile LIS reorder', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _storeWatchers.clear();
  });

  function setupKeyed(ids) {
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ items: ids.map((id) => ({ id })) }));
    const el = document.createElement('div');
    el.setAttribute('each', 'item in items');
    el.setAttribute('key', 'item.id');
    el.innerHTML = '<span bind="item.id"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    return { host, ctx: findContext(host) };
  }

  function order(host) {
    return getManagedClones(host).map((c) => Number(c.textContent));
  }

  function reorderTo(ctx, ids) {
    const byId = new Map(ctx.__raw.items.map((it) => [it.id, it]));
    ctx.$set('items', ids.map((id) => byId.get(id) || { id }));
  }

  test('reverse keeps order correct and reuses nodes', () => {
    const { host, ctx } = setupKeyed([1, 2, 3, 4, 5]);
    const before = getManagedClones(host);
    reorderTo(ctx, [5, 4, 3, 2, 1]);
    expect(order(host)).toEqual([5, 4, 3, 2, 1]);
    // Same nodes, reordered — not recreated.
    expect(new Set(getManagedClones(host))).toEqual(new Set(before));
  });

  test('shuffle keeps order correct', () => {
    const { host, ctx } = setupKeyed([1, 2, 3, 4, 5, 6, 7, 8]);
    reorderTo(ctx, [3, 7, 1, 8, 2, 6, 4, 5]);
    expect(order(host)).toEqual([3, 7, 1, 8, 2, 6, 4, 5]);
    reorderTo(ctx, [8, 1, 5, 3, 2, 7, 6, 4]);
    expect(order(host)).toEqual([8, 1, 5, 3, 2, 7, 6, 4]);
  });

  test('mid-list insert and removal keep order correct', () => {
    const { host, ctx } = setupKeyed([1, 2, 4, 5]);
    reorderTo(ctx, [1, 2, 3, 4, 5]);
    expect(order(host)).toEqual([1, 2, 3, 4, 5]);
    reorderTo(ctx, [1, 3, 5]);
    expect(order(host)).toEqual([1, 3, 5]);
  });

  test('swap of two distant rows costs at most 2 DOM moves', () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    const { host, ctx } = setupKeyed(ids);

    const container = getManagedClones(host)[0].parentNode;
    const spy = jest.spyOn(container, 'insertBefore');

    const swapped = ids.slice();
    [swapped[1], swapped[98]] = [swapped[98], swapped[1]];
    reorderTo(ctx, swapped);

    expect(order(host)).toEqual(swapped);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    spy.mockRestore();
  });

  test('identity reorder performs zero DOM moves', () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 1);
    const { host, ctx } = setupKeyed(ids);

    const container = getManagedClones(host)[0].parentNode;
    const spy = jest.spyOn(container, 'insertBefore');

    reorderTo(ctx, ids);
    expect(order(host)).toEqual(ids);
    expect(spy.mock.calls.length).toBe(0);
    spy.mockRestore();
  });
});

/**
 * Stage 3 — statement execution batches notifications.
 * A listener registered on several contexts (see _watchExpr's ancestor
 * walk) must run once per executed statement, not once per notifying
 * context — and DOM updates stay synchronous from the caller's view.
 */
describe('Stage 3 — batched statement notification', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _storeWatchers.clear();
    delete _globals.tick;
  });

  function setupCounted(itemCount) {
    let ticks = 0;
    _globals.tick = (v) => { ticks++; return v; };

    const host = document.createElement('div');
    const items = Array.from({ length: itemCount }, (_, i) => ({ id: i + 1, name: 'n' + (i + 1) }));
    host.setAttribute('state', JSON.stringify({ items, sel: 0 }));
    const el = document.createElement('div');
    el.setAttribute('each', 'item in items');
    el.setAttribute('key', 'item.id');
    el.setAttribute('class-danger', 'item.id === sel');
    el.innerHTML = '<span bind="$tick(item.name)"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    return { host, ctx: findContext(host), getTicks: () => ticks, resetTicks: () => { ticks = 0; } };
  }

  test('list reassignment statement evaluates each binding exactly once', () => {
    const { host, ctx, getTicks, resetTicks } = setupCounted(10);
    resetTicks();

    _execStatement('items = items.slice()', ctx, { $el: host });

    // 10 rows, one bind each. Without batching each bind runs twice:
    // once from the ancestor-registered wave, once from the clone $notify
    // inside reconcile.
    expect(getTicks()).toBe(10);
  });

  test('parent-key statement (select) evaluates each binding exactly once', () => {
    const { host, ctx, getTicks, resetTicks } = setupCounted(10);
    resetTicks();

    _execStatement('sel = 3', ctx, { $el: host });

    expect(getTicks()).toBe(10);
    const danger = [...host.childNodes].filter((n) => n.nodeType === 1 && n.classList.contains('danger'));
    expect(danger.length).toBe(1);
    expect(danger[0].textContent).toBe('n3');
  });

  test('DOM state is settled synchronously when _execStatement returns', () => {
    const { host, ctx } = setupCounted(3);
    _execStatement('items = items.filter(i => i.id !== 2)', ctx, { $el: host });
    const rows = [...host.childNodes].filter((n) => n.nodeType === 1);
    expect(rows.map((r) => r.textContent)).toEqual(['n1', 'n3']);
  });

  test('watcher registered on two contexts runs once for a two-key statement', () => {
    const parent = createContext({ a: 0 });
    const child = createContext({ b: 0 }, parent);
    const fn = jest.fn();
    parent.$watch(fn);
    child.$watch(fn);

    _execStatement('a = 1; b = 2', child, {});

    expect(fn).toHaveBeenCalledTimes(1);
    expect(parent.a).toBe(1);
    expect(child.b).toBe(2);
  });

  test('listener re-triggered by a later same-round listener converges to fresh state', () => {
    const ctx = createContext({ x: 0, y: 0 });
    const seen = [];
    const reader = jest.fn(() => seen.push(ctx.y));
    const writer = jest.fn(() => { if (ctx.y === 0) ctx.y = 5; });
    ctx.$watch(reader);
    ctx.$watch(writer);

    _execStatement('x = 1', ctx, {});

    // reader ran in round 1 (y=0), writer set y → reader re-queued →
    // round 2 sees y=5. Final observation must be fresh.
    expect(seen[seen.length - 1]).toBe(5);
    expect(ctx.y).toBe(5);
  });
});
