/**
 * Regression tests for the reactive-perf work (feat/reactive-perf).
 *
 * Stage 1 — keyed reconcile must invalidate each clone's _collectKeys
 * cache after writing new item data onto the clone's raw context.
 * The raw Object.assign in reconcileItems bypasses the proxy set trap,
 * so _ctxGeneration is not bumped; without an explicit cache delete the
 * clone's bindings can evaluate against stale cached vals.
 */

import { _stores, _storeWatchers } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/loops.js';

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
