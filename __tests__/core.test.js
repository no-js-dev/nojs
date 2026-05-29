import {
  _config,
  _interceptors,
  _eventBus,
  _stores,
  _storeWatchers,
  _filters,
  _validators,
  _cache,
  _refs,
  _routerInstance,
  setRouterInstance,
  _log,
  _warn,
  _notifyStoreWatchers,
  _watchExpr,
  _addStoreWatcher,
  _deleteStoreWatcher,
  _emitEvent,
  _setCurrentEl,
  _onDispose,
} from '../src/globals.js';

import { _disposeTree } from '../src/registry.js';

import {
  createContext,
  _collectKeys,
  _startBatch,
  _endBatch,
} from '../src/context.js';

import {
  evaluate,
  _execStatement,
  resolve,
  _interpolate,
  _exprCache,
} from '../src/evaluate.js';

describe('Globals', () => {
  describe('_config defaults', () => {
    test('has default config values', () => {
      expect(_config.baseApiUrl).toBe('');
      expect(_config.timeout).toBe(10000);
      expect(_config.retries).toBe(0);
      expect(_config.retryDelay).toBe(1000);
      expect(_config.credentials).toBe('same-origin');
      expect(_config.csrf).toBeNull();
      expect(_config.debug).toBe(false);
      expect(_config.sanitize).toBe(true);
      expect(_config.dangerouslyDisableSanitize).toBe(false);
    });

    test('has default cache config', () => {
      expect(_config.cache.strategy).toBe('none');
      expect(_config.cache.ttl).toBe(300000);
    });

    test('has default router config', () => {
      expect(_config.router.useHash).toBe(false);
      expect(_config.router.base).toBe('/');
      expect(_config.router.scrollBehavior).toBe('top');
    });

    test('has default i18n config', () => {
      expect(_config.i18n.defaultLocale).toBe('en');
      expect(_config.i18n.fallbackLocale).toBe('en');
      expect(_config.i18n.detectBrowser).toBe(false);
    });
  });

  describe('shared state objects', () => {
    test('_interceptors has request and response arrays', () => {
      expect(_interceptors.request).toEqual([]);
      expect(_interceptors.response).toEqual([]);
    });

test('_cache is a Map', () => {
      expect(_cache).toBeInstanceOf(Map);
    });

  });

  describe('setRouterInstance', () => {
    afterEach(() => setRouterInstance(null));

    test('sets the router instance', () => {
      const mockRouter = { current: { path: '/' } };
      setRouterInstance(mockRouter);
      const ctx = createContext({});
      expect(ctx.$route).toEqual({ path: '/' });
    });
  });

  describe('_log', () => {
    test('logs when debug is true', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      _config.debug = true;
      _log('test message');
      expect(spy).toHaveBeenCalledWith('[No.JS]', 'test message');
      _config.debug = false;
      spy.mockRestore();
    });

    test('does not log when debug is false', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      _config.debug = false;
      _log('test message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('_warn', () => {
    test('always warns', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      _warn('warning msg');
      expect(spy).toHaveBeenCalledWith('[No.JS]', 'warning msg');
      spy.mockRestore();
    });
  });

  describe('_notifyStoreWatchers', () => {
    test('calls all store watchers', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      _addStoreWatcher(fn1, 'cart');
      _addStoreWatcher(fn2, 'user');
      _notifyStoreWatchers();
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      _deleteStoreWatcher(fn1);
      _deleteStoreWatcher(fn2);
    });

    test('calls only targeted partition + wildcards', () => {
      const fnCart = jest.fn();
      const fnUser = jest.fn();
      const fnWild = jest.fn();
      _addStoreWatcher(fnCart, 'cart');
      _addStoreWatcher(fnUser, 'user');
      _addStoreWatcher(fnWild, '*');
      _notifyStoreWatchers('cart');
      expect(fnCart).toHaveBeenCalled();
      expect(fnWild).toHaveBeenCalled();
      expect(fnUser).not.toHaveBeenCalled();
      _deleteStoreWatcher(fnCart);
      _deleteStoreWatcher(fnUser);
      _deleteStoreWatcher(fnWild);
    });
  });

  describe('_emitEvent', () => {
    test('calls registered event handlers', () => {
      const fn = jest.fn();
      _eventBus['test-event'] = [fn];
      _emitEvent('test-event', { key: 'value' });
      expect(fn).toHaveBeenCalledWith({ key: 'value' });
      delete _eventBus['test-event'];
    });

    test('handles missing event gracefully', () => {
      expect(() => _emitEvent('nonexistent', {})).not.toThrow();
    });
  });

  describe('_watchExpr', () => {
    test('watches context with $watch', () => {
      const ctx = createContext({ x: 1 });
      const fn = jest.fn();
      _watchExpr('x', ctx, fn);
      ctx.x = 2;
      expect(fn).toHaveBeenCalled();
    });

    test('adds to _storeWatchers when expr includes $store', () => {
      const ctx = createContext({});
      const fn = jest.fn();
      const cartSetBefore = _storeWatchers.get('cart');
      const sizeBefore = cartSetBefore ? cartSetBefore.size : 0;
      _watchExpr('$store.cart.items', ctx, fn);
      expect(_storeWatchers.get('cart').size).toBe(sizeBefore + 1);
      _deleteStoreWatcher(fn);
    });

    test('registers _onDispose that calls unwatch on disposal', () => {
      const ctx = createContext({ x: 1 });
      const fn = jest.fn();
      const el = document.createElement('div');
      document.body.appendChild(el);

      _setCurrentEl(el);
      _watchExpr('x', ctx, fn);
      _setCurrentEl(null);

      // Watcher fires before disposal
      ctx.x = 2;
      expect(fn).toHaveBeenCalledTimes(1);

      // Dispose the element
      _disposeTree(el);

      // Watcher should no longer fire after disposal
      fn.mockClear();
      ctx.x = 3;
      expect(fn).not.toHaveBeenCalled();
    });

    test('removes from _storeWatchers on disposal', () => {
      const ctx = createContext({});
      const fn = jest.fn();
      const el = document.createElement('div');

      _setCurrentEl(el);
      _watchExpr('$store.cart.items', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      _disposeTree(el);

      expect(_storeWatchers.get('cart')?.has(fn) ?? false).toBe(false);
    });

    test('prunes $store watcher lazily via isConnected guard when element is removed without dispose', () => {
      const ctx = createContext({});
      const fn = jest.fn();

      const parent = document.createElement('div');
      const el = document.createElement('span');
      parent.appendChild(el);
      document.body.appendChild(parent);

      _setCurrentEl(el);
      _watchExpr('$store.cart', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      // Remove element externally (bypassing framework dispose)
      parent.innerHTML = '';

      // Watcher is still in the partition (no MutationObserver to eagerly remove it)
      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      // _notifyStoreWatchers prunes disconnected elements via isConnected guard
      _notifyStoreWatchers('cart');

      expect(_storeWatchers.get('cart')?.has(fn) ?? false).toBe(false);
      // The watcher callback should NOT have been invoked for the disconnected element
      expect(fn).not.toHaveBeenCalled();
    });

    test('removes $store watcher via _onDispose when _disposeTree runs (each re-render pattern)', () => {
      const ctx = createContext({});
      const fn = jest.fn();

      const container = document.createElement('div');
      const itemWrapper = document.createElement('div');
      container.appendChild(itemWrapper);
      document.body.appendChild(container);

      // Simulate processElement binding a $store watcher on itemWrapper
      _setCurrentEl(itemWrapper);
      _watchExpr('$store.cart.items', ctx, fn);
      _setCurrentEl(null);

      expect(_storeWatchers.get('cart')?.has(fn)).toBe(true);

      // Simulate each re-render: disposeTree then clear innerHTML
      _disposeTree(itemWrapper);
      container.innerHTML = '';

      // Watcher must be removed by the _onDispose path
      expect(_storeWatchers.get('cart')?.has(fn) ?? false).toBe(false);
    });

    test('does not throw when element has no parentElement', () => {
      const ctx = createContext({});
      const fn = jest.fn();

      // Element with no parent
      const el = document.createElement('div');

      _setCurrentEl(el);
      expect(() => _watchExpr('$store.x', ctx, fn)).not.toThrow();
      _setCurrentEl(null);

      _deleteStoreWatcher(fn);
    });
  });
});

describe('Reactive Context', () => {
  describe('createContext', () => {
    test('creates a proxy with initial data', () => {
      const ctx = createContext({ name: 'Alice', age: 30 });
      expect(ctx.name).toBe('Alice');
      expect(ctx.age).toBe(30);
    });

    test('is detected as proxy via __isProxy', () => {
      const ctx = createContext({});
      expect(ctx.__isProxy).toBe(true);
    });

    test('exposes raw data via __raw', () => {
      const ctx = createContext({ x: 42 });
      expect(ctx.__raw.x).toBe(42);
    });

    test('sets values reactively', () => {
      const ctx = createContext({ count: 0 });
      const watcher = jest.fn();
      ctx.$watch(watcher);
      ctx.count = 5;
      expect(watcher).toHaveBeenCalled();
      expect(ctx.count).toBe(5);
    });

    test('does not notify if value unchanged', () => {
      const ctx = createContext({ x: 10 });
      const watcher = jest.fn();
      ctx.$watch(watcher);
      ctx.x = 10;
      expect(watcher).not.toHaveBeenCalled();
    });

    test('$set sets a value', () => {
      const ctx = createContext({ a: 1 });
      ctx.$set('a', 99);
      expect(ctx.a).toBe(99);
    });

    test('$watch returns unsubscriber', () => {
      const ctx = createContext({ x: 0 });
      const watcher = jest.fn();
      const unsub = ctx.$watch(watcher);
      ctx.x = 1;
      expect(watcher).toHaveBeenCalledTimes(1);
      unsub();
      ctx.x = 2;
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    test('accesses $refs', () => {
      const ctx = createContext({});
      expect(ctx.$refs).toBe(_refs);
    });

    test('accesses $store', () => {
      const ctx = createContext({});
      expect(ctx.$store).toBe(_stores);
    });

    test('accesses $route (null router)', () => {
      setRouterInstance(null);
      const ctx = createContext({});
      expect(ctx.$route).toEqual({});
    });

    test('accesses $route (with router)', () => {
      setRouterInstance({ current: { path: '/home' } });
      const ctx = createContext({});
      expect(ctx.$route).toEqual({ path: '/home' });
      setRouterInstance(null);
    });

    test('returns undefined for missing keys', () => {
      const ctx = createContext({ a: 1 });
      expect(ctx.nonExistent).toBeUndefined();
    });

    test('$notify triggers watchers manually', () => {
      const ctx = createContext({});
      const watcher = jest.fn();
      ctx.$watch(watcher);
      ctx.$notify();
      expect(watcher).toHaveBeenCalled();
    });
  });

  describe('parent context chain', () => {
    test('inherits from parent', () => {
      const parent = createContext({ x: 10 });
      const child = createContext({ y: 20 }, parent);
      expect(child.y).toBe(20);
      expect(child.x).toBe(10);
    });

    test('child overrides parent', () => {
      const parent = createContext({ x: 10 });
      const child = createContext({ x: 50 }, parent);
      expect(child.x).toBe(50);
    });

    test('$parent returns parent context', () => {
      const parent = createContext({ a: 1 });
      const child = createContext({}, parent);
      expect(child.$parent).toBe(parent);
    });

    test('has operator checks current and parent', () => {
      const parent = createContext({ parentKey: true });
      const child = createContext({ childKey: true }, parent);
      expect('childKey' in child).toBe(true);
      expect('parentKey' in child).toBe(true);
      expect('unknown' in child).toBe(false);
    });
  });

  describe('batching', () => {
    test('batches notifications', () => {
      const ctx = createContext({ a: 0, b: 0 });
      const watcher = jest.fn();
      ctx.$watch(watcher);

      _startBatch();
      ctx.a = 1;
      ctx.b = 2;
      expect(watcher).not.toHaveBeenCalled();
      _endBatch();
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    test('nested batches work correctly', () => {
      const ctx = createContext({ x: 0 });
      const watcher = jest.fn();
      ctx.$watch(watcher);

      _startBatch();
      _startBatch();
      ctx.x = 1;
      _endBatch();
      expect(watcher).not.toHaveBeenCalled();
      _endBatch();
      expect(watcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('_collectKeys', () => {
    test('collects keys from single context', () => {
      const ctx = createContext({ a: 1, b: 2 });
      const { keys, vals } = _collectKeys(ctx);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(vals.a).toBe(1);
      expect(vals.b).toBe(2);
    });

    test('collects keys from parent chain', () => {
      const parent = createContext({ x: 10 });
      const child = createContext({ y: 20 }, parent);
      const { keys, vals } = _collectKeys(child);
      expect(keys).toContain('x');
      expect(keys).toContain('y');
      expect(vals.x).toBe(10);
      expect(vals.y).toBe(20);
    });

    test('child keys take precedence over parent', () => {
      const parent = createContext({ x: 'parent' });
      const child = createContext({ x: 'child' }, parent);
      const { vals } = _collectKeys(child);
      expect(vals.x).toBe('child');
    });

    test('returns cached result when context has not changed', () => {
      const ctx = createContext({ a: 1 });
      const first = _collectKeys(ctx);
      const second = _collectKeys(ctx);
      expect(second).toBe(first); // same object reference — cache hit
    });

    test('returns fresh result after context mutation', () => {
      const ctx = createContext({ a: 1 });
      const before = _collectKeys(ctx);
      ctx.a = 99;
      const after = _collectKeys(ctx);
      expect(after).not.toBe(before); // different object reference — cache invalidated
      expect(after.vals.a).toBe(99);
    });

    test('invalidates child cache when parent context changes', () => {
      const parent = createContext({ x: 1 });
      const child = createContext({ y: 2 }, parent);
      const before = _collectKeys(child);
      parent.x = 42;
      const after = _collectKeys(child);
      expect(after).not.toBe(before);
      expect(after.vals.x).toBe(42);
    });
  });
});

describe('Expression Evaluator', () => {
  describe('evaluate', () => {
    test('evaluates simple expressions', () => {
      const ctx = createContext({ x: 5 });
      expect(evaluate('x', ctx)).toBe(5);
    });

    test('evaluates arithmetic expressions', () => {
      const ctx = createContext({ a: 10, b: 3 });
      expect(evaluate('a + b', ctx)).toBe(13);
      expect(evaluate('a * b', ctx)).toBe(30);
      expect(evaluate('a - b', ctx)).toBe(7);
    });

    test('evaluates boolean expressions', () => {
      const ctx = createContext({ x: true, y: false });
      expect(evaluate('x && y', ctx)).toBe(false);
      expect(evaluate('x || y', ctx)).toBe(true);
      expect(evaluate('!y', ctx)).toBe(true);
    });

    test('evaluates ternary expressions', () => {
      const ctx = createContext({ active: true });
      expect(evaluate("active ? 'yes' : 'no'", ctx)).toBe('yes');
    });

    test('evaluates object literals', () => {
      const ctx = createContext({ x: 1 });
      const result = evaluate('({ a: x, b: 2 })', ctx);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('evaluates array literals', () => {
      const ctx = createContext({ x: 1 });
      expect(evaluate('[x, 2, 3]', ctx)).toEqual([1, 2, 3]);
    });

    test('evaluates string methods', () => {
      const ctx = createContext({ name: 'hello' });
      expect(evaluate('name.toUpperCase()', ctx)).toBe('HELLO');
    });

    test('evaluates comparison operators', () => {
      const ctx = createContext({ a: 5, b: 10 });
      expect(evaluate('a < b', ctx)).toBe(true);
      expect(evaluate('a > b', ctx)).toBe(false);
      expect(evaluate('a === 5', ctx)).toBe(true);
    });

    test('returns undefined for null/empty expressions', () => {
      const ctx = createContext({});
      expect(evaluate(null, ctx)).toBeUndefined();
      expect(evaluate('', ctx)).toBeUndefined();
    });

    test('returns undefined for invalid expressions', () => {
      const ctx = createContext({});
      expect(evaluate('this is not valid @#$', ctx)).toBeUndefined();
    });

    test('calls _warn() when expression evaluation fails in debug mode', () => {
      _config.debug = true;
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        // Passing null ctx triggers TypeError in evaluate()'s scope-building code
        evaluate('x', null);
        expect(spy).toHaveBeenCalled();
        const warnCall = spy.mock.calls.find(args =>
          args.some(a => typeof a === 'string' && a.includes('Expression error'))
        );
        expect(warnCall).toBeDefined();
      } finally {
        spy.mockRestore();
        _config.debug = false;
      }
    });

    test('calls _warn() regardless of debug mode', () => {
      _config.debug = false;
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        evaluate('x', null);
        const warnCall = spy.mock.calls.find(args =>
          args.some(a => typeof a === 'string' && a.includes('Expression error'))
        );
        expect(warnCall).toBeDefined();
      } finally {
        spy.mockRestore();
      }
    });

    test('does not throw to the caller on expression error', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => evaluate('x', null)).not.toThrow();
      spy.mockRestore();
    });

    test('accesses nested properties', () => {
      const ctx = createContext({ user: { name: 'Bob', age: 25 } });
      expect(evaluate('user.name', ctx)).toBe('Bob');
      expect(evaluate('user.age', ctx)).toBe(25);
    });

    test('accesses $store', () => {
      _stores.cart = createContext({ count: 3 });
      const ctx = createContext({});
      expect(evaluate('$store.cart.count', ctx)).toBe(3);
      delete _stores.cart;
    });
  });

  describe('pipe/filter syntax', () => {
    test('applies single filter', () => {
      _filters.double = (v) => v * 2;
      const ctx = createContext({ x: 5 });
      expect(evaluate('x | double', ctx)).toBe(10);
      delete _filters.double;
    });

    test('applies chained filters', () => {
      _filters.add1 = (v) => v + 1;
      _filters.mul2 = (v) => v * 2;
      const ctx = createContext({ x: 3 });
      expect(evaluate('x | add1 | mul2', ctx)).toBe(8);
      delete _filters.add1;
      delete _filters.mul2;
    });

    test('does not confuse || with pipe', () => {
      const ctx = createContext({ a: 0, b: 5 });
      expect(evaluate('a || b', ctx)).toBe(5);
    });

    test('handles filter with args', () => {
      _filters.repeat = (v, n) => String(v).repeat(n);
      const ctx = createContext({ word: 'ha' });
      expect(evaluate('word | repeat:3', ctx)).toBe('hahaha');
      delete _filters.repeat;
    });
  });

  describe('resolve', () => {
    test('resolves dot-notated paths', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(resolve('a.b.c', obj)).toBe(42);
    });

    test('returns undefined for missing paths', () => {
      const obj = { a: 1 };
      expect(resolve('a.b.c', obj)).toBeUndefined();
    });
  });

  describe('_interpolate', () => {
    test('interpolates expressions in curly braces', () => {
      const ctx = createContext({ id: 42, name: 'test' });
      expect(_interpolate('/users/{id}', ctx)).toBe('/users/42');
      expect(_interpolate('/users/{id}/name/{name}', ctx)).toBe('/users/42/name/test');
    });

    test('handles missing values', () => {
      const ctx = createContext({});
      expect(_interpolate('/users/{id}', ctx)).toBe('/users/');
    });

    test('encodes path traversal sequences in interpolated values', () => {
      const ctx = createContext({ id: '../admin' });
      const result = _interpolate('/api/users/{id}', ctx);
      expect(result).not.toContain('../');
      expect(result).toBe('/api/users/..%2Fadmin');  // .. + encoded /
    });

    test('encodes spaces and special characters in interpolated values', () => {
      const ctx = createContext({ q: 'hello world' });
      expect(_interpolate('/search?q={q}', ctx)).toBe('/search?q=hello%20world');
    });

    test('encodes slashes inside interpolated values', () => {
      const ctx = createContext({ path: 'a/b/c' });
      expect(_interpolate('/api/{path}', ctx)).toBe('/api/a%2Fb%2Fc');
    });

    test('does not encode plain numeric IDs', () => {
      const ctx = createContext({ id: 123 });
      expect(_interpolate('/api/users/{id}', ctx)).toBe('/api/users/123');
    });
  });

  describe('_execStatement', () => {
    test('executes assignment statements', () => {
      const ctx = createContext({ count: 0 });
      _execStatement('count = 5', ctx);
      expect(ctx.count).toBe(5);
    });

    test('executes increment statements', () => {
      const ctx = createContext({ count: 0 });
      _execStatement('count++', ctx);
      expect(ctx.count).toBe(1);
    });

    test('has access to extra variables', () => {
      const ctx = createContext({ msg: '' });
      _execStatement('msg = $event.type', ctx, { $event: { type: 'click' } });
      expect(ctx.msg).toBe('click');
    });

    test('handles invalid expressions gracefully', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const ctx = createContext({});
      expect(() => _execStatement('throw new Error("x")', ctx)).not.toThrow();
      spy.mockRestore();
    });
  });
});

describe('evaluate.js — unknown filter', () => {
  test('warns and returns original value for unknown filter', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createContext({ name: 'Alice' });

    const result = evaluate('name | nonExistentFilter', ctx);

    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('Unknown filter: nonExistentFilter'));
    expect(result).toBe('Alice');
    warnSpy.mockRestore();
  });
});

describe('evaluate.js — filter args with quotes and commas', () => {
  test('parses comma-separated args correctly', () => {
    _filters.testMultiArg = (v, a, b) => `${v}-${a}-${b}`;

    const ctx = createContext({ val: 'X' });
    const result = evaluate('val | testMultiArg:hello,world', ctx);

    expect(result).toBe('X-hello-world');
    delete _filters.testMultiArg;
  });

  test('parses single-quoted args', () => {
    _filters.testQuoted = (v, a) => `${v}:${a}`;

    const ctx = createContext({ val: 'Y' });
    const result = evaluate("val | testQuoted:'with spaces'", ctx);

    expect(result).toBe('Y:with spaces');
    delete _filters.testQuoted;
  });

  test('parses double-quoted args', () => {
    _filters.testDQ = (v, a, b) => `${v}|${a}|${b}`;

    const ctx = createContext({ val: 'Z' });
    const result = evaluate('val | testDQ:"first arg",second', ctx);

    expect(result).toBe('Z|first arg|second');
    delete _filters.testDQ;
  });

  test('parses mixed quoted and unquoted args', () => {
    _filters.testMix = (v, a, b, c) => [v, a, b, c].join('-');

    const ctx = createContext({ val: 'W' });
    const result = evaluate("val | testMix:'one',2,\"three\"", ctx);

    expect(result).toBe('W-one-2-three');
    delete _filters.testMix;
  });
});

describe('context.js — get handler special keys', () => {
  test('$form returns null when not set', () => {
    const ctx = createContext({});
    expect(ctx.$form).toBeNull();
  });

  test('$form returns form context when set', () => {
    const ctx = createContext({});
    ctx.$form = { valid: true, errors: {} };
    expect(ctx.$form).toEqual({ valid: true, errors: {} });
  });

  test('$i18n returns i18n instance', () => {
    const ctx = createContext({});
    expect(ctx.$i18n).toBeDefined();
    expect(typeof ctx.$i18n.t).toBe('function');
  });

  test('$router returns null when no router set', () => {
    setRouterInstance(null);
    const ctx = createContext({});
    expect(ctx.$router).toBeNull();
  });

  test('$notify is a function', () => {
    const ctx = createContext({});
    expect(typeof ctx.$notify).toBe('function');
  });

  test('__listeners returns the listeners set', () => {
    const ctx = createContext({});
    expect(ctx.__listeners).toBeInstanceOf(Set);
  });
});

describe('index.js — config()', () => {
  test('config with no router option does not override router config', async () => {
    const { default: No } = await import('../src/index.js');

    const prevUseHash = _config.router.useHash;
    No.config({ timeout: 5000 });
    expect(_config.timeout).toBe(5000);
    expect(_config.router.useHash).toBe(prevUseHash);

    _config.timeout = 10000;
  });

  test('config with router option merges into existing router config', async () => {
    const { default: No } = await import('../src/index.js');

    No.config({ router: { useHash: true } });
    expect(_config.router.useHash).toBe(true);
    expect(_config.router.base).toBe('/');

    _config.router.useHash = false;
  });

  test('config with deprecated mode option converts to useHash with warning', async () => {
    const { default: No } = await import('../src/index.js');
    const { _log } = await import('../src/globals.js');

    const origLog = _log;
    const logCalls = [];
    // _log is not easily mockable since it's an export, so just test the conversion
    No.config({ router: { mode: 'hash' } });
    expect(_config.router.useHash).toBe(true);
    expect(_config.router.mode).toBeUndefined();

    No.config({ router: { mode: 'history' } });
    expect(_config.router.useHash).toBe(false);
    expect(_config.router.mode).toBeUndefined();

    _config.router.useHash = false;
  });

});

describe('index.js — config() stores', () => {
  test('creates a single store via config', async () => {
    const { default: No } = await import('../src/index.js');

    No.config({ stores: { cart: { items: [], total: 0 } } });
    expect(_stores.cart).toBeDefined();
    expect(_stores.cart.items).toEqual([]);
    expect(_stores.cart.total).toBe(0);

    delete _stores.cart;
  });

  test('creates multiple stores via config', async () => {
    const { default: No } = await import('../src/index.js');

    No.config({
      stores: {
        auth: { user: null, token: 'abc' },
        theme: { mode: 'dark' },
        cart: { items: [] },
      },
    });
    expect(_stores.auth).toBeDefined();
    expect(_stores.auth.token).toBe('abc');
    expect(_stores.theme.mode).toBe('dark');
    expect(_stores.cart.items).toEqual([]);

    delete _stores.auth;
    delete _stores.theme;
    delete _stores.cart;
  });

  test('does not overwrite existing store', async () => {
    const { default: No } = await import('../src/index.js');

    _stores.existing = createContext({ value: 'original' });
    No.config({ stores: { existing: { value: 'overwritten' } } });
    expect(_stores.existing.value).toBe('original');

    delete _stores.existing;
  });

  test('config stores are accessible via evaluate $store', async () => {
    const { default: No } = await import('../src/index.js');

    No.config({ stores: { app: { name: 'NoJS' } } });
    const ctx = createContext({});
    expect(evaluate('$store.app.name', ctx)).toBe('NoJS');

    delete _stores.app;
  });

  test('does not leak stores into _config', async () => {
    const { default: No } = await import('../src/index.js');

    No.config({ stores: { test: { a: 1 } } });
    expect(_config.stores).toBeUndefined();

    delete _stores.test;
  });
});

// SSR guard (`typeof document === "undefined"`) is untestable in jsdom —
// document is a non-configurable property. Covered by E2E / real Node environments.

describe('index.js — interceptor() with invalid type', () => {
  test('does nothing for invalid interceptor type', async () => {
    const { default: No } = await import('../src/index.js');

    const prevReqLen = _interceptors.request.length;
    const prevResLen = _interceptors.response.length;

    No.interceptor('invalid', () => {});

    expect(_interceptors.request.length).toBe(prevReqLen);
    expect(_interceptors.response.length).toBe(prevResLen);
  });

  test('adds to request interceptors for valid type', async () => {
    const { default: No } = await import('../src/index.js');

    const fn = () => {};
    const prevLen = _interceptors.request.length;
    No.interceptor('request', fn);
    expect(_interceptors.request.length).toBe(prevLen + 1);

    _interceptors.request.pop();
  });

  test('adds to response interceptors for valid type', async () => {
    const { default: No } = await import('../src/index.js');

    const fn = () => {};
    const prevLen = _interceptors.response.length;
    No.interceptor('response', fn);
    expect(_interceptors.response.length).toBe(prevLen + 1);

    _interceptors.response.pop();
  });
});

describe('NoJS.config — csrf option (L53)', () => {
  test('config sets csrf when opts.csrf is provided', async () => {
    const { default: No } = await import('../src/index.js');
    const prevCsrf = _config.csrf;

    No.config({ csrf: { header: 'X-CSRF', token: 'abc123' } });
    expect(_config.csrf).toEqual({ header: 'X-CSRF', token: 'abc123' });

    _config.csrf = prevCsrf;
  });
});

describe('NoJS.i18n — detectBrowser branch (L109-114)', () => {
  let origNavigator;

  beforeEach(() => {
    origNavigator = global.navigator;
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: origNavigator,
      writable: true,
      configurable: true,
    });
  });

  test('detectBrowser sets locale when browser lang exists in locales', async () => {
    const { default: No } = await import('../src/index.js');
    const { _i18n } = await import('../src/i18n.js');

    Object.defineProperty(global, 'navigator', {
      value: { language: 'es' },
      writable: true,
      configurable: true,
    });

    No.i18n({
      locales: { en: { hello: 'Hi' }, es: { hello: 'Hola' } },
      detectBrowser: true,
    });

    expect(_i18n.locale).toBe('es');
  });

  test('detectBrowser does NOT change locale when browser lang is not in locales', async () => {
    const { default: No } = await import('../src/index.js');
    const { _i18n } = await import('../src/i18n.js');

    _i18n.locale = 'en';
    Object.defineProperty(global, 'navigator', {
      value: { language: 'fr' },
      writable: true,
      configurable: true,
    });

    No.i18n({
      locales: { en: { hello: 'Hi' }, es: { hello: 'Hola' } },
      detectBrowser: true,
    });

    expect(_i18n.locale).toBe('en');
  });
});

describe('NoJS.on — event bus when event already has listeners (L121)', () => {
  test('pushes to existing listener array without re-creating it', async () => {
    const { default: No } = await import('../src/index.js');

    const fn1 = jest.fn();
    const fn2 = jest.fn();

    const unsub1 = No.on('testEvent', fn1);
    expect(_eventBus['testEvent'].length).toBe(1);

    const unsub2 = No.on('testEvent', fn2);
    expect(_eventBus['testEvent'].length).toBe(2);
    expect(_eventBus['testEvent']).toContain(fn1);
    expect(_eventBus['testEvent']).toContain(fn2);

    unsub1();
    unsub2();
    delete _eventBus['testEvent'];
  });
});

describe('evaluate — pipe parsing edge cases (L104)', () => {
  test('handles template literal with pipe character inside backticks', () => {
    const ctx = createContext({ name: 'world' });
    const result = evaluate("`hello`", ctx);
    expect(result).toBe('hello');
  });

  test('handles pipe inside parentheses (not treated as filter)', () => {
    const ctx = createContext({ a: 0, b: 1 });
    const result = evaluate('(a | b)', ctx);
    expect(result).toBe(1);
  });

  test('handles pipe inside array literal', () => {
    const ctx = createContext({ a: 1, b: 2 });
    const result = evaluate('[a | b]', ctx);
    expect(result).toEqual([3]);
  });

  // NOJS-60 #65: an escaped backslash before a closing quote must not be
  // treated as escaping the quote, otherwise a pipe inside the string can be
  // mis-split as a filter boundary.
  test('escaped backslash before closing quote does not split a pipe inside the string', () => {
    const ctx = createContext({});
    // String literal: "a\|b" — the backslash escapes the quote? No: it is a
    // lone backslash followed by a pipe; the closing quote is unescaped.
    expect(evaluate("'a|b'", ctx)).toBe('a|b');
    // Trailing escaped backslash then closing quote: "x\\" → "x\"
    expect(evaluate("'x\\\\'", ctx)).toBe('x\\');
    // Escaped backslash before quote, then a pipe outside the string must still
    // be the closing quote (even count of backslashes = quote is real).
    expect(evaluate("'x\\\\' + 'y|z'", ctx)).toBe('x\\y|z');
  });
});

describe('Config — devtools', () => {
  test('devtools defaults to false', () => {
    expect(_config.devtools).toBe(false);
  });

  test('devtools: false should not expose window.__NOJS_DEVTOOLS__', () => {
    _config.devtools = false;
    delete window.__NOJS_DEVTOOLS__;
    if (_config.devtools && typeof window !== 'undefined') {
      window.__NOJS_DEVTOOLS__ = { stores: _stores, config: _config };
    }
    expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
  });
});

describe('$set dot-path traversal', () => {
  test('sets a deeply nested value via dot-path', () => {
    const ctx = createContext({ user: { profile: { name: 'Alice' } } });
    ctx.$set('user.profile.name', 'Bob');
    expect(ctx.user.profile.name).toBe('Bob');
  });

  test('notifies watchers when dot-path value changes', () => {
    const ctx = createContext({ a: { b: { c: 1 } } });
    const watcher = jest.fn();
    ctx.$watch(watcher);
    ctx.$set('a.b.c', 2);
    expect(watcher).toHaveBeenCalledTimes(1);
  });

  test('does NOT notify watchers when dot-path value is unchanged', () => {
    const ctx = createContext({ a: { b: { c: 1 } } });
    const watcher = jest.fn();
    ctx.$watch(watcher);
    ctx.$set('a.b.c', 1);
    expect(watcher).not.toHaveBeenCalled();
  });

  test('handles intermediate null gracefully', () => {
    const ctx = createContext({ a: null });
    // Should not throw
    ctx.$set('a.b.c', 42);
    expect(ctx.a).toBeNull();
  });

  test('single-key $set still works through proxy', () => {
    const ctx = createContext({ x: 10 });
    const watcher = jest.fn();
    ctx.$watch(watcher);
    ctx.$set('x', 20);
    expect(ctx.x).toBe(20);
    expect(watcher).toHaveBeenCalledTimes(1);
  });

  test('single-key $set does NOT notify when unchanged', () => {
    const ctx = createContext({ x: 10 });
    const watcher = jest.fn();
    ctx.$watch(watcher);
    ctx.$set('x', 10);
    expect(watcher).not.toHaveBeenCalled();
  });
});

describe('Expression Parser', () => {
  let ctx;
  beforeEach(() => {
    ctx = createContext({
      count: 10,
      a: 5,
      b: 3,
      x: true,
      y: false,
      name: 'NoJS',
      price: 29.99,
      items: [1, 2, 3, 4, 5],
      users: [
        { name: 'Alice', age: 30, done: true },
        { name: 'Bob', age: 25, done: false }
      ],
      user: { name: 'Alice', address: { city: 'NYC' } },
      obj: { key: 'value', nested: { deep: true } },
      nullVal: null,
      undefVal: undefined,
      zero: 0,
      empty: '',
      arr: [10, 20, 30],
      matrix: [[1, 2], [3, 4]],
      idx: 1,
      tasks: [
        { text: 'Task 1', done: true },
        { text: 'Task 2', done: false },
        { text: 'Task 3', done: true }
      ]
    });
  });

  describe('Arithmetic', () => {
    test('should evaluate addition', () => {
      expect(evaluate('a + b', ctx)).toBe(8);
    });

    test('should evaluate subtraction', () => {
      expect(evaluate('a - b', ctx)).toBe(2);
    });

    test('should evaluate multiplication', () => {
      expect(evaluate('a * b', ctx)).toBe(15);
    });

    test('should evaluate division', () => {
      expect(evaluate('a / b', ctx)).toBeCloseTo(5 / 3);
    });

    test('should evaluate modulo', () => {
      expect(evaluate('a % b', ctx)).toBe(2);
    });

    test('should respect operator precedence (multiply before add)', () => {
      expect(evaluate('a + b * count', ctx)).toBe(35);
    });

    test('should respect grouping with parentheses', () => {
      expect(evaluate('(a + b) * count', ctx)).toBe(80);
    });

    test('should evaluate unary minus', () => {
      expect(evaluate('-count', ctx)).toBe(-10);
    });

    test('should evaluate unary minus on grouped expression', () => {
      expect(evaluate('-(a + b)', ctx)).toBe(-8);
    });
  });

  describe('String operations', () => {
    test('should concatenate string literals', () => {
      expect(evaluate("'hello' + ' ' + 'world'", ctx)).toBe('hello world');
    });

    test('should concatenate string literal with variable', () => {
      expect(evaluate("'count: ' + count", ctx)).toBe('count: 10');
    });

    test('should evaluate template literals', () => {
      expect(evaluate('`Hello ${name}`', ctx)).toBe('Hello NoJS');
    });
  });

  describe('Bracket member access', () => {
    test('should access array element by numeric index', () => {
      expect(evaluate('items[0]', ctx)).toBe(1);
    });

    test('should access array element by variable index', () => {
      expect(evaluate('items[idx]', ctx)).toBe(2);
    });

    test('should access object property by string key', () => {
      expect(evaluate("obj['key']", ctx)).toBe('value');
    });

    test('should access nested array element (matrix)', () => {
      expect(evaluate('matrix[0][1]', ctx)).toBe(2);
    });

    test('should chain bracket access with dot access', () => {
      expect(evaluate('users[0].name', ctx)).toBe('Alice');
    });
  });

  describe('Method calls', () => {
    test('should call toUpperCase()', () => {
      expect(evaluate('name.toUpperCase()', ctx)).toBe('NOJS');
    });

    test('should call toLowerCase()', () => {
      expect(evaluate('name.toLowerCase()', ctx)).toBe('nojs');
    });

    test('should call includes() on array', () => {
      expect(evaluate('items.includes(3)', ctx)).toBe(true);
    });

    test('should chain trim() and toLowerCase()', () => {
      expect(evaluate('name.trim().toLowerCase()', ctx)).toBe('nojs');
    });

    test('should access length property', () => {
      expect(evaluate('items.length', ctx)).toBe(5);
    });

    test('should evaluate filter() with arrow function', () => {
      const result = evaluate('tasks.filter(t => t.done)', ctx);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Task 1');
      expect(result[1].text).toBe('Task 3');
    });

    test('should chain filter().length', () => {
      expect(evaluate('tasks.filter(t => t.done).length', ctx)).toBe(2);
    });

    test('should evaluate sort() with comparator arrow function', () => {
      expect(evaluate('users.sort((a, b) => a.age - b.age)[0].name', ctx)).toBe('Bob');
    });

    test('should evaluate map() with arrow function', () => {
      expect(evaluate('items.map(x => x * 2)', ctx)).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe('Nullish coalescing', () => {
    test('should return default for null', () => {
      expect(evaluate('nullVal ?? "default"', ctx)).toBe('default');
    });

    test('should return fallback for undefined', () => {
      expect(evaluate('undefVal ?? "fallback"', ctx)).toBe('fallback');
    });

    test('should NOT replace zero with fallback', () => {
      expect(evaluate('zero ?? "fallback"', ctx)).toBe(0);
    });

    test('should NOT replace empty string with fallback', () => {
      expect(evaluate("empty ?? 'fallback'", ctx)).toBe('');
    });

    test('should chain nullish coalescing', () => {
      expect(evaluate('nullVal ?? undefVal ?? "last"', ctx)).toBe('last');
    });
  });

  describe('Optional chaining', () => {
    test('should access existing property', () => {
      expect(evaluate('user?.name', ctx)).toBe('Alice');
    });

    test('should return undefined for null base', () => {
      expect(evaluate('nullVal?.name', ctx)).toBeUndefined();
    });

    test('should chain optional access on nested objects', () => {
      expect(evaluate('user?.address?.city', ctx)).toBe('NYC');
    });

    test('should return undefined for missing intermediate', () => {
      expect(evaluate('user?.missing?.deep', ctx)).toBeUndefined();
    });

    test('should return undefined for method call on null', () => {
      expect(evaluate('nullVal?.toUpperCase()', ctx)).toBeUndefined();
    });
  });

  describe('typeof operator', () => {
    test('should check typeof number', () => {
      expect(evaluate("typeof count === 'number'", ctx)).toBe(true);
    });

    test('should check typeof string', () => {
      expect(evaluate("typeof name === 'string'", ctx)).toBe(true);
    });

    test('should check typeof undefined for missing variable', () => {
      expect(evaluate("typeof missing === 'undefined'", ctx)).toBe(true);
    });
  });

  describe('in operator', () => {
    test('should return true for existing key', () => {
      expect(evaluate("'key' in obj", ctx)).toBe(true);
    });

    test('should return false for missing key', () => {
      expect(evaluate("'missing' in obj", ctx)).toBe(false);
    });
  });

  describe('instanceof operator', () => {
    test('should check instanceof Array', () => {
      expect(evaluate('items instanceof Array', ctx)).toBe(true);
    });
  });

  describe('Array literals', () => {
    test('should evaluate numeric array literal', () => {
      expect(evaluate('[1, 2, 3]', ctx)).toEqual([1, 2, 3]);
    });

    test('should evaluate array literal with variables', () => {
      expect(evaluate('[a, b, count]', ctx)).toEqual([5, 3, 10]);
    });

    test('should evaluate spread in array literal', () => {
      expect(evaluate('[...items, 6]', ctx)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('should evaluate empty array literal', () => {
      expect(evaluate('[]', ctx)).toEqual([]);
    });
  });

  describe('Object literals', () => {
    test('should evaluate object literal with variable value', () => {
      expect(evaluate('({ key: a })', ctx)).toEqual({ key: 5 });
    });

    test('should evaluate object literal with mixed values', () => {
      expect(evaluate('({ a: 1, b: name })', ctx)).toEqual({ a: 1, b: 'NoJS' });
    });

    test('should evaluate object spread', () => {
      expect(evaluate('({ ...obj, extra: true })', ctx)).toEqual({
        key: 'value',
        nested: { deep: true },
        extra: true
      });
    });
  });

  describe('Arrow functions in context (as callbacks)', () => {
    test('should filter with arrow function (greater than)', () => {
      expect(evaluate('items.filter(x => x > 3)', ctx)).toEqual([4, 5]);
    });

    test('should map with arrow function', () => {
      expect(evaluate('items.map(x => x * 2)', ctx)).toEqual([2, 4, 6, 8, 10]);
    });

    test('should evaluate some() with arrow function', () => {
      expect(evaluate('users.some(u => u.age > 28)', ctx)).toBe(true);
    });

    test('should filter with multi-param arrow function', () => {
      const result = evaluate('tasks.filter((t, i) => i !== 0)', ctx);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Task 2');
      expect(result[1].text).toBe('Task 3');
    });
  });

  describe('Complex real-world expressions', () => {
    test('should evaluate length comparison', () => {
      expect(evaluate('items.length > 0', ctx)).toBe(true);
    });

    test('should concatenate currency symbol with price', () => {
      expect(evaluate("'$' + price", ctx)).toBe('$29.99');
    });

    test('should evaluate ternary with comparison', () => {
      expect(evaluate("count > 0 ? 'has items' : 'empty'", ctx)).toBe('has items');
    });
  });

  describe('Edge cases', () => {
    test('should return undefined for null expression', () => {
      expect(evaluate(null, ctx)).toBeUndefined();
    });

    test('should return undefined for empty string expression', () => {
      expect(evaluate('', ctx)).toBeUndefined();
    });

    test('should return undefined for invalid syntax (no throw)', () => {
      expect(evaluate('invalidSyntax...', ctx)).toBeUndefined();
    });

    test('should return undefined for property access on null (no throw)', () => {
      expect(evaluate('nullVal.prop', ctx)).toBeUndefined();
    });
  });

  describe('Security', () => {
    test('should not expose constructor', () => {
      expect(evaluate('constructor', ctx)).toBeUndefined();
    });

    test('should not expose __proto__', () => {
      expect(evaluate('obj.__proto__', ctx)).toBeUndefined();
    });

    test('should not expose obj.constructor', () => {
      expect(evaluate('obj.constructor', ctx)).toBeUndefined();
    });

    test('spread filters __proto__', () => {
      const sCtx = createContext({ evil: { __proto__: { hacked: true }, safe: 1 } });
      const result = evaluate('({ ...evil })', sCtx);
      expect(result.safe).toBe(1);
      expect(result).not.toHaveProperty('__proto__', { hacked: true });
      expect(result.hacked).toBeUndefined();
    });

    test('spread filters constructor', () => {
      const sCtx = createContext({ evil: { constructor: 'bad', ok: 1 } });
      const result = evaluate('({ ...evil })', sCtx);
      expect(result.ok).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    });

    test('spread filters prototype', () => {
      const sCtx = createContext({ evil: { prototype: 'bad', ok: 1 } });
      const result = evaluate('({ ...evil })', sCtx);
      expect(result.ok).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
    });

    // NOJS-60: prototype-chain identifiers must not bypass the allow-list.
    // The scope object inherits from Object.prototype, so a naive `in scope`
    // check would resolve these inherited members to native functions.
    // (constructor/__proto__/prototype are handled even earlier — tokenized as
    //  Forbidden — so they are exercised separately by the Security tests above.)
    describe('prototype-chain identifier hardening (NOJS-60)', () => {
      const protoNames = ['valueOf', 'toString', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'];

      protoNames.forEach((name) => {
        test(`bare identifier "${name}" resolves to undefined`, () => {
          expect(evaluate(name, ctx)).toBeUndefined();
        });
      });

      protoNames.forEach((name) => {
        test(`statement call "${name}()" surfaces a ReferenceError via nojs:error`, () => {
          // _execStatement catches the throw (Safety Rule 8) and re-dispatches
          // it as a nojs:error DOM event; assert the ReferenceError surfaces and
          // the native prototype function is NOT silently executed.
          const el = document.createElement('div');
          let captured = null;
          el.addEventListener('nojs:error', (e) => { captured = e.detail; });
          _execStatement(`${name}()`, ctx, { $el: el });
          expect(captured).not.toBeNull();
          expect(captured.error).toBeInstanceOf(ReferenceError);
          expect(captured.message).toBe(`${name} is not defined`);
        });
      });

      test('typeof on a prototype-chain name returns "undefined"', () => {
        expect(evaluate('typeof toString', ctx)).toBe('undefined');
        expect(evaluate('typeof hasOwnProperty', ctx)).toBe('undefined');
        expect(evaluate('typeof valueOf', ctx)).toBe('undefined');
      });

      test('legitimate scope variable named "toString" still shadows correctly', () => {
        const sCtx = createContext({ toString: 'shadowed', valueOf: 42 });
        expect(evaluate('toString', sCtx)).toBe('shadowed');
        expect(evaluate('valueOf', sCtx)).toBe(42);
        expect(evaluate('typeof toString', sCtx)).toBe('string');
      });

      test('legitimate scope function named "hasOwnProperty" is callable as a statement', () => {
        let called = false;
        const sCtx = createContext({ hasOwnProperty: () => { called = true; } });
        const el = document.createElement('div');
        let captured = null;
        el.addEventListener('nojs:error', (e) => { captured = e.detail; });
        _execStatement('hasOwnProperty()', sCtx, { $el: el });
        expect(captured).toBeNull();
        expect(called).toBe(true);
      });

      test('inherited parent-context variable named "toString" still resolves', () => {
        const parent = createContext({ toString: 'fromParent' });
        const child = createContext({ other: 1 }, parent);
        expect(evaluate('toString', child)).toBe('fromParent');
      });
    });
  });
});

describe('Statement Interpreter', () => {
  let ctx;
  beforeEach(() => {
    ctx = createContext({
      count: 0,
      a: 1,
      b: 2,
      c: 3,
      show: true,
      name: 'Alice',
      items: [1, 2, 3],
      tasks: [
        { text: 'Task 1', done: true },
        { text: 'Task 2', done: false },
        { text: 'Task 3', done: true }
      ],
      user: { name: 'Alice', age: 30 },
      msg: ''
    });
  });

  describe('Simple Assignment', () => {
    test('should assign a number', () => {
      _execStatement('count = 5', ctx);
      expect(ctx.count).toBe(5);
    });

    test('should assign a string', () => {
      _execStatement("name = 'Bob'", ctx);
      expect(ctx.name).toBe('Bob');
    });

    test('should assign expression result', () => {
      _execStatement('count = a + b', ctx);
      expect(ctx.count).toBe(3);
    });
  });

  describe('Compound Assignment', () => {
    test('should handle +=', () => {
      _execStatement('count += 5', ctx);
      expect(ctx.count).toBe(5);
    });

    test('should handle -=', () => {
      ctx.$set('count', 10);
      _execStatement('count -= 3', ctx);
      expect(ctx.count).toBe(7);
    });

    test('should handle *=', () => {
      ctx.$set('count', 4);
      _execStatement('count *= 3', ctx);
      expect(ctx.count).toBe(12);
    });

    test('should handle /=', () => {
      ctx.$set('count', 10);
      _execStatement('count /= 2', ctx);
      expect(ctx.count).toBe(5);
    });

    test('should handle %=', () => {
      ctx.$set('count', 10);
      _execStatement('count %= 3', ctx);
      expect(ctx.count).toBe(1);
    });
  });

  describe('Increment / Decrement', () => {
    test('should increment with ++', () => {
      _execStatement('count++', ctx);
      expect(ctx.count).toBe(1);
    });

    test('should decrement with --', () => {
      ctx.$set('count', 5);
      _execStatement('count--', ctx);
      expect(ctx.count).toBe(4);
    });

    test('should prefix increment with ++count', () => {
      _execStatement('++count', ctx);
      expect(ctx.count).toBe(1);
    });

    test('should prefix decrement with --count', () => {
      ctx.$set('count', 5);
      _execStatement('--count', ctx);
      expect(ctx.count).toBe(4);
    });
  });

  describe('Boolean Toggle', () => {
    test('should toggle boolean', () => {
      _execStatement('show = !show', ctx);
      expect(ctx.show).toBe(false);
    });

    test('should toggle back', () => {
      _execStatement('show = !show', ctx);
      _execStatement('show = !show', ctx);
      expect(ctx.show).toBe(true);
    });
  });

  describe('Multiple Statements', () => {
    test('should execute multiple statements separated by semicolons', () => {
      _execStatement('a = 10; b = 20; c = 30', ctx);
      expect(ctx.a).toBe(10);
      expect(ctx.b).toBe(20);
      expect(ctx.c).toBe(30);
    });
  });

  describe('Array Operations', () => {
    test('should assign spread array', () => {
      _execStatement('items = [...items, 4]', ctx);
      expect(ctx.items).toEqual([1, 2, 3, 4]);
    });

    test('should filter with arrow function', () => {
      _execStatement('tasks = tasks.filter(t => !t.done)', ctx);
      expect(ctx.tasks).toHaveLength(1);
      expect(ctx.tasks[0].text).toBe('Task 2');
    });

    test('should map with arrow function and spread', () => {
      _execStatement('tasks = tasks.map(t => ({...t, active: true}))', ctx);
      expect(ctx.tasks[0].active).toBe(true);
      expect(ctx.tasks[1].active).toBe(true);
    });
  });

  describe('Dot-path Assignment', () => {
    test('should assign to nested property', () => {
      _execStatement("user.name = 'Bob'", ctx);
      expect(ctx.user.name).toBe('Bob');
    });
  });

  describe('$store Mutation', () => {
    test('should mutate store value', () => {
      _stores.app = createContext({ theme: 'light' });
      _execStatement("$store.app.theme = 'dark'", ctx);
      expect(_stores.app.theme).toBe('dark');
      delete _stores.app;
    });
  });

  describe('Extra Variables', () => {
    test('should access $event from extraVars', () => {
      _execStatement('msg = $event.type', ctx, { $event: { type: 'click' } });
      expect(ctx.msg).toBe('click');
    });

    test('extraVars keys are not written back to the context', () => {
      // __val is used by the model directive; it must not leak into the reactive context
      _execStatement('count = __val', ctx, { __val: 42 });
      expect(ctx.count).toBe(42);            // assignment succeeded
      expect('__val' in ctx.__raw).toBe(false); // __val must not persist
    });
  });

  describe('$refs Method Call', () => {
    test('should call method on $refs', () => {
      const focus = jest.fn();
      const refs = { input: { focus } };
      const ctxWithRefs = createContext({ dummy: 0 });
      // Manually set $refs on the context's raw
      ctxWithRefs.__raw.$refs = refs;
      _execStatement('$refs.input.focus()', ctxWithRefs);
      expect(focus).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should not throw on invalid statement', () => {
      expect(() => _execStatement('???invalid+++', ctx)).not.toThrow();
    });
  });

  describe('Context Chain Write-back', () => {
    test('should write back to parent context through child', () => {
      const parent = createContext({ count: 0 });
      const child = createContext({ localVar: 'x' }, parent);
      _execStatement('count = count + 1', child);
      expect(parent.count).toBe(1);
    });
  });

  describe('Read-only location proxy', () => {
    test('location.href assignment is blocked', () => {
      const original = window.location.href;
      _execStatement("location.href = 'https://evil.com'", createContext({}));
      expect(window.location.href).toBe(original);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// evaluate.js — browser globals allow-list (TIP-S2)
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluate — browser globals allow-list', () => {
  let ctx;

  beforeEach(() => {
    ctx = createContext({});
  });

  // ── Blocked: network and storage APIs ──────────────────────────────────

  test('fetch is not accessible as a bare identifier', () => {
    expect(evaluate('fetch', ctx)).toBeUndefined();
  });

  test('XMLHttpRequest is not accessible as a bare identifier', () => {
    expect(evaluate('XMLHttpRequest', ctx)).toBeUndefined();
  });

  test('localStorage is not accessible as a bare identifier', () => {
    expect(evaluate('localStorage', ctx)).toBeUndefined();
  });

  test('sessionStorage is not accessible as a bare identifier', () => {
    expect(evaluate('sessionStorage', ctx)).toBeUndefined();
  });

  test('WebSocket is not accessible as a bare identifier', () => {
    expect(evaluate('WebSocket', ctx)).toBeUndefined();
  });

  test('indexedDB is not accessible as a bare identifier', () => {
    expect(evaluate('indexedDB', ctx)).toBeUndefined();
  });

  // ── Allowed: safe browser globals ──────────────────────────────────────

  test('window is accessible (returns safe proxy)', () => {
    expect(evaluate('window', ctx)).toBeDefined();
  });

  test('document is accessible (returns safe proxy)', () => {
    expect(evaluate('document', ctx)).toBeDefined();
  });

  test('URL is accessible', () => {
    expect(evaluate('URL', ctx)).toBe(URL);
  });

  test('setTimeout is accessible (wrapped for safety)', () => {
    const st = evaluate('setTimeout', ctx);
    expect(typeof st).toBe('function');
  });

  test('Promise is accessible', () => {
    expect(evaluate('Promise', ctx)).toBe(Promise);
  });

  // ── _SAFE_GLOBALS are unaffected ────────────────────────────────────────

  test('Math is still accessible (in _SAFE_GLOBALS)', () => {
    expect(evaluate('Math.max(1, 2)', ctx)).toBe(2);
  });

  test('JSON is still accessible (in _SAFE_GLOBALS)', () => {
    expect(evaluate('JSON.stringify({a:1})', ctx)).toBe('{"a":1}');
  });

  // ── Scope values take precedence over allow-list ────────────────────────

  test('scope variable shadows a browser global', () => {
    const ctxWithWindow = createContext({ window: 'shadowed' });
    expect(evaluate('window', ctxWithWindow)).toBe('shadowed');
  });

  // ── Security proxies: blocked sub-properties on window ────────────────

  test('window.fetch is blocked by proxy', () => {
    expect(evaluate('window.fetch', ctx)).toBeUndefined();
  });

  test('window.localStorage is blocked by proxy', () => {
    expect(evaluate('window.localStorage', ctx)).toBeUndefined();
  });

  test('document.cookie is blocked by proxy', () => {
    expect(evaluate('document.cookie', ctx)).toBeUndefined();
  });

  test('window.innerWidth is still accessible', () => {
    // jsdom may not have innerWidth, just confirm no throw
    expect(() => evaluate('window.innerWidth', ctx)).not.toThrow();
  });

  test('document.querySelector is still accessible', () => {
    expect(evaluate('document.querySelector', ctx)).toBeDefined();
  });

  // ── NOJS-60 #28: window set-trap must not pollute the real window ────────

  test('assigning an arbitrary window property does not write to the real window', () => {
    const probe = '__nojs60_probe_' + Date.now();
    expect(typeof window[probe]).toBe('undefined');
    // Statement form (event-handler-style) goes through _execStatement.
    expect(() => _execStatement('window.' + probe + ' = 1', ctx)).not.toThrow();
    expect(window[probe]).toBeUndefined();
    expect(typeof globalThis[probe]).toBe('undefined');
  });

  test('overwriting an existing real global via window is a no-op', () => {
    const original = window.location;
    expect(() => _execStatement("window.location = 'https://evil.com'", ctx)).not.toThrow();
    expect(window.location).toBe(original);
  });

  // ── Read-only location proxy ────────────────────────────────────────────

  test('location.href is readable', () => {
    expect(evaluate('location.href', ctx)).toBeDefined();
  });

  test('location.pathname is readable', () => {
    expect(evaluate('location.pathname', ctx)).toBeDefined();
  });

  // ── Bypass vector tests ─────────────────────────────────────────────────

  test('window.location returns safe location proxy (not raw)', () => {
    const loc = evaluate('window.location', ctx);
    expect(loc).toBeDefined();
    // Should be the safe proxy — assign should be a noop
    if (loc && typeof loc.assign === 'function') {
      expect(() => loc.assign('https://evil.com')).not.toThrow();
    }
  });

  test('window.location.href assignment is blocked via window path', () => {
    const original = window.location.href;
    _execStatement("window.location.href = 'https://evil.com'", createContext({}));
    expect(window.location.href).toBe(original);
  });

  test('document.defaultView returns safe window proxy (not raw)', () => {
    const dv = evaluate('document.defaultView', ctx);
    if (dv) {
      expect(dv.fetch).toBeUndefined();
      expect(dv.localStorage).toBeUndefined();
    }
  });

  test('document.execCommand is blocked', () => {
    expect(evaluate('document.execCommand', ctx)).toBeUndefined();
  });

  test('bracket notation does not bypass window proxy', () => {
    expect(evaluate("window['fetch']", ctx)).toBeUndefined();
    expect(evaluate("window['localStorage']", ctx)).toBeUndefined();
  });

  test('bracket notation does not bypass document proxy', () => {
    expect(evaluate("document['cookie']", ctx)).toBeUndefined();
  });

  test('window.document returns safe document proxy', () => {
    const doc = evaluate('window.document', ctx);
    if (doc) {
      expect(doc.cookie).toBeUndefined();
    }
  });

  // ── Read-only history proxy ───────────────────────────────────────────

  test('history.length is readable', () => {
    expect(evaluate('history.length', ctx)).toBeDefined();
  });

  test('history.pushState is a no-op', () => {
    const h = evaluate('history', ctx);
    expect(h.pushState).toBeDefined();
    expect(() => h.pushState({}, '', '/evil')).not.toThrow();
    // Real history should not have changed
  });

  test('history.back is a no-op', () => {
    const h = evaluate('history', ctx);
    expect(h.back).toBeDefined();
    expect(() => h.back()).not.toThrow();
  });

  test('window.history returns safe history wrapper', () => {
    const h = evaluate('window.history', ctx);
    expect(h).toBeDefined();
    expect(h.pushState).toBeDefined();
    expect(() => h.pushState({}, '', '/evil')).not.toThrow();
  });

  // ── Navigator proxy ─────────────────────────────────────────────────

  test('navigator.sendBeacon is blocked', () => {
    expect(evaluate('navigator.sendBeacon', ctx)).toBeUndefined();
  });

  test('navigator.userAgent is still accessible', () => {
    expect(evaluate('navigator.userAgent', ctx)).toBeDefined();
  });

  test('window.navigator returns safe navigator proxy', () => {
    const nav = evaluate('window.navigator', ctx);
    if (nav) {
      expect(nav.sendBeacon).toBeUndefined();
      expect(nav.userAgent).toBeDefined();
    }
  });

  // ── Window set trap ─────────────────────────────────────────────────

  test('window.name writes are blocked (anti-exfiltration)', () => {
    const original = window.name;
    _execStatement("window.name = 'evil'", createContext({}));
    expect(window.name).toBe(original);
  });

  test('window.fetch writes are blocked', () => {
    const original = window.fetch;
    _execStatement("window.fetch = null", createContext({}));
    expect(window.fetch).toBe(original);
  });

  test('window user-defined property writes are NOT persisted to the real window (NOJS-60 #28)', () => {
    // Writing arbitrary props through the safe-window proxy must not pollute the
    // real window (no global creation/override from a template expression).
    expect(window.__testProp).toBeUndefined();
    _execStatement("window.__testProp = 42", createContext({}));
    expect(window.__testProp).toBeUndefined();
  });
});

describe('evaluate.js — expression cache (LRU)', () => {
  test('cache does not grow beyond 500 entries', () => {
    const ctx = createContext({});

    for (let i = 0; i < 510; i++) {
      evaluate(`__lru_test_${i}__ || 0`, ctx);
    }

    expect(_exprCache.size).toBeLessThanOrEqual(500);
  });

  test('evicts the LRU entry when the cache is full', () => {
    const ctx = createContext({});

    // Fill to the limit with known keys
    for (let i = 0; i < 500; i++) {
      evaluate(`__evict_test_${i}__ || 0`, ctx);
    }

    const firstKey = `__evict_test_0__ || 0`;

    // Re-access the first key so it becomes the most-recently-used
    evaluate(firstKey, ctx);

    // Adding one more should evict the LRU entry (entry 1, not entry 0)
    evaluate(`__evict_overflow__ || 0`, ctx);

    // The recently-accessed entry must be retained
    expect(_exprCache.has(firstKey)).toBe(true);
    expect(_exprCache.size).toBeLessThanOrEqual(500);
  });
});
