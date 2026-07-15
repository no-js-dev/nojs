/**
 * Keyless loop delta append optimization.
 *
 * When items are appended to the end of a keyless list (no filter/sort/offset),
 * loops reuse the existing DOM prefix and only create clones for the delta.
 * Any other mutation (prepend, splice, shrink, filter/sort/offset active)
 * falls back to a full rebuild. These tests pin the trigger matrix and the
 * disposal safety of the fallback path.
 */

import { _stores, _storeWatchers } from '../src/globals.js';
import { processTree, _disposeChildren } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';

describe('Keyless loop delta append optimization', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _storeWatchers.clear();
  });

  // Helper: get managed element clones between comment markers in host.
  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  // Helper: create a foreach loop with self-repeating pattern and initial items.
  // In the self-repeating pattern, the element with foreach IS the template.
  // It gets removed from DOM and clones are inserted between comment markers
  // as siblings in the parent (host). We return { host, ctx, actualItems }.
  function makeForeachContainer(items, attrs = {}) {
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ items }));
    const el = document.createElement('div');
    el.setAttribute('foreach', 'item in items');
    // Apply additional attributes (filter, sort, offset, limit, key)
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    el.innerHTML = '<span class="item"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);
    // Return the actual item refs from the context (not the test-local objects)
    const actualItems = ctx.__raw.items;
    return { host, ctx, actualItems };
  }

  describe('append-only (add items to end of list)', () => {
    test('appends new items without rebuilding existing DOM nodes', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
      // Use the actual refs from the context to satisfy shallow ref equality
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      // Capture references to original DOM nodes
      const firstChild = clones[0];
      const secondChild = clones[1];

      // Append a new item (keeping the same reference objects for prefix)
      const c = { id: 3, name: 'C' };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
      // Original nodes must be preserved (delta append, not full rebuild)
      expect(clones[0]).toBe(firstChild);
      expect(clones[1]).toBe(secondChild);
    });

    test('appends multiple items at once via delta', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      const firstChild = clones[0];

      const c = { id: 3 };
      const d = { id: 4 };
      const e = { id: 5 };
      ctx.$set('items', [a, b, c, d, e]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(5);
      // First child preserved — delta append, not full rebuild
      expect(clones[0]).toBe(firstChild);
    });

    test('$index, $item, $first, $last, $count correct after append', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      // Before append: verify initial state
      expect(clones[0].__ctx.$count).toBe(2);
      expect(clones[0].__ctx.$first).toBe(true);
      expect(clones[0].__ctx.$last).toBe(false);
      expect(clones[1].__ctx.$last).toBe(true);
      expect(clones[1].__ctx.$index).toBe(1);

      // Append a third item
      const c = { id: 3 };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      // After append: $count updated on ALL children
      expect(clones[0].__ctx.$count).toBe(3);
      expect(clones[1].__ctx.$count).toBe(3);
      expect(clones[2].__ctx.$count).toBe(3);

      // $first is still the first
      expect(clones[0].__ctx.$first).toBe(true);
      // $last moved from index 1 to index 2
      expect(clones[1].__ctx.$last).toBe(false);
      expect(clones[2].__ctx.$last).toBe(true);

      // $index on new item
      expect(clones[2].__ctx.$index).toBe(2);
      // $item on new item
      expect(clones[2].__ctx.item).toBe(c);
    });

    test('$even and $odd correct on appended items', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);
      const [a, b] = actualItems;

      const c = { id: 3 };
      const d = { id: 4 };
      ctx.$set('items', [a, b, c, d]);

      const clones = getManagedClones(host);
      expect(clones[2].__ctx.$even).toBe(true);   // index 2
      expect(clones[2].__ctx.$odd).toBe(false);
      expect(clones[3].__ctx.$even).toBe(false);   // index 3
      expect(clones[3].__ctx.$odd).toBe(true);
    });
  });

  describe('prepend (add items to beginning) — triggers full rebuild', () => {
    test('prepending items triggers full rebuild (prefix mismatch)', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      const firstChild = clones[0];

      // Prepend a new item — prefix no longer matches
      const c = { id: 0 };
      ctx.$set('items', [c, a, b]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
      // First child should be different (full rebuild)
      expect(clones[0]).not.toBe(firstChild);
      // Verify correct data
      expect(clones[0].__ctx.item).toBe(c);
      expect(clones[1].__ctx.item).toBe(a);
      expect(clones[2].__ctx.item).toBe(b);
    });
  });

  describe('splice/replace in middle — triggers full rebuild', () => {
    test('replacing an item in the middle triggers full rebuild', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const [a, , c] = actualItems;

      let clones = getManagedClones(host);
      const firstChild = clones[0];

      // Replace middle item (different object reference)
      const bNew = { id: 2, name: 'B-new' };
      ctx.$set('items', [a, bNew, c]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
      // Same length but item changed — full rebuild
      expect(clones[0]).not.toBe(firstChild);
    });

    test('removing an item triggers full rebuild (list shrunk)', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const [a, , c] = actualItems;

      let clones = getManagedClones(host);
      const firstChild = clones[0];

      ctx.$set('items', [a, c]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      // Shrink always triggers full rebuild
      expect(clones[0]).not.toBe(firstChild);
    });
  });

  describe('filter/sort/limit/offset combos — full rebuild fallback', () => {
    test('filter active: always full rebuild even on append', () => {
      const { host, ctx, actualItems } = makeForeachContainer(
        [{ id: 1, active: true }, { id: 2, active: true }],
        { filter: 'item.active' }
      );
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      const firstChild = clones[0];

      const c = { id: 3, active: true };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
      // With filter, delta is disabled — full rebuild
      expect(clones[0]).not.toBe(firstChild);
    });

    test('sort active: always full rebuild even on append', () => {
      const { host, ctx, actualItems } = makeForeachContainer(
        [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }],
        { sort: 'name' }
      );
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      const firstChild = clones[0];

      const c = { id: 3, name: 'Gamma' };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      // Sort present — full rebuild
      expect(clones[0]).not.toBe(firstChild);
    });

    test('offset active: always full rebuild even on append', () => {
      const { host, ctx, actualItems } = makeForeachContainer(
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        { offset: '1' }
      );
      const [a, b, c] = actualItems;

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2); // offset=1 skips first item

      const firstChild = clones[0];

      const d = { id: 4 };
      ctx.$set('items', [a, b, c, d]);

      clones = getManagedClones(host);
      // Offset active — full rebuild
      expect(clones[0]).not.toBe(firstChild);
    });

    test('limit active without filter/sort/offset: delta still works', () => {
      // limit alone does NOT set hasPipeline (only filter, sort, offset do)
      const { host, ctx, actualItems } = makeForeachContainer(
        [{ id: 1 }, { id: 2 }],
        { limit: '10' }
      );
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      const firstChild = clones[0];

      const c = { id: 3 };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      // limit without filter/sort/offset — delta append should work
      expect(clones.length).toBe(3);
      expect(clones[0]).toBe(firstChild);
    });
  });

  describe('disposal safety in fallback path (Safety Rule #1)', () => {
    test('_disposeChildren called before clearing in full rebuild', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);

      // Attach disposers to managed clones to verify they are called
      const disposeCalls = [];
      const clones = getManagedClones(host);
      for (const child of clones) {
        child.__disposers = child.__disposers || [];
        child.__disposers.push(() => disposeCalls.push(child));
      }

      // Trigger a full rebuild by prepending
      const c = { id: 0 };
      ctx.$set('items', [c, ...actualItems]);

      // Disposers must have been called (one for each old child)
      expect(disposeCalls.length).toBe(2);
    });

    test('empty list clears DOM after disposal', () => {
      const { host, ctx } = makeForeachContainer([{ id: 1 }]);

      let clones = getManagedClones(host);
      expect(clones.length).toBe(1);

      // Set to empty — no else template, should clear
      ctx.$set('items', []);

      clones = getManagedClones(host);
      // No element children remain (only comment markers)
      expect(clones.length).toBe(0);
    });
  });

  describe('each/for aliases share delta optimization', () => {
    function makeLoopAlias(directive, items) {
      const host = document.createElement('div');
      host.setAttribute('state', JSON.stringify({ items }));
      const el = document.createElement('div');
      el.setAttribute(directive, 'item in items');
      el.innerHTML = '<span></span>';
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);
      const ctx = findContext(host);
      return { host, ctx, actualItems: ctx.__raw.items };
    }

    test('each directive uses delta append for keyless lists', () => {
      const { host, ctx, actualItems } = makeLoopAlias('each', [{ id: 1 }, { id: 2 }]);
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      const firstChild = clones[0];

      const c = { id: 3 };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
      expect(clones[0]).toBe(firstChild);
    });

    test('for directive uses delta append for keyless lists', () => {
      const { host, ctx, actualItems } = makeLoopAlias('for', [{ id: 1 }, { id: 2 }]);
      const [a, b] = actualItems;

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      const firstChild = clones[0];

      const c = { id: 3 };
      ctx.$set('items', [a, b, c]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
      expect(clones[0]).toBe(firstChild);
    });
  });

  describe('key-based reconciliation bypasses delta (prevRendered = null)', () => {
    test('keyed foreach does not use delta append', () => {
      const host = document.createElement('div');
      host.setAttribute('state', '{ items: [{ id: 1, name: "A" }, { id: 2, name: "B" }] }');
      const el = document.createElement('div');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('key', 'item.id');
      el.innerHTML = '<span></span>';
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      let clones = getManagedClones(host);
      expect(clones.length).toBe(2);
      // Keyed reconciliation should work, but use its own path (not delta)
      const ctx = findContext(host);
      ctx.$set('items', [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }]);

      clones = getManagedClones(host);
      expect(clones.length).toBe(3);
    });
  });

  describe('edge cases', () => {
    test('first render (no prevRendered) uses full render', () => {
      const { host, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);
      const clones = getManagedClones(host);
      // First render should produce correct output
      expect(clones.length).toBe(2);
      expect(clones[0].__ctx.item).toEqual(actualItems[0]);
      expect(clones[1].__ctx.item).toEqual(actualItems[1]);
    });

    test('append after empty list works correctly', () => {
      const { host, ctx } = makeForeachContainer([]);
      let clones = getManagedClones(host);
      expect(clones.length).toBe(0);

      const a = { id: 1 };
      ctx.$set('items', [a]);
      clones = getManagedClones(host);
      // Empty -> non-empty is a full render (no prevRendered)
      expect(clones.length).toBe(1);
      expect(clones[0].__ctx.item).toBe(a);
    });

    test('same array reference with same length triggers notify-only path', () => {
      const { host, ctx, actualItems } = makeForeachContainer([{ id: 1 }, { id: 2 }]);

      const clones = getManagedClones(host);
      const firstChild = clones[0];

      // Re-set the same array reference: same ref triggers the same-reference
      // optimization path (notify children, no rebuild). We use the __raw reference
      // to ensure the proxy set trap sees the same value.
      const sameRef = ctx.__raw.items;
      ctx.$set('items', sameRef);

      expect(getManagedClones(host)[0]).toBe(firstChild);
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  PR #67 — NOJS-40: i18n translation cache (L10)
// ═══════════════════════════════════════════════════════════════════════

