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
