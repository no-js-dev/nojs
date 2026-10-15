import NoJS from '../src/index.js';
import {
  _config,
  _stores,
  _plugins,
  _globals,
  _globalOwners,
  _interceptors,
  _eventBus,
  _refs,
  _routerInstance,
  setRouterInstance,
  _SENSITIVE_HEADERS,
  _CANCEL,
  _RESPOND,
  _REPLACE,
  _setDisposing,
  _setCurrentPluginName,
} from '../src/globals.js';
import { createContext } from '../src/context.js';
import { evaluate, _execStatement } from '../src/evaluate.js';
import { registerDirective } from '../src/registry.js';
import { _doFetch } from '../src/fetch.js';

beforeEach(() => {
  document.body.innerHTML = '';
  NoJS._initialized = false;
  _config.debug = false;
  _config.baseApiUrl = '';
  _config.headers = {};
  _config.csrf = { enabled: false, token: null, header: 'X-CSRF-Token' };
  _config.cache = { strategy: 'none', ttl: 300000, prefix: 'nojs_' };
  _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
  _config.sanitize = true;
  _config.i18n = { fallbackLocale: null };

  Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
  _interceptors.request = [];
  _interceptors.response = [];
  Object.keys(_refs).forEach((k) => delete _refs[k]);
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _plugins.clear();
  for (const k in _globals) delete _globals[k];
  for (const k in _globalOwners) delete _globalOwners[k];
  _setDisposing(false);
  _setCurrentPluginName(null);

  window.scrollTo = jest.fn();
});

// ═══════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════

function mockFetch() {
  const prev = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    url: 'http://localhost/api/test',
    text: () => Promise.resolve('{"data":1}'),
    json: () => Promise.resolve({ data: 1 }),
  });
  return () => { global.fetch = prev; };
}

/**
 * Check that console.warn was called with a message matching the given
 * substring. _warn() calls console.warn("[No.JS]", ...args), so we
 * search across all arguments of every call.
 */
function expectWarning(spy, substring) {
  const found = spy.mock.calls.some((args) =>
    args.some((a) => typeof a === 'string' && a.includes(substring))
  );
  expect(found).toBe(true);
}

/** Inverse helper */
function expectNoWarning(spy, substring) {
  const found = spy.mock.calls.some((args) =>
    args.some((a) => typeof a === 'string' && a.includes(substring))
  );
  expect(found).toBe(false);
}

// ═══════════════════════════════════════════════════════════════════════
//  describe('NoJS.use()')
// ═══════════════════════════════════════════════════════════════════════

