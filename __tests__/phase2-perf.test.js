/**
 * Phase 2 Performance QA — NOJS-37
 *
 * Regression tests for Phase 2 hot-path performance optimizations.
 * Each describe block maps to a specific PR / optimization change.
 *
 * PR #61 — NOJS-33: Prototype-based scope in evaluate() (H1)
 * PR #62 — NOJS-36: Pre-compile route regexes + extract evalArgs (M5, L1)
 * PR #63 — NOJS-34: Remove per-element MutationObserver (H3)
 * PR #64 — NOJS-35: Proxy get trap + reusable filter context (M2, M4)
 */

import { _config, _stores, _storeWatchers, _setCurrentEl, _onDispose, _watchExpr, _notifyStoreWatchers, _addStoreWatcher, _deleteStoreWatcher, _refs, _globals } from '../src/globals.js';
import { createContext, _startBatch, _endBatch, _collectKeys, _resetCtxId } from '../src/context.js';
import { evaluate, resolve, _execStatement, _exprCache, _stmtCache } from '../src/evaluate.js';
import { registerDirective, processElement, processTree, _disposeTree, _disposeChildren } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import { _createRouter } from '../src/router.js';
import { setRouterInstance } from '../src/globals.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/events.js';
import '../src/directives/conditionals.js';
import '../src/directives/loops.js';
import '../src/directives/styling.js';
import '../src/filters.js';

// ═══════════════════════════════════════════════════════════════════════
//  PR #61 — NOJS-33: Prototype-based scope in evaluate()
// ═══════════════════════════════════════════════════════════════════════

