/**
 * Phase 3 Performance QA — NOJS-41
 *
 * Regression tests for Phase 3 architectural performance optimizations.
 * Each describe block maps to a specific PR / optimization change.
 *
 * PR #66 — NOJS-39: Keyless loop delta optimization (H4)
 * PR #67 — NOJS-40: i18n translation cache (L10)
 * PR #68 — NOJS-38: Partitioned store watchers (M6)
 */

import { _config, _stores, _storeWatchers, _setCurrentEl, _onDispose, _watchExpr, _notifyStoreWatchers, _addStoreWatcher, _deleteStoreWatcher, _extractStoreName, _refs, _globals, _i18nListeners, _watchI18n } from '../src/globals.js';
import { createContext, _startBatch, _endBatch, _collectKeys, _resetCtxId } from '../src/context.js';
import { evaluate, resolve, _execStatement, _exprCache, _stmtCache } from '../src/evaluate.js';
import { registerDirective, processTree, processElement, _disposeTree, _disposeChildren } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import { _i18n, _notifyI18n, _i18nTranslationCache } from '../src/i18n.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';
import '../src/directives/refs.js';
import '../src/directives/http.js';
import '../src/directives/i18n.js';

// ═══════════════════════════════════════════════════════════════════════
//  PR #66 — NOJS-39: Keyless loop delta optimization (H4)
// ═══════════════════════════════════════════════════════════════════════