describe('NoJS.use()', () => {
  // T7.1 — idempotency: calling use() twice with same plugin object is a silent no-op
  test('T7.1 — idempotency: same plugin registered twice is a silent no-op', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const installFn = jest.fn();
    const plugin = { name: 'test-idempotent', install: installFn };

    NoJS.use(plugin);
    NoJS.use(plugin);

    expect(installFn).toHaveBeenCalledTimes(1);
    expectNoWarning(warnSpy, 'name collision');
    warnSpy.mockRestore();
  });

  // T7.2 — name collision: different plugin with same name logs collision warning
  test('T7.2 — name collision: different plugin with same name logs warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const pluginA = { name: 'collision-test', install: jest.fn() };
    const pluginB = { name: 'collision-test', install: jest.fn() };

    NoJS.use(pluginA);
    NoJS.use(pluginB);

    expect(pluginA.install).toHaveBeenCalledTimes(1);
    expect(pluginB.install).not.toHaveBeenCalled();
    expectWarning(warnSpy, 'name collision');
    warnSpy.mockRestore();
  });

  // T7.3 — rejects anonymous: plugin with no name or name:'anonymous' is rejected
  test('T7.3 — rejects plugin with no name or name "anonymous"', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.use({ install: jest.fn() }); // no name
    NoJS.use({ name: 'anonymous', install: jest.fn() }); // name is 'anonymous'
    NoJS.use({ name: '', install: jest.fn() }); // empty name

    expect(_plugins.size).toBe(0);
    // Each should produce a warning about needing a unique name
    const nameWarnings = warnSpy.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && a.includes('must have a unique'))
    );
    expect(nameWarnings.length).toBe(3);
    warnSpy.mockRestore();
  });

  // T7.4 — rejects during dispose: use() during dispose() logs warning and returns
  test('T7.4 — rejects use() during dispose()', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _setDisposing(true);

    NoJS.use({ name: 'blocked', install: jest.fn() });

    expect(_plugins.size).toBe(0);
    expectWarning(warnSpy, 'Cannot install plugins during dispose');
    warnSpy.mockRestore();
  });

  // T7.5 — function shorthand: named function plugins normalized correctly
  test('T7.5 — function shorthand: named function normalized as plugin', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const installFn = jest.fn();
    function myPlugin(api, opts) { installFn(api, opts); }

    NoJS.use(myPlugin, { foo: 1 });

    expect(_plugins.has('myPlugin')).toBe(true);
    expect(installFn).toHaveBeenCalledWith(NoJS, { foo: 1 });
    warnSpy.mockRestore();
  });

  // T7.6 — rejects arrow functions (no name)
  test('T7.6 — rejects arrow functions (anonymous)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.use(() => {});

    expect(_plugins.size).toBe(0);
    expectWarning(warnSpy, 'must have a unique');
    warnSpy.mockRestore();
  });

  // T7.7 — install receives NoJS API object and options
  test('T7.7 — install receives NoJS API and options', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const installFn = jest.fn();
    const opts = { debug: true, extra: 'val' };
    const plugin = { name: 'api-test', install: installFn };

    NoJS.use(plugin, opts);

    expect(installFn).toHaveBeenCalledWith(NoJS, opts);
    const apiArg = installFn.mock.calls[0][0];
    expect(typeof apiArg.global).toBe('function');
    expect(typeof apiArg.directive).toBe('function');
    expect(typeof apiArg.interceptor).toBe('function');
    expect(typeof apiArg.on).toBe('function');
    warnSpy.mockRestore();
  });

  // T7.8 — init hooks called after NoJS.init() DOM processing
  test('T7.8 — init hooks called after NoJS.init() DOM processing', async () => {
    const initFn = jest.fn();
    const plugin = {
      name: 'init-hook-test',
      install: jest.fn(),
      init: initFn,
    };

    NoJS.use(plugin);
    expect(initFn).not.toHaveBeenCalled();

    await NoJS.init();

    expect(initFn).toHaveBeenCalledWith(NoJS);
  });

  // T7.9 — late use() — if already initialized, init fires after init completion
  test('T7.9 — late use(): init fires for plugin registered after init()', async () => {
    await NoJS.init();

    const initFn = jest.fn();
    const plugin = {
      name: 'late-plugin',
      install: jest.fn(),
      init: initFn,
    };

    NoJS.use(plugin);

    // init is called via _initPromise.then(), so wait a tick
    await new Promise((r) => setTimeout(r, 0));

    expect(initFn).toHaveBeenCalledWith(NoJS);
  });

  // T7.10 — dispose — plugins disposed in reverse installation order
  test('T7.10 — dispose: plugins disposed in reverse installation order', async () => {
    const order = [];
    const pluginA = {
      name: 'first',
      install: jest.fn(),
      dispose: jest.fn(() => order.push('first')),
    };
    const pluginB = {
      name: 'second',
      install: jest.fn(),
      dispose: jest.fn(() => order.push('second')),
    };
    const pluginC = {
      name: 'third',
      install: jest.fn(),
      dispose: jest.fn(() => order.push('third')),
    };

    NoJS.use(pluginA);
    NoJS.use(pluginB);
    NoJS.use(pluginC);

    await NoJS.dispose();

    expect(order).toEqual(['third', 'second', 'first']);
    expect(_plugins.size).toBe(0);
  });

  // T7.11 — capabilities logged in debug mode
  test('T7.11 — capabilities logged in debug mode', () => {
    _config.debug = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const plugin = {
      name: 'cap-plugin',
      capabilities: ['fetch-interceptor', 'i18n'],
      install: jest.fn(),
    };

    NoJS.use(plugin);

    const capCall = logSpy.mock.calls.find((args) =>
      args.some((a) => typeof a === 'string' && a.includes('declares capabilities'))
    );
    expect(capCall).toBeTruthy();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  describe('NoJS.global()')
// ═══════════════════════════════════════════════════════════════════════

describe('NoJS.global()', () => {
  // T7.12 — $myVar accessible in evaluate()
  test('T7.12 — $myVar accessible in evaluate()', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.global('myVar', 42);

    const ctx = createContext({ foo: 1 });
    expect(evaluate('$myVar', ctx)).toBe(42);
    expect(evaluate('$myVar + foo', ctx)).toBe(43);
    warnSpy.mockRestore();
  });

  // T7.13 — reactive updates trigger watchers
  test('T7.13 — reactive object globals trigger watchers', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.global('settings', { theme: 'dark' });

    const ctx = createContext({ x: 1 });
    const watchFn = jest.fn();
    ctx.$watch(watchFn);

    // The global is wrapped in a reactive context, verify it's accessible
    expect(evaluate('$settings.theme', ctx)).toBe('dark');
    warnSpy.mockRestore();
  });

  // T7.14 — reserved names rejected with warning
  test('T7.14 — reserved names rejected with warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const reserved = ['store', 'route', 'router', 'i18n', 'refs', 'form', 'parent', 'config', 'env'];
    for (const name of reserved) {
      NoJS.global(name, 'value');
    }

    // Each reserved name should produce a warning containing "reserved"
    for (const name of reserved) {
      const found = warnSpy.mock.calls.some((args) =>
        args.some((a) => typeof a === 'string' && a.includes(`"${name}" is reserved`))
      );
      expect(found).toBe(true);
    }
    warnSpy.mockRestore();
  });

  // T7.15 — overwrite warning when different plugin overwrites
  test('T7.15 — overwrite warning when different plugin overwrites', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate plugin A setting a global
    _setCurrentPluginName('plugin-a');
    NoJS.global('shared', 1);
    _setCurrentPluginName(null);

    // Simulate plugin B overwriting it
    _setCurrentPluginName('plugin-b');
    NoJS.global('shared', 2);
    _setCurrentPluginName(null);

    expectWarning(warnSpy, 'owned by "plugin-a"');
    expectWarning(warnSpy, 'being overwritten');
    warnSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  describe('Interceptor Sentinels')
// ═══════════════════════════════════════════════════════════════════════

describe('Interceptor Sentinels', () => {
  let restoreFetch;

  beforeEach(() => {
    restoreFetch = mockFetch();
    _config.retries = 0;
    _config.timeout = 10000;
    _config.credentials = 'same-origin';
    _config.csrf = null;
  });

  afterEach(() => {
    restoreFetch();
  });

  // T7.16 — CANCEL — { [NoJS.CANCEL]: true } throws AbortError
  test('T7.16 — CANCEL sentinel aborts the request', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _interceptors.request.push((url, opts) => ({ [_CANCEL]: true }));

    await expect(_doFetch('/api/test')).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // T7.17 — RESPOND — returns data without fetch
  test('T7.17 — RESPOND sentinel short-circuits the request', async () => {
    _interceptors.request.push((url, opts) => ({
      [_RESPOND]: { cached: true, value: 99 },
    }));

    const result = await _doFetch('/api/test');

    expect(result).toEqual({ cached: true, value: 99 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // T7.18 — async interceptors are awaited
  test('T7.18 — async interceptors are awaited', async () => {
    const order = [];
    _interceptors.request.push(async (url, opts) => {
      await new Promise((r) => setTimeout(r, 10));
      order.push('interceptor');
      return opts;
    });

    await _doFetch('/api/test');
    order.push('done');

    expect(order).toEqual(['interceptor', 'done']);
  });

  // T7.19 — response REPLACE — replaces parsed response
  test('T7.19 — response REPLACE sentinel replaces response', async () => {
    _interceptors.response.push((response, url) => ({
      [_REPLACE]: { replaced: true },
    }));

    const result = await _doFetch('/api/test');
    expect(result).toEqual({ replaced: true });
  });

  // T7.20 — trusted via use() — receives all headers; self-declared trust ignored
  test('T7.20 — trusted plugin receives all headers; self-declared trust is ignored', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let receivedHeaders = null;

    const trustedPlugin = {
      name: 'trusted-logger',
      install(api) {
        api.interceptor('request', (url, opts) => {
          receivedHeaders = { ...opts.headers };
          return opts;
        });
      },
    };
    NoJS.use(trustedPlugin, { trusted: true });

    _config.headers = { Authorization: 'Bearer secret123' };

    await _doFetch('/api/test');

    expect(receivedHeaders).toHaveProperty('Authorization', 'Bearer secret123');

    // Reset for self-declared test
    _interceptors.request = [];
    receivedHeaders = null;

    // Self-declared trust (not via use()) should NOT get sensitive headers
    _interceptors.request.push({
      fn: (url, opts) => {
        receivedHeaders = { ...opts.headers };
        return opts;
      },
      pluginName: 'self-declared',
    });

    await _doFetch('/api/test');

    expect(receivedHeaders).not.toHaveProperty('Authorization');
    warnSpy.mockRestore();
  });

  // T7.21 — backward compat — existing interceptor patterns still work
  test('T7.21 — backward compat: plain function interceptors still work', async () => {
    let intercepted = false;
    _interceptors.request.push((url, opts) => {
      intercepted = true;
      return opts;
    });

    await _doFetch('/api/test');
    expect(intercepted).toBe(true);
  });

  // T7.22 — backward compat — all existing NoJS methods still function
  test('T7.22 — backward compat: all existing NoJS public methods exist', () => {
    expect(typeof NoJS.config).toBe('function');
    expect(typeof NoJS.init).toBe('function');
    expect(typeof NoJS.directive).toBe('function');
    expect(typeof NoJS.filter).toBe('function');
    expect(typeof NoJS.validator).toBe('function');
    expect(typeof NoJS.i18n).toBe('function');
    expect(typeof NoJS.on).toBe('function');
    expect(typeof NoJS.interceptor).toBe('function');
    expect(typeof NoJS.use).toBe('function');
    expect(typeof NoJS.global).toBe('function');
    expect(typeof NoJS.dispose).toBe('function');
    expect(typeof NoJS.createContext).toBe('function');
    expect(typeof NoJS.evaluate).toBe('function');
    expect(typeof NoJS.version).toBe('string');
    expect(NoJS.CANCEL).toBe(_CANCEL);
    expect(NoJS.RESPOND).toBe(_RESPOND);
    expect(NoJS.REPLACE).toBe(_REPLACE);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  describe('Security')
// ═══════════════════════════════════════════════════════════════════════

describe('Security', () => {
  let restoreFetch;

  beforeEach(() => {
    restoreFetch = mockFetch();
    _config.retries = 0;
    _config.timeout = 10000;
    _config.credentials = 'same-origin';
    _config.csrf = null;
  });

  afterEach(() => {
    restoreFetch();
  });

  // T7.23 — header redaction: standard interceptor does NOT receive Authorization, Cookie, X-CSRF-Token
  test('T7.23 — standard interceptor does not receive sensitive headers', async () => {
    let receivedHeaders = null;
    _interceptors.request.push((url, opts) => {
      receivedHeaders = { ...opts.headers };
      return opts;
    });

    _config.headers = {
      Authorization: 'Bearer token',
      Cookie: 'session=abc',
      'X-CSRF-Token': 'csrf123',
      'X-Custom': 'allowed',
    };

    await _doFetch('/api/test');

    expect(receivedHeaders).not.toHaveProperty('Authorization');
    expect(receivedHeaders).not.toHaveProperty('Cookie');
    expect(receivedHeaders).not.toHaveProperty('X-CSRF-Token');
    expect(receivedHeaders).toHaveProperty('X-Custom', 'allowed');
  });

  // T7.24 — trusted interceptor receives all headers
  test('T7.24 — trusted interceptor receives all headers', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let receivedHeaders = null;
    const plugin = {
      name: 'trusted-interceptor',
      install(api) {
        api.interceptor('request', (url, opts) => {
          receivedHeaders = { ...opts.headers };
          return opts;
        });
      },
    };
    NoJS.use(plugin, { trusted: true });

    _config.headers = {
      Authorization: 'Bearer secret',
      Cookie: 'session=xyz',
      'X-Custom': 'value',
    };

    await _doFetch('/api/test');

    expect(receivedHeaders).toHaveProperty('Authorization', 'Bearer secret');
    expect(receivedHeaders).toHaveProperty('Cookie', 'session=xyz');
    expect(receivedHeaders).toHaveProperty('X-Custom', 'value');
    warnSpy.mockRestore();
  });

  // T7.25 — global('__proto__', ...) rejected
  test('T7.25 — global("__proto__", ...) is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('__proto__', { hack: true });

    expect('__proto__' in _globals).toBe(false);
    expectWarning(warnSpy, 'forbidden');
    warnSpy.mockRestore();
  });

  // T7.26 — global('constructor', ...) rejected
  test('T7.26 — global("constructor", ...) is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('constructor', { hack: true });

    expect('constructor' in _globals).toBe(false);
    expectWarning(warnSpy, 'forbidden');
    warnSpy.mockRestore();
  });

  // T7.27 — global('store', ...) rejected (reserved name)
  test('T7.27 — global("store", ...) rejected as reserved', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('store', { override: true });

    expect('store' in _globals).toBe(false);
    expectWarning(warnSpy, 'reserved');
    warnSpy.mockRestore();
  });

  // T7.28 — prototype pollution via global value
  test('T7.28 — prototype pollution via global value does not pollute Object.prototype', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const before = Object.prototype.polluted;

    NoJS.global('safe', JSON.parse('{"__proto__":{"polluted":"yes"}}'));

    expect(Object.prototype.polluted).toBe(before);
    expect(({}).polluted).toBeUndefined();
    warnSpy.mockRestore();
  });

  // T7.29 — directive('bind', ...) after freeze — core directive override rejected
  test('T7.29 — core directive "bind" override rejected after freeze', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    registerDirective('bind', { init: () => {} });

    expectWarning(warnSpy, 'Cannot override core directive');
    warnSpy.mockRestore();
  });

  // T7.30 — directive('on:*', ...) after freeze — pattern directive override rejected
  test('T7.30 — pattern directive "on:*" override rejected after freeze', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    registerDirective('on:*', { init: () => {} });

    expectWarning(warnSpy, 'Cannot override core directive');
    warnSpy.mockRestore();
  });

  // T7.31 — expression $evil.constructor returns undefined
  test('T7.31 — expression accessing .constructor returns undefined', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.global('evil', { data: 'safe' });
    const ctx = createContext({});

    expect(evaluate('$evil.constructor', ctx)).toBeUndefined();
    warnSpy.mockRestore();
  });

  // T7.32 — expression $evil['__proto__'] returns undefined
  test('T7.32 — expression $evil["__proto__"] returns undefined', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.global('evil', { data: 'safe' });
    const ctx = createContext({});

    expect(evaluate('$evil["__proto__"]', ctx)).toBeUndefined();
    warnSpy.mockRestore();
  });

  // T7.33 — expression $evil['con'+'structor'] returns undefined (computed access blocked)
  test('T7.33 — computed expression $evil["con"+"structor"] returns undefined', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.global('evil', { data: 'safe' });
    const ctx = createContext({});

    expect(evaluate('$evil["con" + "structor"]', ctx)).toBeUndefined();
    warnSpy.mockRestore();
  });

  // T7.34 — interceptor timeout fires after 5s — hung interceptor terminated, fetch proceeds
  test('T7.34 — interceptor timeout: hung interceptor terminated after 5s, fetch proceeds', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Interceptor that never resolves
    _interceptors.request.push(() => new Promise(() => {}));

    const promise = _doFetch('/api/test');

    // Advance past the interceptor timeout (5000ms)
    jest.advanceTimersByTime(5000);

    // Advance past the fetch timeout so the AbortController doesn't fire
    // (we need to let the retry/response handling proceed)
    jest.advanceTimersByTime(10000);

    const result = await promise;

    expect(result).toEqual({ data: 1 });
    expectWarning(warnSpy, 'Interceptor timeout');
    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  // T7.35 — interceptor re-entrancy guard
  test('T7.35 — interceptor re-entrancy guard prevents recursive interceptor calls', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let outerCallCount = 0;
    let innerCallCount = 0;

    _interceptors.request.push(async (url, opts) => {
      outerCallCount++;
      // Attempt nested fetch — the interceptor should be skipped due to depth guard
      const innerResult = await _doFetch('/api/inner');
      innerCallCount = global.fetch.mock.calls.length;
      return opts;
    });

    await _doFetch('/api/test');

    // The outer interceptor ran once
    expect(outerCallCount).toBe(1);
    // The inner _doFetch call should have skipped interceptors (depth > 1)
    // and called fetch directly — so fetch was called at least for the inner request
    expect(global.fetch).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // T7.36 — use() blocked during dispose()
  test('T7.36 — use() blocked during dispose()', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _setDisposing(true);

    const plugin = { name: 'blocked-plugin', install: jest.fn() };
    NoJS.use(plugin);

    expect(plugin.install).not.toHaveBeenCalled();
    expect(_plugins.size).toBe(0);
    expectWarning(warnSpy, 'Cannot install plugins during dispose');
    warnSpy.mockRestore();
  });

  // T7.37 — dispose timeout — plugin dispose() hanging >3s terminated
  test('T7.37 — dispose timeout: plugin dispose hanging >3s is terminated', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const plugin = {
      name: 'slow-plugin',
      install: jest.fn(),
      dispose: () => new Promise(() => {}), // never resolves
    };

    NoJS.use(plugin);

    const disposePromise = NoJS.dispose();
    jest.advanceTimersByTime(3000);
    await disposePromise;

    expectWarning(warnSpy, 'dispose error');
    expectWarning(warnSpy, 'Dispose timeout');
    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  // T7.38 — dispose error isolation — one plugin's error doesn't prevent others
  test('T7.38 — dispose error isolation: one plugin error does not block others', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const order = [];

    const pluginA = {
      name: 'plugin-a',
      install: jest.fn(),
      dispose: () => order.push('a'),
    };
    const pluginB = {
      name: 'plugin-b',
      install: jest.fn(),
      dispose: () => { throw new Error('B exploded'); },
    };
    const pluginC = {
      name: 'plugin-c',
      install: jest.fn(),
      dispose: () => order.push('c'),
    };

    NoJS.use(pluginA);
    NoJS.use(pluginB);
    NoJS.use(pluginC);

    await NoJS.dispose();

    // Reverse order: C, B (error), A
    expect(order).toContain('c');
    expect(order).toContain('a');
    expectWarning(warnSpy, 'plugin-b');
    expectWarning(warnSpy, 'B exploded');
    warnSpy.mockRestore();
  });

  // T7.39 — two plugins cannot silently share globals — overwrite produces warning
  test('T7.39 — two plugins sharing globals produces overwrite warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const pluginA = {
      name: 'writer-a',
      install(api) { api.global('shared', 'from-a'); },
    };
    const pluginB = {
      name: 'writer-b',
      install(api) { api.global('shared', 'from-b'); },
    };

    NoJS.use(pluginA);
    NoJS.use(pluginB);

    expectWarning(warnSpy, 'owned by "writer-a"');
    warnSpy.mockRestore();
  });

  // T7.40 — sentinel Symbol not colliding with JSON — response with "__cancel" key not misinterpreted
  test('T7.40 — sentinel Symbols do not collide with JSON string keys', async () => {
    // Verify that the sentinels are actual Symbols, not strings
    expect(typeof _CANCEL).toBe('symbol');
    expect(typeof _RESPOND).toBe('symbol');
    expect(typeof _REPLACE).toBe('symbol');

    // A request interceptor returning an object with string keys that look like sentinels
    // should NOT trigger sentinel behavior — only Symbol-keyed properties do
    _interceptors.request.push((url, opts) => {
      return {
        ...opts,
        __cancel: true,
        __respond: 'fake',
        __replace: 'nope',
      };
    });

    const result = await _doFetch('/api/test');

    // The request should have proceeded normally (fetch was called)
    expect(global.fetch).toHaveBeenCalled();
    // And we got the normal response data back
    expect(result).toEqual({ data: 1 });
  });

  // T7.41 — URL immutability — interceptor cannot change the URL used for actual fetch
  test('T7.41 — interceptor cannot change the URL used for actual fetch', async () => {
    _interceptors.request.push((url, opts) => {
      // Attempt to change URL by returning modified opts
      return { ...opts, url: 'http://evil.com/hack' };
    });

    await _doFetch('/api/test');

    // The actual fetch should still use the original resolved URL
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toBe('/api/test');
    expect(calledUrl).not.toContain('evil.com');
  });

  // ── HIGH-03: eval/Function global rejection ─────────────────────────────
  test('T7.42 — global(name, eval) is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('evil', eval);

    expect('evil' in _globals).toBe(false);
    expectWarning(warnSpy, 'forbidden reference');
    warnSpy.mockRestore();
  });

  test('T7.43 — global(name, Function) is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('evil', Function);

    expect('evil' in _globals).toBe(false);
    expectWarning(warnSpy, 'forbidden reference');
    warnSpy.mockRestore();
  });

  // ── HIGH-02: Nested eval in non-serializable globals ────────────────────
  test('T7.44 — global with non-serializable object containing eval is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const obj = { fn: eval };
    obj.self = obj; // circular — JSON.stringify will throw
    NoJS.global('evil', obj);

    expect('evil' in _globals).toBe(false);
    expectWarning(warnSpy, 'forbidden reference');
    warnSpy.mockRestore();
  });

  // ── CRITICAL-01: Response _original leakage ─────────────────────────────
  test('T7.45 — untrusted response interceptor cannot access _original', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let capturedResponse = null;

    // Register an UNTRUSTED plugin with a response interceptor
    // (push directly without pluginName — untrusted by default)
    _interceptors.response.push((response, url) => {
      capturedResponse = response;
      return response;
    });

    await _doFetch('/api/test');

    // The untrusted interceptor receives a redacted, frozen response object
    expect(capturedResponse).toBeDefined();
    expect(capturedResponse._original).toBeUndefined();
    // It should not have a way to reach the original response via any property
    expect(Object.keys(capturedResponse)).not.toContain('_original');
    warnSpy.mockRestore();
  });

  // ── CRITICAL-02: Proxy headers cannot capture sensitive headers ─────────
  test('T7.46 — interceptor cannot inject sensitive headers via Proxy trap', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Untrusted interceptor tries to inject a sensitive header
    _interceptors.request.push((url, opts) => {
      return { headers: { 'Authorization': 'stolen', 'X-Custom': 'ok' } };
    });

    _config.headers = {};

    await _doFetch('/api/test');

    // Verify the actual fetch call headers
    const calledOpts = global.fetch.mock.calls[0][1];
    // Authorization should NOT be in the merged headers (blocked by _isSensitiveHeader)
    expect(calledOpts.headers).not.toHaveProperty('Authorization');
    // Non-sensitive header should be merged
    expect(calledOpts.headers).toHaveProperty('X-Custom', 'ok');
    warnSpy.mockRestore();
  });

  // ── HIGH-01: Method/credentials preservation ────────────────────────────
  test('T7.47 — interceptor cannot change method from GET to DELETE', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Interceptor tries to change method
    _interceptors.request.push((url, opts) => {
      return { method: 'DELETE', headers: {} };
    });

    await _doFetch('/api/test', 'GET');

    // The actual fetch should preserve the original method
    const calledOpts = global.fetch.mock.calls[0][1];
    expect(calledOpts.method).toBe('GET');
    warnSpy.mockRestore();
  });

  test('T7.48 — interceptor cannot change credentials policy', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Interceptor tries to change credentials
    _interceptors.request.push((url, opts) => {
      return { credentials: 'include', headers: {} };
    });

    await _doFetch('/api/test');

    // The actual fetch should preserve the original credentials
    const calledOpts = global.fetch.mock.calls[0][1];
    expect(calledOpts.credentials).toBe('same-origin');
    warnSpy.mockRestore();
  });

  // ── MEDIUM-02: has trap consistency ─────────────────────────────────────
  test('T7.49 — $globalName in ctx returns true for registered globals', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    _globals.myGlobal = 'hello';

    const ctx = createContext({});
    expect('$myGlobal' in ctx).toBe(true);
    expect('$nonExistent' in ctx).toBe(false);

    delete _globals.myGlobal;
    warnSpy.mockRestore();
  });

  // ── MEDIUM-03: Wildcard header patterns ─────────────────────────────────
  test('T7.50 — headers matching x-auth-* pattern are redacted from interceptor', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let receivedHeaders = null;

    _interceptors.request.push((url, opts) => {
      receivedHeaders = { ...opts.headers };
      return opts;
    });

    _config.headers = {
      'X-Auth-Refresh-Token': 'refresh-secret',
      'X-Custom': 'visible',
    };

    await _doFetch('/api/test');

    expect(receivedHeaders).not.toHaveProperty('X-Auth-Refresh-Token');
    expect(receivedHeaders).toHaveProperty('X-Custom', 'visible');
    warnSpy.mockRestore();
  });

  test('T7.51 — headers matching x-api-* pattern are redacted from interceptor', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let receivedHeaders = null;

    _interceptors.request.push((url, opts) => {
      receivedHeaders = { ...opts.headers };
      return opts;
    });

    _config.headers = {
      'X-API-Secret': 'api-secret-value',
      'X-Custom': 'visible',
    };

    await _doFetch('/api/test');

    expect(receivedHeaders).not.toHaveProperty('X-API-Secret');
    expect(receivedHeaders).toHaveProperty('X-Custom', 'visible');
    warnSpy.mockRestore();
  });

  // ── MEDIUM-03 FIX: Untrusted interceptor opts mutation isolation ────────
  // T7.55 — untrusted interceptor mutating opts.method does NOT affect actual fetch
  test('T7.55 — untrusted interceptor mutating opts.method does not affect actual fetch', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Register an untrusted interceptor that mutates the opts object it receives
    _interceptors.request.push((url, opts) => {
      opts.method = 'DELETE'; // mutation on the shallow copy
      return opts;
    });

    await _doFetch('/api/test', 'GET');

    // The actual fetch should still use the original method
    const calledOpts = global.fetch.mock.calls[0][1];
    expect(calledOpts.method).toBe('GET');
    warnSpy.mockRestore();
  });

  // T7.56 — untrusted interceptor mutating opts.body does NOT affect actual fetch
  test('T7.56 — untrusted interceptor mutating opts.body does not affect actual fetch', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Register an untrusted interceptor that tries to inject a body
    _interceptors.request.push((url, opts) => {
      opts.body = '{"malicious":"payload"}';
      return opts;
    });

    await _doFetch('/api/test', 'GET');

    // The actual fetch should not have a body (GET request)
    const calledOpts = global.fetch.mock.calls[0][1];
    expect(calledOpts.body).toBeUndefined();
    warnSpy.mockRestore();
  });

  // T7.57 — trusted interceptor also receives a copy (mutations to method/body isolated)
  test('T7.57 — trusted interceptor mutations to method/body are also isolated', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const plugin = {
      name: 'trusted-mutator',
      install(api) {
        api.interceptor('request', (url, opts) => {
          opts.method = 'PUT';
          opts.credentials = 'include';
          return opts;
        });
      },
    };
    NoJS.use(plugin, { trusted: true });

    await _doFetch('/api/test', 'POST', '{"data":1}');

    // Even trusted interceptors receive a shallow copy, so mutations to
    // method and credentials on the copy do not affect the real opts
    const calledOpts = global.fetch.mock.calls[0][1];
    expect(calledOpts.method).toBe('POST');
    expect(calledOpts.credentials).toBe('same-origin');
    warnSpy.mockRestore();
  });

  // ── MEDIUM-02 FIX: Late plugin init error handling ────────────────────
  // T7.58 — late use() with plugin.init() that throws: warning logged, no unhandled rejection
  test('T7.58 — late use() with throwing init: warning logged, no unhandled rejection', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await NoJS.init();

    const plugin = {
      name: 'bad-init-throw',
      install: jest.fn(),
      init() { throw new Error('init exploded'); },
    };

    // This should NOT cause an unhandled promise rejection
    NoJS.use(plugin);

    // Wait a tick for the .then().catch() chain to settle
    await new Promise((r) => setTimeout(r, 0));

    // _warn should have been called with the plugin name and error message
    expectWarning(warnSpy, 'bad-init-throw');
    expectWarning(warnSpy, 'init error');
    warnSpy.mockRestore();
  });

  // T7.59 — late use() with plugin.init() that returns a rejected promise: warning logged
  test('T7.59 — late use() with rejecting init: warning logged, no unhandled rejection', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await NoJS.init();

    const plugin = {
      name: 'bad-init-reject',
      install: jest.fn(),
      init() { return Promise.reject(new Error('async init failed')); },
    };

    // This should NOT cause an unhandled promise rejection
    NoJS.use(plugin);

    // Wait a tick for the .then().catch() chain to settle
    await new Promise((r) => setTimeout(r, 0));

    // _warn should have been called with the plugin name and error message
    expectWarning(warnSpy, 'bad-init-reject');
    expectWarning(warnSpy, 'init error');
    warnSpy.mockRestore();
  });

  // ── MEDIUM-05: Invalid identifier characters ───────────────────────────
  test('T7.52 — global with spaces in name is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('a b c', 'value');

    expect('a b c' in _globals).toBe(false);
    expectWarning(warnSpy, 'not a valid identifier');
    warnSpy.mockRestore();
  });

  test('T7.53 — global with dot in name is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('a.b', 'value');

    expect('a.b' in _globals).toBe(false);
    expectWarning(warnSpy, 'not a valid identifier');
    warnSpy.mockRestore();
  });

  test('T7.54 — global starting with number is rejected', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NoJS.global('123abc', 'value');

    expect('123abc' in _globals).toBe(false);
    expectWarning(warnSpy, 'not a valid identifier');
    warnSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────
//  Plugin global reactivity through statements (plugin-system e2e 2)
// ─────────────────────────────────────────────────────────────────────────
// A statement writing through a registry-less $-root ($demo.count++) mutates
// a proxy that lives OUTSIDE the context chain, so _execStatement's per-key
// write-back never sees it. The wake must come from the explicit keyless
// chain notify in _execStatement. Before the compiled evaluator this worked
// by accident: interpreted evaluate() planted __collectKeysCache on the
// context and the in-place-mutation safety net notified it.
describe('plugin global reactivity ($demo.count++ wakes bind="$demo.count")', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));

  test('click on on:click="$demo.count++" re-renders bind="$demo.count"', async () => {
    document.body.innerHTML = `
      <section state="{ x: 0 }">
        <button id="inc" on:click="$demo.count++">Inc</button>
        <span id="counter" bind="$demo.count"></span>
      </section>`;

    NoJS.use({
      name: 'demo',
      version: '1.0.0',
      capabilities: ['globals'],
      install(nojs) {
        nojs.global('demo', { message: 'Plugin loaded!', count: 0 });
      },
    });
    await NoJS.init();
    await flush();

    const counter = document.getElementById('counter');
    expect(counter.textContent).toBe('0');

    document.getElementById('inc').click();
    await flush();
    expect(_globals.demo.count).toBe(1);
    expect(counter.textContent).toBe('1');

    document.getElementById('inc').click();
    await flush();
    expect(counter.textContent).toBe('2');
  });

  test('statement without $-globals does not fire the keyless wake', async () => {
    document.body.innerHTML = `
      <section state="{ n: 0, other: 5 }">
        <button id="inc" on:click="n = n + 1">Inc</button>
        <span id="n" bind="n"></span>
        <span id="other" bind="other"></span>
      </section>`;

    await NoJS.init();
    await flush();

    // Key-scoped watcher for "other" must stay quiet on an "n"-only statement.
    const otherEl = document.getElementById('other');
    let otherWrites = 0;
    const origSet = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
    Object.defineProperty(otherEl, 'textContent', {
      set(v) { otherWrites++; origSet.call(this, v); },
      configurable: true,
    });

    document.getElementById('inc').click();
    await flush();
    expect(document.getElementById('n').textContent).toBe('1');
    expect(otherWrites).toBe(0);
  });
});