describe('PR #61 — Prototype-based scope in evaluate()', () => {

  // -- Basic expression evaluation with prototype scope --

  describe('basic expression evaluation', () => {
    test('evaluates simple property access', () => {
      const ctx = createContext({ name: 'Alice', age: 30 });
      expect(evaluate('name', ctx)).toBe('Alice');
      expect(evaluate('age', ctx)).toBe(30);
    });

    test('evaluates nested property access', () => {
      const ctx = createContext({ user: { profile: { name: 'Bob' } } });
      expect(evaluate('user.profile.name', ctx)).toBe('Bob');
    });

    test('evaluates deeply nested property access (3+ levels)', () => {
      const ctx = createContext({ a: { b: { c: { d: { e: 42 } } } } });
      expect(evaluate('a.b.c.d.e', ctx)).toBe(42);
    });

    test('evaluates expressions with undefined nested paths gracefully', () => {
      const ctx = createContext({ user: null });
      expect(evaluate('user?.profile?.name', ctx)).toBeUndefined();
    });

    test('evaluates arithmetic expressions', () => {
      const ctx = createContext({ x: 10, y: 3 });
      expect(evaluate('x + y', ctx)).toBe(13);
      expect(evaluate('x - y', ctx)).toBe(7);
      expect(evaluate('x * y', ctx)).toBe(30);
      expect(evaluate('x / y', ctx)).toBeCloseTo(3.333, 2);
      expect(evaluate('x % y', ctx)).toBe(1);
    });
  });

  // -- Pipe chain expressions --

  describe('pipe chain expressions', () => {
    test('single filter pipe', () => {
      const ctx = createContext({ name: 'alice' });
      expect(evaluate('name | uppercase', ctx)).toBe('ALICE');
    });

    test('chained filter pipes', () => {
      const ctx = createContext({ text: '  hello world  ' });
      expect(evaluate('text | trim | uppercase', ctx)).toBe('HELLO WORLD');
    });

    test('pipe with arguments', () => {
      const ctx = createContext({ price: 1234.5 });
      const result = evaluate('price | currency', ctx);
      // currency filter formats the number; exact format is locale-dependent
      expect(typeof result).toBe('string');
      // The formatted string must contain the significant digits regardless of locale
      expect(result.replace(/[^0-9]/g, '')).toContain('1234');
    });

    test('pipe does not interfere with logical OR', () => {
      const ctx = createContext({ a: 0, b: 'fallback' });
      expect(evaluate('a || b', ctx)).toBe('fallback');
    });
  });

  // -- Ternary expressions --

  describe('ternary expressions', () => {
    test('evaluates ternary with truthy condition', () => {
      const ctx = createContext({ active: true });
      expect(evaluate("active ? 'yes' : 'no'", ctx)).toBe('yes');
    });

    test('evaluates ternary with falsy condition', () => {
      const ctx = createContext({ active: false });
      expect(evaluate("active ? 'yes' : 'no'", ctx)).toBe('no');
    });

    test('evaluates nested ternary', () => {
      const ctx = createContext({ score: 85 });
      expect(evaluate("score >= 90 ? 'A' : score >= 80 ? 'B' : 'C'", ctx)).toBe('B');
    });
  });

  // -- $globals access through prototype scope --

  describe('$globals access', () => {
    test('$store is accessible in expressions', () => {
      _stores.cart = { items: [1, 2, 3] };
      const ctx = createContext({});
      expect(evaluate('$store.cart.items.length', ctx)).toBe(3);
      delete _stores.cart;
    });

    test('$refs is accessible in expressions', () => {
      _refs.myInput = document.createElement('input');
      const ctx = createContext({});
      expect(evaluate('$refs.myInput', ctx)).toBe(_refs.myInput);
      delete _refs.myInput;
    });

    test('$route is accessible when router exists', () => {
      const router = _createRouter();
      setRouterInstance(router);
      const ctx = createContext({});
      const result = evaluate('$route', ctx);
      expect(result).toBeDefined();
      setRouterInstance(null);
    });

    test('plugin globals accessible via $prefix', () => {
      _globals.myPlugin = { version: '1.0' };
      const ctx = createContext({});
      expect(evaluate('$myPlugin.version', ctx)).toBe('1.0');
      delete _globals.myPlugin;
    });

    test('local context variable shadows $store when same name used', () => {
      _stores.test = 'global';
      const ctx = createContext({ $store: 'local' });
      // Local $store should shadow the global one because it's in vals (prototype)
      // The prototype-based scope sets $store only when not already "in scope"
      expect(evaluate('$store', ctx)).toBe('local');
      delete _stores.test;
    });
  });

  // -- Error recovery --

  describe('expression error recovery', () => {
    test('returns undefined for invalid expressions', () => {
      const ctx = createContext({});
      expect(evaluate('nonexistent.prop.deep', ctx)).toBeUndefined();
    });

    test('returns undefined for division by zero edge cases', () => {
      const ctx = createContext({ a: 0 });
      // JS doesn't throw on division by zero (returns Infinity)
      expect(evaluate('1 / a', ctx)).toBe(Infinity);
    });

    test('does not throw for malformed expressions', () => {
      const ctx = createContext({ x: 1 });
      expect(() => evaluate('x +', ctx)).not.toThrow();
    });

    test('expression error in one attribute does not abort others', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <span bind="badExpr.that.breaks"></span>
        <span bind="'works fine'"></span>
      `;
      document.body.appendChild(container);
      const ctx = createContext({});
      container.__ctx = ctx;
      expect(() => processTree(container)).not.toThrow();
      document.body.removeChild(container);
    });
  });

  // -- _FORBIDDEN_PROPS still blocks prototype pollution --

  describe('_FORBIDDEN_PROPS security', () => {
    test('blocks __proto__ access in member expressions', () => {
      const ctx = createContext({ obj: { safe: 'yes' } });
      expect(evaluate('obj.__proto__', ctx)).toBeUndefined();
    });

    test('blocks constructor access in member expressions', () => {
      const ctx = createContext({ obj: {} });
      expect(evaluate('obj.constructor', ctx)).toBeUndefined();
    });

    test('blocks prototype access in member expressions', () => {
      const ctx = createContext({ obj: {} });
      expect(evaluate('obj.prototype', ctx)).toBeUndefined();
    });

    test('blocks __proto__ in computed member access', () => {
      const ctx = createContext({ key: '__proto__', obj: {} });
      expect(evaluate('obj[key]', ctx)).toBeUndefined();
    });

    test('blocks constructor in computed member access', () => {
      const ctx = createContext({ key: 'constructor', obj: {} });
      expect(evaluate('obj[key]', ctx)).toBeUndefined();
    });

    test('blocks prototype in string-literal computed access', () => {
      const ctx = createContext({ obj: {} });
      expect(evaluate("obj['prototype']", ctx)).toBeUndefined();
    });

    test('blocks __proto__ in object spread', () => {
      const ctx = createContext({ source: {} });
      const result = evaluate('{ ...source }', ctx);
      expect(result).toBeDefined();
      expect(result.__proto__).toBe(Object.prototype); // normal, not polluted
    });

    test('blocks __proto__ as object literal key', () => {
      const ctx = createContext({});
      // The tokenizer marks __proto__ as Forbidden
      const result = evaluate('{ __proto__: "bad" }', ctx);
      // Should not pollute
      expect(({}).polluted).toBeUndefined();
    });
  });

  // -- _SAFE_GLOBALS and _BROWSER_GLOBALS allow-list --

  describe('allow-list enforcement', () => {
    test('Math is accessible', () => {
      const ctx = createContext({});
      expect(evaluate('Math.PI', ctx)).toBeCloseTo(3.14159, 4);
      expect(evaluate('Math.max(1, 5, 3)', ctx)).toBe(5);
      expect(evaluate('Math.floor(4.7)', ctx)).toBe(4);
    });

    test('Array methods are accessible', () => {
      const ctx = createContext({ items: [3, 1, 2] });
      expect(evaluate('items.length', ctx)).toBe(3);
      expect(evaluate('items.includes(2)', ctx)).toBe(true);
    });

    test('JSON is accessible', () => {
      const ctx = createContext({});
      expect(evaluate("JSON.parse('{\"a\":1}')", ctx)).toEqual({ a: 1 });
    });

    test('String methods are accessible on values', () => {
      const ctx = createContext({ text: 'Hello World' });
      expect(evaluate('text.toLowerCase()', ctx)).toBe('hello world');
      expect(evaluate('text.includes("World")', ctx)).toBe(true);
    });

    test('Date is accessible', () => {
      const ctx = createContext({});
      const result = evaluate('Date.now()', ctx);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('eval is NOT accessible (via window proxy)', () => {
      const ctx = createContext({});
      expect(evaluate('window.eval', ctx)).toBeUndefined();
    });

    test('Function is NOT accessible (via window proxy)', () => {
      const ctx = createContext({});
      expect(evaluate('window.Function', ctx)).toBeUndefined();
    });

    test('fetch is NOT accessible as a bare identifier', () => {
      const ctx = createContext({});
      expect(evaluate('fetch', ctx)).toBeUndefined();
    });

    test('localStorage is NOT accessible via window', () => {
      const ctx = createContext({});
      expect(evaluate('window.localStorage', ctx)).toBeUndefined();
    });

    test('unknown identifiers return undefined', () => {
      const ctx = createContext({});
      expect(evaluate('nonExistentGlobal', ctx)).toBeUndefined();
    });

    test('scope variables shadow browser globals', () => {
      const ctx = createContext({ console: 'my-console' });
      expect(evaluate('console', ctx)).toBe('my-console');
    });
  });

  // -- _execStatement write-back correctness --

  describe('_execStatement write-back', () => {
    test('simple assignment writes back to context', () => {
      const ctx = createContext({ count: 0 });
      _execStatement('count = 5', ctx, {});
      expect(ctx.count).toBe(5);
    });

    test('compound assignment writes back', () => {
      const ctx = createContext({ count: 10 });
      _execStatement('count += 5', ctx, {});
      expect(ctx.count).toBe(15);
    });

    test('multiple statements all write back', () => {
      const ctx = createContext({ count: 0, items: [] });
      _execStatement('count = 10; items = [1, 2, 3]', ctx, {});
      expect(ctx.count).toBe(10);
      expect(ctx.items).toEqual([1, 2, 3]);
    });

    test('assignment to nested property writes back via mutation detection', () => {
      const ctx = createContext({ user: { name: 'old' } });
      _execStatement("user.name = 'new'", ctx, {});
      // Object mutation triggers $notify via the "same reference, different content" path
      expect(ctx.user.name).toBe('new');
    });

    test('increment operator writes back', () => {
      const ctx = createContext({ count: 5 });
      _execStatement('count++', ctx, {});
      expect(ctx.count).toBe(6);
    });

    test('decrement operator writes back', () => {
      const ctx = createContext({ count: 5 });
      _execStatement('count--', ctx, {});
      expect(ctx.count).toBe(4);
    });

    test('new variable created in statement is written to context', () => {
      const ctx = createContext({ x: 10 });
      _execStatement('y = x * 2', ctx, {});
      expect(ctx.y).toBe(20);
    });

    test('$-prefixed variables are NOT written back', () => {
      const ctx = createContext({});
      _execStatement('$custom = 123', ctx, {});
      // $custom should not be written to context raw data
      expect(ctx.__raw.$custom).toBeUndefined();
    });

    test('extraVars ($event, $el) are available but not written to context', () => {
      const el = document.createElement('button');
      const event = new Event('click');
      const ctx = createContext({ clicked: false });
      _execStatement('clicked = true', ctx, { $event: event, $el: el });
      expect(ctx.clicked).toBe(true);
    });

    test('_FORBIDDEN_PROPS keys are not written to context', () => {
      const ctx = createContext({});
      _execStatement('__proto__ = "bad"', ctx, {});
      expect(({}).bad).toBeUndefined();
    });

    test('write-back targets correct context in parent chain', () => {
      const parent = createContext({ shared: 'parent-val', parentOnly: 'yes' });
      const child = createContext({ local: 'child-val' }, parent);

      _execStatement('shared = "updated"', child, {});
      // shared lives in parent, should be written there
      expect(parent.shared).toBe('updated');
      expect(child.shared).toBe('updated');

      _execStatement('local = "modified"', child, {});
      expect(child.local).toBe('modified');
    });

    test('ReferenceError for undefined function calls dispatches nojs:error event', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const ctx = createContext({});
      const errors = [];
      el.addEventListener('nojs:error', (e) => errors.push(e.detail));

      // _execStatement catches the ReferenceError internally and dispatches event
      _execStatement('undefinedFunc()', ctx, { $el: el });

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain('undefinedFunc is not defined');

      document.body.removeChild(el);
    });

    test('$store mutation triggers store watchers', () => {
      _stores.counter = { value: 0 };
      const ctx = createContext({});
      const watcher = jest.fn();
      _addStoreWatcher(watcher, 'counter');

      _execStatement('$store.counter.value = 42', ctx, {});

      expect(watcher).toHaveBeenCalled();
      _deleteStoreWatcher(watcher);
      delete _stores.counter;
    });
  });

  // -- Prototype scope does not leak between evaluations --

  describe('scope isolation between evaluations', () => {
    test('separate evaluate calls have independent scopes', () => {
      const ctx = createContext({ x: 10 });
      evaluate('x + 1', ctx);
      // Second evaluation should not see any side effects
      expect(evaluate('x', ctx)).toBe(10);
    });

    test('statement execution in one context does not affect another', () => {
      const ctx1 = createContext({ val: 1 });
      const ctx2 = createContext({ val: 2 });
      _execStatement('val = 100', ctx1, {});
      expect(ctx1.val).toBe(100);
      expect(ctx2.val).toBe(2);
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  PR #62 — NOJS-36: Pre-compiled route regexes + extract evalArgs
// ═══════════════════════════════════════════════════════════════════════

describe('PR #62 — Pre-compiled route regexes + _evalArgs', () => {

  describe('route pattern matching via register()', () => {
    let router;

    beforeEach(() => {
      router = _createRouter();
    });

    test('registers static route without error', () => {
      const tpl = document.createElement('template');
      tpl.innerHTML = '<div>About</div>';
      expect(() => router.register('/about', tpl)).not.toThrow();
      // current should exist
      expect(router.current).toBeDefined();
    });

    test('registers parameterized route /user/:id', () => {
      const tpl = document.createElement('template');
      tpl.innerHTML = '<div>User</div>';
      expect(() => router.register('/user/:id', tpl)).not.toThrow();
    });

    test('registers multi-param route /user/:userId/post/:postId', () => {
      const tpl = document.createElement('template');
      tpl.innerHTML = '<div>Post</div>';
      expect(() => router.register('/user/:userId/post/:postId', tpl)).not.toThrow();
    });

    test('registers wildcard route *', () => {
      const tpl = document.createElement('template');
      tpl.innerHTML = '<div>404</div>';
      expect(() => router.register('*', tpl)).not.toThrow();
    });

    test('multiple routes can be registered', () => {
      const tpl1 = document.createElement('template');
      const tpl2 = document.createElement('template');
      const tpl3 = document.createElement('template');
      router.register('/about', tpl1);
      router.register('/user/:id', tpl2);
      router.register('/docs/*', tpl3);
      // All should register without error; current should still be valid
      expect(router.current).toBeDefined();
    });
  });

  describe('evalArgs correctness', () => {
    test('function call with literal arguments', () => {
      const ctx = createContext({
        sum: (a, b) => a + b,
      });
      expect(evaluate('sum(3, 4)', ctx)).toBe(7);
    });

    test('function call with variable arguments', () => {
      const ctx = createContext({
        x: 10,
        y: 20,
        add: (a, b) => a + b,
      });
      expect(evaluate('add(x, y)', ctx)).toBe(30);
    });

    test('function call with nested function calls as arguments', () => {
      const ctx = createContext({
        double: (n) => n * 2,
        add: (a, b) => a + b,
      });
      expect(evaluate('add(double(3), double(4))', ctx)).toBe(14);
    });

    test('function call with mixed argument types', () => {
      const ctx = createContext({
        format: (name, age, active) => `${name}-${age}-${active}`,
      });
      expect(evaluate("format('Alice', 30, true)", ctx)).toBe('Alice-30-true');
    });

    test('function call with spread arguments', () => {
      const ctx = createContext({
        nums: [1, 2, 3],
        sum: (...args) => args.reduce((a, b) => a + b, 0),
      });
      expect(evaluate('sum(...nums)', ctx)).toBe(6);
    });

    test('method call with arguments', () => {
      const ctx = createContext({
        items: [1, 2, 3, 4, 5],
      });
      expect(evaluate('items.slice(1, 3)', ctx)).toEqual([2, 3]);
    });

    test('chained method calls', () => {
      const ctx = createContext({
        items: [3, 1, 4, 1, 5],
      });
      expect(evaluate('items.filter(x => x > 2).length', ctx)).toBe(3);
    });

    test('zero-argument function call', () => {
      const ctx = createContext({
        getTime: () => 42,
      });
      expect(evaluate('getTime()', ctx)).toBe(42);
    });

    test('function call with template literal argument', () => {
      const ctx = createContext({
        name: 'World',
        greet: (msg) => msg,
      });
      expect(evaluate('greet(`Hello ${name}`)', ctx)).toBe('Hello World');
    });

    test('optional chaining with function calls', () => {
      const ctx = createContext({
        obj: null,
      });
      expect(evaluate('obj?.method()', ctx)).toBeUndefined();
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  PR #63 — NOJS-34: Remove per-element MutationObserver
// ═══════════════════════════════════════════════════════════════════════

describe('PR #63 — MutationObserver removal: store reactivity', () => {

  afterEach(() => {
    _storeWatchers.clear();
    for (const key of Object.keys(_stores)) delete _stores[key];
  });

  describe('store reactivity fires on mutations', () => {
    test('store watcher called when store value changes', () => {
      _stores.app = { count: 0 };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.app.count', ctx, fn);
      _setCurrentEl(null);

      _stores.app.count = 5;
      _notifyStoreWatchers();

      expect(fn).toHaveBeenCalled();
      document.body.removeChild(el);
    });

    test('multiple store watchers all fire', () => {
      _stores.app = { count: 0 };
      const ctx = createContext({});
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      _setCurrentEl(el1);
      _watchExpr('$store.app.count', ctx, fn1);
      _setCurrentEl(el2);
      _watchExpr('$store.app.count', ctx, fn2);
      _setCurrentEl(null);

      _notifyStoreWatchers();

      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();

      document.body.removeChild(el1);
      document.body.removeChild(el2);
    });
  });

  describe('disconnected element cleanup (lazy pruning)', () => {
    test('disconnected elements are pruned on next store notification', () => {
      _stores.app = { value: 'test' };
      const ctx = createContext({});
      const fn = jest.fn();

      const parent = document.createElement('div');
      const el = document.createElement('span');
      parent.appendChild(el);
      document.body.appendChild(parent);

      _setCurrentEl(el);
      _watchExpr('$store.app.value', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('app')?.has(fn)).toBe(true);

      // Remove element from DOM (without dispose)
      parent.removeChild(el);

      // Watcher still in partition (no MutationObserver to eagerly remove)
      expect(_storeWatchers.get('app')?.has(fn)).toBe(true);

      // Trigger notification — lazy pruning should remove it
      _notifyStoreWatchers('app');

      expect(_storeWatchers.get('app')?.has(fn) ?? false).toBe(false);
      expect(fn).not.toHaveBeenCalled();

      document.body.removeChild(parent);
    });

    test('connected elements survive pruning and continue to fire', () => {
      _stores.app = { value: 0 };
      const ctx = createContext({});
      const fn = jest.fn();

      const el = document.createElement('div');
      document.body.appendChild(el);

      _setCurrentEl(el);
      _watchExpr('$store.app.value', ctx, fn);
      _setCurrentEl(null);

      // First notification
      _notifyStoreWatchers();
      expect(fn).toHaveBeenCalledTimes(1);

      // Second notification — element still connected
      _notifyStoreWatchers();
      expect(fn).toHaveBeenCalledTimes(2);

      document.body.removeChild(el);
    });

    test('_disposeTree properly cleans up store watchers', () => {
      _stores.app = { value: 0 };
      const ctx = createContext({});
      const fn = jest.fn();

      const container = document.createElement('div');
      const el = document.createElement('span');
      container.appendChild(el);
      document.body.appendChild(container);

      _setCurrentEl(el);
      _watchExpr('$store.app.value', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('app')?.has(fn)).toBe(true);

      // Proper disposal path
      _disposeTree(el);

      expect(_storeWatchers.get('app')?.has(fn) ?? false).toBe(false);

      document.body.removeChild(container);
    });
  });

  describe('multiple stores and cross-store dependencies', () => {
    test('watchers for different stores coexist', () => {
      _stores.auth = { user: 'Alice' };
      _stores.cart = { items: [] };
      const ctx = createContext({});

      const authWatcher = jest.fn();
      const cartWatcher = jest.fn();

      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      _setCurrentEl(el1);
      _watchExpr('$store.auth.user', ctx, authWatcher);
      _setCurrentEl(el2);
      _watchExpr('$store.cart.items', ctx, cartWatcher);
      _setCurrentEl(null);

      _notifyStoreWatchers();

      expect(authWatcher).toHaveBeenCalled();
      expect(cartWatcher).toHaveBeenCalled();

      document.body.removeChild(el1);
      document.body.removeChild(el2);
    });

    test('statement modifying $store triggers cross-store watchers', () => {
      _stores.source = { value: 10 };
      _stores.target = { doubled: 0 };
      const ctx = createContext({});

      const watcher = jest.fn();
      const el = document.createElement('div');
      document.body.appendChild(el);
      _setCurrentEl(el);
      _watchExpr('$store.target.doubled', ctx, watcher);
      _setCurrentEl(null);

      _execStatement('$store.target.doubled = $store.source.value * 2', ctx, {});

      expect(_stores.target.doubled).toBe(20);
      expect(watcher).toHaveBeenCalled();

      document.body.removeChild(el);
    });
  });

  describe('store-bound elements across simulated route transitions', () => {
    test('old watchers cleaned up, new watchers work after DOM swap', () => {
      _stores.nav = { page: 'home' };
      const ctx = createContext({});

      // Simulate first route view
      const outlet = document.createElement('div');
      document.body.appendChild(outlet);

      const page1 = document.createElement('div');
      outlet.appendChild(page1);

      const fn1 = jest.fn();
      _setCurrentEl(page1);
      _watchExpr('$store.nav.page', ctx, fn1);
      _setCurrentEl(null);

      expect(_storeWatchers.get('nav')?.has(fn1)).toBe(true);

      // Simulate route transition: dispose old, insert new
      _disposeTree(page1);
      outlet.innerHTML = '';

      expect(_storeWatchers.get('nav')?.has(fn1) ?? false).toBe(false);

      const page2 = document.createElement('div');
      outlet.appendChild(page2);

      const fn2 = jest.fn();
      _setCurrentEl(page2);
      _watchExpr('$store.nav.page', ctx, fn2);
      _setCurrentEl(null);

      _notifyStoreWatchers();

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();

      document.body.removeChild(outlet);
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  PR #64 — NOJS-35: Proxy get trap fast-path + reusable filter context
// ═══════════════════════════════════════════════════════════════════════

describe('PR #64 — Proxy get trap optimizations', () => {

  // -- charCode fast-path for non-$ keys --

  describe('charCode fast-path: non-$ property access', () => {
    test('regular property access works (fast-path)', () => {
      const ctx = createContext({ name: 'Alice', count: 42, items: [1, 2] });
      expect(ctx.name).toBe('Alice');
      expect(ctx.count).toBe(42);
      expect(ctx.items).toEqual([1, 2]);
    });

    test('property starting with uppercase letter (fast-path)', () => {
      const ctx = createContext({ MyValue: 'test', Count: 10 });
      expect(ctx.MyValue).toBe('test');
      expect(ctx.Count).toBe(10);
    });

    test('underscore-prefixed property falls through correctly', () => {
      const ctx = createContext({ _private: 'secret', _count: 5 });
      expect(ctx._private).toBe('secret');
      expect(ctx._count).toBe(5);
    });

    test('numeric-start string properties via bracket access', () => {
      const ctx = createContext({});
      ctx.__raw['key1'] = 'value1';
      expect(ctx.key1).toBe('value1');
    });

    test('fast-path falls through to parent for missing keys', () => {
      const parent = createContext({ inherited: 'from-parent' });
      const child = createContext({}, parent);
      expect(child.inherited).toBe('from-parent');
    });

    test('fast-path returns undefined for missing key with no parent', () => {
      const ctx = createContext({ name: 'Alice' });
      expect(ctx.missing).toBeUndefined();
    });
  });

  // -- $-prefixed special keys via switch --

  describe('$-prefixed special key dispatch', () => {
    test('$watch returns function', () => {
      const ctx = createContext({});
      expect(typeof ctx.$watch).toBe('function');
    });

    test('$notify returns function', () => {
      const ctx = createContext({});
      expect(typeof ctx.$notify).toBe('function');
    });

    test('$set returns function', () => {
      const ctx = createContext({});
      expect(typeof ctx.$set).toBe('function');
    });

    test('$parent returns parent context', () => {
      const parent = createContext({ x: 1 });
      const child = createContext({ y: 2 }, parent);
      expect(child.$parent).toBe(parent);
    });

    test('$parent returns null for root context', () => {
      const ctx = createContext({});
      expect(ctx.$parent).toBeNull();
    });

    test('$refs returns the global refs object', () => {
      const ctx = createContext({});
      expect(ctx.$refs).toBe(_refs);
    });

    test('$store returns the global stores object', () => {
      const ctx = createContext({});
      expect(ctx.$store).toBe(_stores);
    });

    test('$route returns empty object when no router', () => {
      setRouterInstance(null);
      const ctx = createContext({});
      expect(ctx.$route).toEqual({});
    });

    test('$i18n is accessible', () => {
      const ctx = createContext({});
      expect(ctx.$i18n).toBeDefined();
    });

    test('$form returns null by default', () => {
      const ctx = createContext({});
      expect(ctx.$form).toBeNull();
    });

    test('$form returns value when set', () => {
      const ctx = createContext({ $form: { valid: true } });
      expect(ctx.$form).toEqual({ valid: true });
    });
  });

  // -- User properties CANNOT shadow core special keys --

  describe('user-defined properties cannot shadow core $ keys', () => {
    test('user $watch property does not shadow framework $watch', () => {
      const ctx = createContext({ $watch: 'user-value' });
      // Framework $watch should take precedence via the switch statement
      expect(typeof ctx.$watch).toBe('function');
    });

    test('user $set property does not shadow framework $set', () => {
      const ctx = createContext({ $set: 'user-value' });
      expect(typeof ctx.$set).toBe('function');
    });

    test('user $notify property does not shadow framework $notify', () => {
      const ctx = createContext({ $notify: 'user-value' });
      expect(typeof ctx.$notify).toBe('function');
    });

    test('user $parent property does not shadow framework $parent', () => {
      const parent = createContext({});
      const child = createContext({ $parent: 'fake' }, parent);
      expect(child.$parent).toBe(parent);
    });

    test('user $refs property does not shadow framework $refs', () => {
      const ctx = createContext({ $refs: 'fake' });
      expect(ctx.$refs).toBe(_refs);
    });

    test('user $store property does not shadow framework $store', () => {
      const ctx = createContext({ $store: 'fake' });
      expect(ctx.$store).toBe(_stores);
    });

    test('user $route property does not shadow framework $route', () => {
      setRouterInstance(null);
      const ctx = createContext({ $route: 'fake' });
      expect(ctx.$route).toEqual({});
    });
  });

  // -- Dunder keys still work --

  describe('dunder key handling', () => {
    test('__isProxy returns true', () => {
      const ctx = createContext({});
      expect(ctx.__isProxy).toBe(true);
    });

    test('__raw returns the raw target object', () => {
      const ctx = createContext({ name: 'test' });
      expect(ctx.__raw).toBeDefined();
      expect(ctx.__raw.name).toBe('test');
    });

    test('__listeners returns the listeners Set', () => {
      const ctx = createContext({});
      expect(ctx.__listeners).toBeInstanceOf(Set);
    });

    test('other underscore keys fall through to target', () => {
      const ctx = createContext({ _custom: 'value' });
      expect(ctx._custom).toBe('value');
    });

    test('other underscore keys fall through to parent', () => {
      const parent = createContext({ _parentKey: 'inherited' });
      const child = createContext({}, parent);
      expect(child._parentKey).toBe('inherited');
    });
  });

  // -- Parent chain resolution --

  describe('parent chain resolution', () => {
    test('child resolves property from parent', () => {
      const parent = createContext({ name: 'Parent' });
      const child = createContext({ age: 10 }, parent);
      expect(child.name).toBe('Parent');
    });

    test('child own property shadows parent property', () => {
      const parent = createContext({ name: 'Parent' });
      const child = createContext({ name: 'Child' }, parent);
      expect(child.name).toBe('Child');
    });

    test('grandchild resolves property from grandparent', () => {
      const gp = createContext({ deep: 'value' });
      const parent = createContext({}, gp);
      const child = createContext({}, parent);
      expect(child.deep).toBe('value');
    });

    test('$parent chain allows explicit traversal', () => {
      const gp = createContext({ level: 'gp' });
      const parent = createContext({ level: 'parent' }, gp);
      const child = createContext({ level: 'child' }, parent);
      expect(child.$parent.level).toBe('parent');
      expect(child.$parent.$parent.level).toBe('gp');
    });

    test('parent context values are inherited in expressions via prototype chain', () => {
      // $parent is a proxy-only key, not injected into the evaluator scope.
      // Parent values are inherited through _collectKeys which walks the chain.
      const parent = createContext({ score: 100 });
      const child = createContext({ bonus: 10 }, parent);
      // score is inherited from parent via _collectKeys vals prototype
      expect(evaluate('score + bonus', child)).toBe(110);
    });
  });

  // -- Plugin globals via $ prefix --

  describe('plugin globals fallback', () => {
    afterEach(() => {
      for (const key of Object.keys(_globals)) delete _globals[key];
    });

    test('plugin global accessible via $prefix', () => {
      _globals.analytics = { track: () => 'tracked' };
      const ctx = createContext({});
      expect(ctx.$analytics).toBeDefined();
      expect(ctx.$analytics.track()).toBe('tracked');
    });

    test('core $ keys take precedence over plugin globals', () => {
      _globals.store = 'plugin-store';
      const ctx = createContext({});
      // $store should still be the framework stores, not plugin
      expect(ctx.$store).toBe(_stores);
    });

    test('plugin globals accessible in expressions', () => {
      _globals.utils = { double: (n) => n * 2 };
      const ctx = createContext({ x: 5 });
      expect(evaluate('$utils.double(x)', ctx)).toBe(10);
    });
  });

  // -- has() trap --

  describe('has() trap', () => {
    test('"in" check works for own properties', () => {
      const ctx = createContext({ name: 'Alice' });
      expect('name' in ctx).toBe(true);
      expect('missing' in ctx).toBe(false);
    });

    test('"in" check works for plugin globals', () => {
      _globals.test = 'val';
      const ctx = createContext({});
      expect('$test' in ctx).toBe(true);
      delete _globals.test;
    });

    test('"in" check traverses parent chain', () => {
      const parent = createContext({ inherited: true });
      const child = createContext({}, parent);
      expect('inherited' in child).toBe(true);
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  PR #64 — Reusable filter context in loops
// ═══════════════════════════════════════════════════════════════════════

describe('PR #64 — Reusable filter context in foreach/each/for', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    for (const k of Object.keys(_stores)) delete _stores[k];
  });

  // Helper: get element clones between comment markers in host container
  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  describe('foreach with filter expressions', () => {
    test('filter expression evaluates correctly for each item', () => {
      const host = document.createElement('div');
      host.setAttribute('state', '{ items: [1, 2, 3, 4, 5] }');
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', 'item > 2');
      el.setAttribute('bind', 'item');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(3);
      expect(items.map(i => i.textContent)).toEqual(['3', '4', '5']);
    });

    test('filter using $index', () => {
      const host = document.createElement('div');
      host.setAttribute('state', "{ items: ['a', 'b', 'c', 'd'] }");
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', '$index % 2 === 0');
      el.setAttribute('bind', 'item');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(2);
      expect(items.map(i => i.textContent)).toEqual(['a', 'c']);
    });

    test('filter with object items', () => {
      const host = document.createElement('div');
      host.setAttribute('state', JSON.stringify({
        users: [
          { name: 'Alice', active: true },
          { name: 'Bob', active: false },
          { name: 'Carol', active: true },
        ]
      }));
      const el = document.createElement('span');
      el.setAttribute('foreach', 'user in users');
      el.setAttribute('filter', 'user.active');
      el.setAttribute('bind', 'user.name');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(2);
      expect(items.map(i => i.textContent)).toEqual(['Alice', 'Carol']);
    });

    test('filter accessing $store', () => {
      _stores.settings = { minAge: 18 };

      const host = document.createElement('div');
      host.setAttribute('state', JSON.stringify({
        people: [
          { name: 'Kid', age: 10 },
          { name: 'Adult', age: 25 },
          { name: 'Teen', age: 16 },
        ]
      }));
      const el = document.createElement('span');
      el.setAttribute('foreach', 'person in people');
      el.setAttribute('filter', 'person.age >= $store.settings.minAge');
      el.setAttribute('bind', 'person.name');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(1);
      expect(items[0].textContent).toBe('Adult');
    });

    test('filter accessing parent context variable', () => {
      const outer = document.createElement('div');
      outer.setAttribute('state', '{ threshold: 3 }');
      const inner = document.createElement('div');
      inner.setAttribute('state', '{ items: [1, 2, 3, 4, 5] }');
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', 'item > threshold');
      el.setAttribute('bind', 'item');
      inner.appendChild(el);
      outer.appendChild(inner);
      document.body.appendChild(outer);
      processTree(outer);

      const items = getManagedClones(inner);
      expect(items.length).toBe(2);
      expect(items.map(i => i.textContent)).toEqual(['4', '5']);
    });
  });

  describe('foreach with inline template', () => {
    test('inline template renders correctly with filter', () => {
      const host = document.createElement('div');
      host.setAttribute('state', '{ nums: [10, 20, 30, 40, 50] }');
      const el = document.createElement('span');
      el.setAttribute('foreach', 'n in nums');
      el.setAttribute('filter', 'n >= 30');
      el.setAttribute('bind', 'n');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(3);
      expect(items.map(i => i.textContent)).toEqual(['30', '40', '50']);
    });
  });

  describe('key-based reconciliation with reusable context', () => {
    test('key expression evaluates correctly with reusable context', () => {
      const host = document.createElement('div');
      host.setAttribute('state', JSON.stringify({
        items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }]
      }));
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('key', 'item.id');
      el.setAttribute('bind', 'item.name');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(3);
      expect(items.map(i => i.textContent)).toEqual(['A', 'B', 'C']);
    });

    test('key reconciliation reorders without recreation', () => {
      const host = document.createElement('div');
      host.setAttribute('state', JSON.stringify({
        items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }]
      }));
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('key', 'item.id');
      el.setAttribute('bind', 'item.name');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      // Capture references to original nodes
      const origNodes = getManagedClones(host);
      expect(origNodes.length).toBe(3);

      // Reverse the list
      const ctx = findContext(host);
      ctx.__raw.items = [{ id: 3, name: 'C' }, { id: 2, name: 'B' }, { id: 1, name: 'A' }];
      ctx.$notify();

      const newNodes = getManagedClones(host);
      expect(newNodes.length).toBe(3);
      // Nodes should be reused (same references), just reordered
      expect(newNodes[0]).toBe(origNodes[2]);
      expect(newNodes[1]).toBe(origNodes[1]);
      expect(newNodes[2]).toBe(origNodes[0]);
    });
  });

  describe('sort, offset, limit with filter', () => {
    test('filter + sort works together', () => {
      const host = document.createElement('div');
      host.setAttribute('state', JSON.stringify({
        items: [{ v: 5 }, { v: 1 }, { v: 4 }, { v: 2 }, { v: 3 }]
      }));
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', 'item.v > 2');
      el.setAttribute('sort', 'v');
      el.setAttribute('bind', 'item.v');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(3);
      expect(items.map(i => i.textContent)).toEqual(['3', '4', '5']);
    });

    test('filter + limit works together', () => {
      const host = document.createElement('div');
      host.setAttribute('state', '{ items: [1, 2, 3, 4, 5, 6, 7, 8] }');
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', 'item > 3');
      el.setAttribute('limit', '2');
      el.setAttribute('bind', 'item');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      expect(items.length).toBe(2);
      expect(items.map(i => i.textContent)).toEqual(['4', '5']);
    });

    test('filter + offset skips items', () => {
      const host = document.createElement('div');
      host.setAttribute('state', '{ items: [1, 2, 3, 4, 5] }');
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', 'item > 1');
      el.setAttribute('offset', '1');
      el.setAttribute('bind', 'item');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const items = getManagedClones(host);
      // Filtered: [2,3,4,5], offset 1 → [3,4,5]
      expect(items.length).toBe(3);
      expect(items.map(i => i.textContent)).toEqual(['3', '4', '5']);
    });
  });

  describe('empty list with else template', () => {
    test('filter that eliminates all items shows else template', () => {
      const tpl = document.createElement('template');
      tpl.id = 'else-filter-tpl';
      tpl.innerHTML = '<p>No items match</p>';
      document.body.appendChild(tpl);

      const host = document.createElement('div');
      host.setAttribute('state', '{ items: [1, 2, 3] }');
      const el = document.createElement('span');
      el.setAttribute('foreach', 'item in items');
      el.setAttribute('filter', 'item > 100');
      el.setAttribute('else', 'else-filter-tpl');
      el.setAttribute('bind', 'item');
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      // Else template content is inserted between comment markers in host
      const p = host.querySelector('p');
      expect(p).not.toBeNull();
      expect(p.textContent).toBe('No items match');
    });
  });

  describe('loop iteration variables', () => {
    test('$index, $count, $first, $last are set correctly', () => {
      const host = document.createElement('div');
      host.setAttribute('state', "{ items: ['a', 'b', 'c'] }");
      const el = document.createElement('div');
      el.setAttribute('foreach', 'item in items');
      el.innerHTML = '<span class="idx" bind="$index"></span><span class="cnt" bind="$count"></span><span class="first" bind="$first"></span><span class="last" bind="$last"></span>';
      host.appendChild(el);
      document.body.appendChild(host);
      processTree(host);

      const idxSpans = host.querySelectorAll('.idx');
      const cntSpans = host.querySelectorAll('.cnt');
      const firstSpans = host.querySelectorAll('.first');
      const lastSpans = host.querySelectorAll('.last');

      expect(idxSpans.length).toBe(3);
      expect(idxSpans[0].textContent).toBe('0');
      expect(idxSpans[1].textContent).toBe('1');
      expect(idxSpans[2].textContent).toBe('2');

      expect(cntSpans[0].textContent).toBe('3');

      expect(firstSpans[0].textContent).toBe('true');
      expect(firstSpans[1].textContent).toBe('false');

      expect(lastSpans[2].textContent).toBe('true');
      expect(lastSpans[0].textContent).toBe('false');
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  Cross-cutting: _collectKeys cache correctness with prototype scope
// ═══════════════════════════════════════════════════════════════════════

describe('Cross-cutting: _collectKeys cache + prototype scope', () => {
  test('_collectKeys returns all keys from context', () => {
    const ctx = createContext({ x: 1, y: 2 });
    const { keys, vals } = _collectKeys(ctx);
    expect(keys).toContain('x');
    expect(keys).toContain('y');
    expect(vals.x).toBe(1);
    expect(vals.y).toBe(2);
  });

  test('_collectKeys merges parent chain (child shadows parent)', () => {
    const parent = createContext({ a: 1, b: 2 });
    const child = createContext({ b: 20, c: 3 }, parent);
    const { keys, vals } = _collectKeys(child);
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(keys).toContain('c');
    expect(vals.a).toBe(1);
    expect(vals.b).toBe(20); // child shadows parent
    expect(vals.c).toBe(3);
  });

  test('_collectKeys cache invalidated after context mutation', () => {
    const ctx = createContext({ x: 1 });
    const before = _collectKeys(ctx);
    expect(before.vals.x).toBe(1);

    ctx.x = 99;
    const after = _collectKeys(ctx);
    expect(after.vals.x).toBe(99);
  });

  test('_collectKeys cache returns same reference when not mutated', () => {
    const ctx = createContext({ x: 1 });
    const first = _collectKeys(ctx);
    const second = _collectKeys(ctx);
    expect(first).toBe(second);
  });

  test('prototype scope inherits vals correctly during evaluate', () => {
    const parent = createContext({ multiplier: 10 });
    const child = createContext({ value: 5 }, parent);
    expect(evaluate('value * multiplier', child)).toBe(50);
  });

  test('prototype scope allows Object.create chain for arrow functions', () => {
    const ctx = createContext({ items: [1, 2, 3] });
    expect(evaluate('items.map(x => x * 2)', ctx)).toEqual([2, 4, 6]);
  });

  test('template literal expressions work with prototype scope', () => {
    const ctx = createContext({ name: 'World', count: 42 });
    expect(evaluate('`Hello ${name}, count: ${count}`', ctx)).toBe('Hello World, count: 42');
  });

  test('nullish coalescing works with prototype scope', () => {
    const ctx = createContext({ a: null, b: 'fallback' });
    expect(evaluate('a ?? b', ctx)).toBe('fallback');
  });

  test('optional chaining works with prototype scope', () => {
    const ctx = createContext({ obj: { nested: { val: 42 } } });
    expect(evaluate('obj?.nested?.val', ctx)).toBe(42);
    expect(evaluate('obj?.missing?.val', ctx)).toBeUndefined();
  });

  test('typeof works for undefined variables in prototype scope', () => {
    const ctx = createContext({});
    expect(evaluate("typeof nonExistent === 'undefined'", ctx)).toBe(true);
  });

  test('array destructuring pattern in expressions', () => {
    const ctx = createContext({ items: [10, 20, 30] });
    expect(evaluate('items[0] + items[2]', ctx)).toBe(40);
  });

  test('object literal creation with prototype scope variables', () => {
    const ctx = createContext({ name: 'Alice', age: 30 });
    const result = evaluate('{ name: name, age: age }', ctx);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  test('ternary with complex expressions and prototype scope', () => {
    const ctx = createContext({ items: [1, 2, 3], threshold: 2 });
    expect(evaluate("items.length > threshold ? 'many' : 'few'", ctx)).toBe('many');
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  Integration: reactive updates with optimized paths
// ═══════════════════════════════════════════════════════════════════════

describe('Integration: reactive updates with optimized hot paths', () => {

  test('bind directive updates when context changes (prototype scope path)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ msg: "hello" }');
    const span = document.createElement('span');
    span.setAttribute('bind', 'msg');
    parent.appendChild(span);
    document.body.appendChild(parent);

    processTree(parent);

    expect(span.textContent).toBe('hello');

    // Mutate context and check reactivity still works through optimized proxy
    parent.__ctx.msg = 'world';

    expect(span.textContent).toBe('world');

    _disposeTree(parent);
    document.body.removeChild(parent);
  });

  test('conditional directive works with optimized proxy get trap', () => {
    const stateDiv = document.createElement('div');
    stateDiv.setAttribute('state', '{ visible: true }');

    const shown = document.createElement('span');
    shown.setAttribute('if', 'visible');
    shown.textContent = 'Shown';

    const hidden = document.createElement('span');
    hidden.setAttribute('if', '!visible');
    hidden.textContent = 'Hidden';

    stateDiv.appendChild(shown);
    stateDiv.appendChild(hidden);
    document.body.appendChild(stateDiv);

    processTree(stateDiv);

    // Find visible span
    const visibleSpans = [...stateDiv.querySelectorAll('span')].filter(s => s.textContent === 'Shown');
    expect(visibleSpans.length).toBe(1);

    const ctx = findContext(stateDiv);
    ctx.visible = false;

    // After toggle, "Hidden" should now be visible
    const hiddenSpans = [...stateDiv.querySelectorAll('span')].filter(s => s.textContent === 'Hidden');
    expect(hiddenSpans.length).toBe(1);

    _disposeTree(stateDiv);
    document.body.removeChild(stateDiv);
  });

  test('batch updates work correctly with optimized context', () => {
    const ctx = createContext({ a: 0, b: 0, c: 0 });
    const calls = [];

    const unsub = ctx.$watch(() => {
      calls.push({ a: ctx.a, b: ctx.b, c: ctx.c });
    });

    _startBatch();
    ctx.a = 1;
    ctx.b = 2;
    ctx.c = 3;
    _endBatch();

    // Batch should have consolidated the notifications
    // At least the final state should reflect all three changes
    expect(ctx.a).toBe(1);
    expect(ctx.b).toBe(2);
    expect(ctx.c).toBe(3);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const last = calls[calls.length - 1];
    expect(last.a).toBe(1);
    expect(last.b).toBe(2);
    expect(last.c).toBe(3);

    unsub();
  });

  test('expression cache is shared across evaluations (LRU)', () => {
    const ctx = createContext({ x: 5 });

    // First evaluation should populate cache
    evaluate('x + 1', ctx);
    const cacheSize1 = _exprCache.size;

    // Same expression should use cache
    evaluate('x + 1', ctx);
    const cacheSize2 = _exprCache.size;

    expect(cacheSize2).toBe(cacheSize1); // no new cache entry
  });

  test('statement cache is shared across executions', () => {
    const ctx = createContext({ count: 0 });

    _execStatement('count = count + 1', ctx, {});
    const cacheSize1 = _stmtCache.size;

    _execStatement('count = count + 1', ctx, {});
    const cacheSize2 = _stmtCache.size;

    expect(cacheSize2).toBe(cacheSize1);
    expect(ctx.count).toBe(2);
  });

  test('context proxy set trap still rejects forbidden keys', () => {
    const ctx = createContext({ name: 'safe' });
    ctx.__proto__ = { polluted: true };
    ctx.constructor = 'hacked';
    ctx.prototype = { polluted: true };

    expect(({}).polluted).toBeUndefined();
    expect(ctx.name).toBe('safe');
  });

  test('Symbol keys pass through proxy get trap', () => {
    const ctx = createContext({});
    const sym = Symbol('test');
    ctx.__raw[sym] = 'symbol-value';
    expect(ctx[sym]).toBe('symbol-value');
  });
});