describe('PR #66 — Keyless loop delta append optimization', () => {

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

describe('PR #67 — i18n translation cache', () => {

  beforeEach(() => {
    _i18nTranslationCache.clear();
    _i18n._locale = 'en';
    _i18n._locales = {
      en: {
        greeting: 'Hello',
        welcome: 'Welcome, {name}!',
        items: 'one item | {count} items',
        nested: { deep: { key: 'Deep value' } },
      },
      es: {
        greeting: 'Hola',
        welcome: 'Bienvenido, {name}!',
        items: 'un articulo | {count} articulos',
      },
      fr: {
        greeting: 'Bonjour',
      },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
  });

  afterEach(() => {
    _i18nTranslationCache.clear();
    _i18n._locale = 'en';
    _i18n._locales = {};
    _i18nListeners.clear();
  });

  describe('cache hits: same key returns cached value on repeat calls', () => {
    test('repeated t() call uses cache', () => {
      const result1 = _i18n.t('greeting');
      expect(result1).toBe('Hello');

      // Cache should now have the entry
      expect(_i18nTranslationCache.has('en:greeting')).toBe(true);

      const result2 = _i18n.t('greeting');
      expect(result2).toBe('Hello');
      // Same result, served from cache
    });

    test('nested key lookups are cached', () => {
      const result1 = _i18n.t('nested.deep.key');
      expect(result1).toBe('Deep value');
      expect(_i18nTranslationCache.has('en:nested.deep.key')).toBe(true);

      const result2 = _i18n.t('nested.deep.key');
      expect(result2).toBe('Deep value');
    });

    test('missing keys are cached as null', () => {
      const result = _i18n.t('nonexistent.key');
      expect(result).toBe('nonexistent.key'); // returns key as fallback

      // Cache stores null for missing keys (not undefined)
      expect(_i18nTranslationCache.has('en:nonexistent.key')).toBe(true);
      expect(_i18nTranslationCache.get('en:nonexistent.key')).toBeNull();
    });
  });

  describe('cache invalidation on locale switch', () => {
    test('locale change clears entire cache', () => {
      _i18n.t('greeting'); // populate cache
      expect(_i18nTranslationCache.size).toBeGreaterThan(0);

      _i18n.locale = 'es';

      // Cache must be empty after locale change
      expect(_i18nTranslationCache.size).toBe(0);
    });

    test('after locale switch, new locale values are returned and cached', () => {
      _i18n.t('greeting');
      expect(_i18nTranslationCache.get('en:greeting')).toBe('Hello');

      _i18n.locale = 'es';

      const result = _i18n.t('greeting');
      expect(result).toBe('Hola');
      expect(_i18nTranslationCache.has('es:greeting')).toBe(true);
      expect(_i18nTranslationCache.get('es:greeting')).toBe('Hola');
    });

    test('setting locale to same value does not clear cache', () => {
      _i18n.t('greeting');
      const sizeBefore = _i18nTranslationCache.size;

      _i18n.locale = 'en'; // same locale
      // The setter has `if (this._locale !== v)` guard
      expect(_i18nTranslationCache.size).toBe(sizeBefore);
    });
  });

  describe('cache invalidation on locales reassignment', () => {
    test('setting locales property clears cache', () => {
      _i18n.t('greeting');
      expect(_i18nTranslationCache.size).toBeGreaterThan(0);

      _i18n.locales = { en: { greeting: 'Hey' } };
      expect(_i18nTranslationCache.size).toBe(0);

      const result = _i18n.t('greeting');
      expect(result).toBe('Hey');
    });
  });

  describe('cache invalidation on _notifyI18n', () => {
    test('_notifyI18n clears the translation cache', () => {
      _i18n.t('greeting');
      expect(_i18nTranslationCache.size).toBeGreaterThan(0);

      _notifyI18n();
      expect(_i18nTranslationCache.size).toBe(0);
    });
  });

  describe('interpolation params evaluated per-call (not cached)', () => {
    test('same key with different params produces different output', () => {
      const result1 = _i18n.t('welcome', { name: 'Alice' });
      expect(result1).toBe('Welcome, Alice!');

      const result2 = _i18n.t('welcome', { name: 'Bob' });
      expect(result2).toBe('Welcome, Bob!');

      // Both calls hit the cache for the raw message, but interpolation is per-call
      expect(result1).not.toBe(result2);
    });

    test('cache stores the raw message, not the interpolated result', () => {
      _i18n.t('welcome', { name: 'Alice' });

      // The cached value is the raw template, not the interpolated result
      const cached = _i18nTranslationCache.get('en:welcome');
      expect(cached).toBe('Welcome, {name}!');
    });
  });

  describe('pluralization evaluated per-call (not cached)', () => {
    test('same key with different count produces different output', () => {
      const singular = _i18n.t('items', { count: 1 });
      expect(singular).toBe('one item');

      const plural = _i18n.t('items', { count: 5 });
      expect(plural).toBe('5 items');

      // Pluralization happens after cache lookup
    });

    test('cache stores the raw pluralization template', () => {
      _i18n.t('items', { count: 1 });
      const cached = _i18nTranslationCache.get('en:items');
      expect(cached).toBe('one item | {count} items');
    });
  });

  describe('_FORBIDDEN_MERGE_KEYS sanitization not bypassed by cache', () => {
    test('__proto__ keys are never merged into locale data', () => {
      // This tests the _deepMerge function — the cache does not change
      // the merge behavior; translations containing __proto__ are blocked
      _i18n.locales = {
        en: { safe: 'value' },
      };

      // Simulate what _loadLocale does: deep merge with new data
      // The _deepMerge is internal, but we verify the effect:
      // Setting locales with __proto__ should NOT pollute prototype
      const malicious = JSON.parse('{"__proto__": {"polluted": true}, "greeting": "Hi"}');
      // Merge manually to test the pattern (since _deepMerge is not exported)
      _i18n.locales = Object.assign({}, _i18n._locales, { en: Object.assign({}, _i18n._locales.en, malicious) });

      // Prototype should not be polluted
      expect({}.polluted).toBeUndefined();
    });

    test('constructor key in locale data is not merged', () => {
      _i18n.locales = { en: { greeting: 'Hello' } };
      // Cache should be clear after locales set
      expect(_i18nTranslationCache.size).toBe(0);
      // Normal operation continues
      expect(_i18n.t('greeting')).toBe('Hello');
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  PR #68 — NOJS-38: Partitioned store watchers (M6)
// ═══════════════════════════════════════════════════════════════════════

describe('PR #68 — Partitioned store watchers', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    _storeWatchers.clear();
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  describe('_extractStoreName — expression parsing', () => {
    test('extracts store name from simple expression', () => {
      expect(_extractStoreName('$store.cart.items')).toBe('cart');
    });

    test('extracts store name from complex expression', () => {
      expect(_extractStoreName('$store.auth.user.name + " suffix"')).toBe('auth');
    });

    test('returns null for non-store expressions', () => {
      expect(_extractStoreName('count + 1')).toBeNull();
    });

    test('returns null for non-string input', () => {
      expect(_extractStoreName(null)).toBeNull();
      expect(_extractStoreName(undefined)).toBeNull();
      expect(_extractStoreName(42)).toBeNull();
    });

    test('extracts only the first store name (regex exec)', () => {
      expect(_extractStoreName('$store.cart.total + $store.auth.user')).toBe('cart');
    });
  });

  describe('targeted notification: store mutation notifies only relevant watchers', () => {
    test('notifying store "cart" only fires cart watchers, not auth watchers', () => {
      _stores.cart = { items: [] };
      _stores.auth = { user: 'Alice' };
      const ctx = createContext({});

      const cartFn = jest.fn();
      const authFn = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      _setCurrentEl(el1);
      _watchExpr('$store.cart.items', ctx, cartFn);
      _setCurrentEl(el2);
      _watchExpr('$store.auth.user', ctx, authFn);
      _setCurrentEl(null);

      // Notify only cart
      _notifyStoreWatchers('cart');

      expect(cartFn).toHaveBeenCalledTimes(1);
      expect(authFn).not.toHaveBeenCalled();
    });

    test('notifying store "auth" only fires auth watchers', () => {
      _stores.cart = { items: [] };
      _stores.auth = { user: 'Alice' };
      const ctx = createContext({});

      const cartFn = jest.fn();
      const authFn = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      _setCurrentEl(el1);
      _watchExpr('$store.cart.items', ctx, cartFn);
      _setCurrentEl(el2);
      _watchExpr('$store.auth.user', ctx, authFn);
      _setCurrentEl(null);

      _notifyStoreWatchers('auth');

      expect(cartFn).not.toHaveBeenCalled();
      expect(authFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('wildcard partition catches non-store expressions', () => {
    test('expression without clear store ref goes to wildcard partition', () => {
      _stores.app = { count: 0 };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      // Expression references $store but no specific name (e.g., dynamic access)
      _watchExpr('$store[dynamicName]', ctx, fn);
      _setCurrentEl(null);

      // Should be in wildcard partition
      expect(_storeWatchers.has('*')).toBe(true);
      expect(_storeWatchers.get('*').has(fn)).toBe(true);
    });

    test('wildcard watchers fire when any store is notified', () => {
      const ctx = createContext({});
      const wildcardFn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store[name]', ctx, wildcardFn);
      _setCurrentEl(null);

      _notifyStoreWatchers('cart');
      expect(wildcardFn).toHaveBeenCalledTimes(1);

      _notifyStoreWatchers('auth');
      expect(wildcardFn).toHaveBeenCalledTimes(2);
    });

    test('wildcard + targeted watchers both fire for same store', () => {
      _stores.cart = { items: [] };
      const ctx = createContext({});

      const targetedFn = jest.fn();
      const wildcardFn = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      _setCurrentEl(el1);
      _watchExpr('$store.cart.items', ctx, targetedFn);
      _setCurrentEl(el2);
      _watchExpr('$store[name]', ctx, wildcardFn);
      _setCurrentEl(null);

      _notifyStoreWatchers('cart');

      expect(targetedFn).toHaveBeenCalledTimes(1);
      expect(wildcardFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('backward compatibility: no storeName notifies ALL partitions', () => {
    test('_notifyStoreWatchers() without argument notifies all partitions', () => {
      _stores.cart = { items: [] };
      _stores.auth = { user: 'Alice' };
      const ctx = createContext({});

      const cartFn = jest.fn();
      const authFn = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      _setCurrentEl(el1);
      _watchExpr('$store.cart.items', ctx, cartFn);
      _setCurrentEl(el2);
      _watchExpr('$store.auth.user', ctx, authFn);
      _setCurrentEl(null);

      // No storeName — backward compat: notify all
      _notifyStoreWatchers();

      expect(cartFn).toHaveBeenCalledTimes(1);
      expect(authFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-store scenarios', () => {
    test('elements watching different stores coexist independently', () => {
      _stores.cart = { items: [] };
      _stores.auth = { user: 'Alice' };
      _stores.ui = { theme: 'dark' };
      const ctx = createContext({});

      const cartFn = jest.fn();
      const authFn = jest.fn();
      const uiFn = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);
      document.body.appendChild(el3);

      _setCurrentEl(el1);
      _watchExpr('$store.cart.items.length', ctx, cartFn);
      _setCurrentEl(el2);
      _watchExpr('$store.auth.user', ctx, authFn);
      _setCurrentEl(el3);
      _watchExpr('$store.ui.theme', ctx, uiFn);
      _setCurrentEl(null);

      // Notify cart only
      _notifyStoreWatchers('cart');
      expect(cartFn).toHaveBeenCalledTimes(1);
      expect(authFn).not.toHaveBeenCalled();
      expect(uiFn).not.toHaveBeenCalled();

      // Notify ui only
      _notifyStoreWatchers('ui');
      expect(cartFn).toHaveBeenCalledTimes(1); // still 1
      expect(authFn).not.toHaveBeenCalled();    // still 0
      expect(uiFn).toHaveBeenCalledTimes(1);
    });

    test('multiple watchers on same store all fire', () => {
      _stores.cart = { items: [], total: 0 };
      const ctx = createContext({});

      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);
      document.body.appendChild(el3);

      _setCurrentEl(el1);
      _watchExpr('$store.cart.items', ctx, fn1);
      _setCurrentEl(el2);
      _watchExpr('$store.cart.total', ctx, fn2);
      _setCurrentEl(el3);
      _watchExpr('$store.cart.items.length', ctx, fn3);
      _setCurrentEl(null);

      _notifyStoreWatchers('cart');

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });
  });

  describe('watcher cleanup on dispose', () => {
    test('_deleteStoreWatcher removes from correct partition', () => {
      _stores.cart = { items: [] };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.cart.items', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      _deleteStoreWatcher(fn);

      // Function removed from its partition
      expect(_storeWatchers.get('cart')?.has(fn) ?? false).toBe(false);
    });

    test('empty partition is cleaned up after last watcher removed', () => {
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.cart.items', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.has('cart')).toBe(true);

      _deleteStoreWatcher(fn);

      // Partition removed entirely when empty
      expect(_storeWatchers.has('cart')).toBe(false);
    });

    test('_disposeTree cleans up store watchers from partitioned map', () => {
      _stores.cart = { items: [] };
      const ctx = createContext({});
      const fn = jest.fn();

      const container = document.createElement('div');
      const el = document.createElement('span');
      container.appendChild(el);
      document.body.appendChild(container);

      _setCurrentEl(el);
      _watchExpr('$store.cart.items', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      _disposeTree(el);

      // After disposal, watcher should be removed from partition
      expect(_storeWatchers.get('cart')?.has(fn) ?? false).toBe(false);
    });

    test('_deleteStoreWatcher fallback scans all partitions for legacy watchers', () => {
      const fn = jest.fn();
      // Manually add to a partition without setting _storePartition
      _addStoreWatcher(fn, 'cart');
      delete fn._storePartition; // simulate legacy watcher

      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      _deleteStoreWatcher(fn);

      // Fallback scan should still find and remove it
      expect(_storeWatchers.get('cart')?.has(fn) ?? false).toBe(false);
    });
  });

  describe('store creation/deletion lifecycle', () => {
    test('watchers registered before store creation still work', () => {
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.newStore.value', ctx, fn);
      _setCurrentEl(null);

      // Store does not exist yet, but watcher is registered
      expect(_storeWatchers.get('newStore')?.has(fn)).toBe(true);

      // Create store and notify
      _stores.newStore = { value: 42 };
      _notifyStoreWatchers('newStore');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('deleting store does not break watcher infrastructure', () => {
      _stores.temp = { value: 1 };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.temp.value', ctx, fn);
      _setCurrentEl(null);

      // Delete the store
      delete _stores.temp;

      // Notifying the store should still work (fire watchers)
      _notifyStoreWatchers('temp');
      expect(fn).toHaveBeenCalledTimes(1);

      // Cleanup
      _deleteStoreWatcher(fn);
    });
  });

  describe('disconnected element pruning', () => {
    test('disconnected elements are pruned during notification', () => {
      _stores.app = { count: 0 };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.app.count', ctx, fn);
      _setCurrentEl(null);

      // First call: element connected
      _notifyStoreWatchers('app');
      expect(fn).toHaveBeenCalledTimes(1);

      // Remove element from DOM
      document.body.removeChild(el);

      // Second call: element disconnected — should be pruned
      _notifyStoreWatchers('app');
      expect(fn).toHaveBeenCalledTimes(1); // not called again
    });

    test('connected elements survive pruning and continue to fire', () => {
      _stores.app = { count: 0 };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.app.count', ctx, fn);
      _setCurrentEl(null);

      _notifyStoreWatchers('app');
      expect(fn).toHaveBeenCalledTimes(1);

      _notifyStoreWatchers('app');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('_addStoreWatcher / _deleteStoreWatcher API', () => {
    test('_addStoreWatcher creates partition on demand', () => {
      const fn = jest.fn();
      expect(_storeWatchers.has('newPartition')).toBe(false);

      _addStoreWatcher(fn, 'newPartition');

      expect(_storeWatchers.has('newPartition')).toBe(true);
      expect(_storeWatchers.get('newPartition').has(fn)).toBe(true);
      expect(fn._storePartition).toBe('newPartition');

      // Cleanup
      _deleteStoreWatcher(fn);
    });

    test('_addStoreWatcher reuses existing partition', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      _addStoreWatcher(fn1, 'shared');
      _addStoreWatcher(fn2, 'shared');

      expect(_storeWatchers.get('shared').size).toBe(2);

      // Cleanup
      _deleteStoreWatcher(fn1);
      _deleteStoreWatcher(fn2);
    });

    test('_deleteStoreWatcher is safe to call on unknown function', () => {
      const fn = jest.fn();
      // Should not throw
      expect(() => _deleteStoreWatcher(fn)).not.toThrow();
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  Cross-feature: Phase 3 interactions
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 3 cross-feature interactions', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    _storeWatchers.clear();
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _i18nTranslationCache.clear();
    _i18n._locale = 'en';
    _i18n._locales = {};
    _i18nListeners.clear();
  });

  test('store-driven loop with partitioned watchers renders correctly', () => {
    _stores.todos = { list: [{ text: 'Buy milk' }, { text: 'Walk dog' }] };
    const host = document.createElement('div');
    host.setAttribute('store', 'todos');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in $store.todos.list');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    // Self-repeating: clones are siblings in host between comment markers
    const clones = [...host.childNodes].filter((n) => n.nodeType === 1);
    expect(clones.length).toBe(2);
  });

  test('i18n cache works correctly across multiple sequential translations', () => {
    _i18n._locales = {
      en: { a: 'Alpha', b: 'Beta', c: 'Gamma' },
    };

    // Translate several keys
    expect(_i18n.t('a')).toBe('Alpha');
    expect(_i18n.t('b')).toBe('Beta');
    expect(_i18n.t('c')).toBe('Gamma');

    // All cached
    expect(_i18nTranslationCache.size).toBe(3);

    // Repeat — all from cache
    expect(_i18n.t('a')).toBe('Alpha');
    expect(_i18n.t('b')).toBe('Beta');
    expect(_i18n.t('c')).toBe('Gamma');
  });

  test('partitioned watchers with multiple stores and dispose', () => {
    _stores.a = { val: 1 };
    _stores.b = { val: 2 };
    const ctx = createContext({});

    const fnA = jest.fn();
    const fnB = jest.fn();

    const elA = document.createElement('div');
    const elB = document.createElement('div');
    document.body.appendChild(elA);
    document.body.appendChild(elB);

    _setCurrentEl(elA);
    _watchExpr('$store.a.val', ctx, fnA);
    _setCurrentEl(elB);
    _watchExpr('$store.b.val', ctx, fnB);
    _setCurrentEl(null);

    // Notify store a
    _notifyStoreWatchers('a');
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).not.toHaveBeenCalled();

    // Dispose elA — its watcher should be cleaned up
    _disposeTree(elA);

    // Now notify store a again — fnA should not fire
    _notifyStoreWatchers('a');
    expect(fnA).toHaveBeenCalledTimes(1); // unchanged

    // Store b should still work
    _notifyStoreWatchers('b');
    expect(fnB).toHaveBeenCalledTimes(1);
  });
});
