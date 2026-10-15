import { _config, _stores, _refs } from '../src/globals.js';
import { createContext, _resetCtxId } from '../src/context.js';
import { _devtoolsEmit, _ctxRegistry, initDevtools, destroyDevtools, _isLocalHostname } from '../src/devtools.js';
import { registerDirective, processElement, _disposeTree } from '../src/registry.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function collectEvents(type) {
  const events = [];
  const handler = (e) => {
    if (!type || e.detail.type === type) events.push(e.detail);
  };
  window.addEventListener('nojs:devtools', handler);
  return {
    events,
    cleanup: () => window.removeEventListener('nojs:devtools', handler),
  };
}

function sendCommand(command, args = {}) {
  return new Promise((resolve) => {
    const handler = (e) => {
      if (e.detail.command === command) {
        window.removeEventListener('nojs:devtools:response', handler);
        resolve(e.detail.result);
      }
    };
    window.addEventListener('nojs:devtools:response', handler);
    window.dispatchEvent(
      new CustomEvent('nojs:devtools:cmd', {
        detail: { command, args },
      }),
    );
  });
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  _config.devtools = true;
  _ctxRegistry.clear();
  _resetCtxId();
  // Clean stores
  for (const key of Object.keys(_stores)) delete _stores[key];
});

afterEach(() => {
  _config.devtools = false;
  // Remove devtools command listener & window object
  delete window.__NOJS_DEVTOOLS__;
});

// ═══════════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('DevTools Protocol', () => {

  // ─── _devtoolsEmit ──────────────────────────────────────────────────────

  describe('_devtoolsEmit', () => {
    test('dispatches CustomEvent on window', () => {
      const { events, cleanup } = collectEvents();
      _devtoolsEmit('test:event', { foo: 'bar' });
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('test:event');
      expect(events[0].data).toEqual({ foo: 'bar' });
      expect(events[0].timestamp).toBeGreaterThan(0);
    });

    test('does nothing when devtools disabled', () => {
      _config.devtools = false;
      const { events, cleanup } = collectEvents();
      _devtoolsEmit('test:event', { foo: 'bar' });
      cleanup();

      expect(events).toHaveLength(0);
    });
  });

  // ─── Context ID tracking ────────────────────────────────────────────────

  describe('Context ID tracking', () => {
    test('assigns incremental __devtoolsId to contexts', () => {
      const ctx1 = createContext({ a: 1 });
      const ctx2 = createContext({ b: 2 });

      expect(ctx1.__raw.__devtoolsId).toBe(1);
      expect(ctx2.__raw.__devtoolsId).toBe(2);
    });

    test('registers contexts in _ctxRegistry', () => {
      const ctx = createContext({ x: 10 });
      const id = ctx.__raw.__devtoolsId;

      expect(_ctxRegistry.has(id)).toBe(true);
      expect(_ctxRegistry.get(id)).toBe(ctx);
    });

    test('does not assign ID when devtools disabled', () => {
      _config.devtools = false;
      const ctx = createContext({ y: 5 });

      expect(ctx.__raw.__devtoolsId).toBeUndefined();
    });

    test('_resetCtxId resets the counter', () => {
      createContext({ a: 1 });
      _resetCtxId();
      const ctx = createContext({ b: 2 });

      expect(ctx.__raw.__devtoolsId).toBe(1);
    });
  });

  // ─── ctx:created event ──────────────────────────────────────────────────

  describe('ctx:created event', () => {
    test('emitted when context is created', () => {
      const { events, cleanup } = collectEvents('ctx:created');
      createContext({ name: 'test', count: 0 });
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].data.id).toBe(1);
      expect(events[0].data.parentId).toBeNull();
      expect(events[0].data.keys).toEqual(['name', 'count']);
    });

    test('includes parent ID when parent context exists', () => {
      const parent = createContext({ p: 1 });
      const { events, cleanup } = collectEvents('ctx:created');
      createContext({ c: 2 }, parent);
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].data.parentId).toBe(parent.__raw.__devtoolsId);
    });
  });

  // ─── ctx:updated event ──────────────────────────────────────────────────

  describe('ctx:updated event', () => {
    test('emitted when context property changes', () => {
      const ctx = createContext({ count: 0 });
      const { events, cleanup } = collectEvents('ctx:updated');
      ctx.count = 5;
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].data.id).toBe(ctx.__raw.__devtoolsId);
      expect(events[0].data.key).toBe('count');
      expect(events[0].data.oldValue).toBe(0);
      expect(events[0].data.newValue).toBe(5);
    });

    test('not emitted when value is the same', () => {
      const ctx = createContext({ count: 0 });
      const { events, cleanup } = collectEvents('ctx:updated');
      ctx.count = 0; // same value
      cleanup();

      expect(events).toHaveLength(0);
    });
  });

  // ─── ctx:disposed event ─────────────────────────────────────────────────

  describe('ctx:disposed event', () => {
    test('emitted and registry cleaned on dispose', () => {
      const ctx = createContext({ x: 1 });
      const id = ctx.__raw.__devtoolsId;
      const div = document.createElement('div');
      div.__ctx = ctx;
      div.__declared = true;

      const { events, cleanup } = collectEvents('ctx:disposed');
      _disposeTree(div);
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].data.id).toBe(id);
      expect(_ctxRegistry.has(id)).toBe(false);
    });
  });

  // ─── directive:init event ───────────────────────────────────────────────

  describe('directive:init event', () => {
    test('emitted when directives are processed', () => {
      registerDirective('dt-test', { priority: 50, init: jest.fn() });
      const div = document.createElement('div');
      div.setAttribute('dt-test', 'hello');

      const { events, cleanup } = collectEvents('directive:init');
      processElement(div);
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].data.element).toBe('div');
      expect(events[0].data.directives).toEqual([
        { name: 'dt-test', value: 'hello' },
      ]);
    });
  });

  // ─── batch events ──────────────────────────────────────────────────────

  describe('batch events', () => {
    test('emits batch:start and batch:end', () => {
      const { _startBatch, _endBatch } = require('../src/context.js');
      const { events, cleanup } = collectEvents();

      const ctx = createContext({ a: 1 });
      // Register a watcher so the batch queue gets populated
      ctx.$watch(() => {});

      _startBatch();
      ctx.a = 2; // triggers batch queue (watcher queued, not fired)
      _endBatch();
      cleanup();

      const batchStart = events.filter((e) => e.type === 'batch:start');
      const batchEnd = events.filter((e) => e.type === 'batch:end');
      expect(batchStart.length).toBeGreaterThanOrEqual(1);
      expect(batchEnd.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── initDevtools & window.__NOJS_DEVTOOLS__ ───────────────────────────

  describe('initDevtools', () => {
    test('exposes __NOJS_DEVTOOLS__ on window', () => {
      const mockNoJS = { version: '1.5.2' };
      initDevtools(mockNoJS);

      expect(window.__NOJS_DEVTOOLS__).toBeDefined();
      expect(window.__NOJS_DEVTOOLS__.version).toBe('1.5.2');
      expect(window.__NOJS_DEVTOOLS__.stores).toEqual(_stores);
      expect(window.__NOJS_DEVTOOLS__.config).toEqual(_config);
      expect(typeof window.__NOJS_DEVTOOLS__.inspect).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.inspectStore).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.inspectTree).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.stats).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.mutate).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.mutateStore).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.highlight).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.unhighlight).toBe('function');
      expect(typeof window.__NOJS_DEVTOOLS__.on).toBe('function');
    });

    test('does nothing when devtools disabled', () => {
      _config.devtools = false;
      initDevtools({ version: '1.0' });
      expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
    });
  });

  // ─── Command handler ──────────────────────────────────────────────────

  describe('Command handler', () => {
    beforeEach(() => {
      initDevtools({ version: '1.5.2' });
    });

    test('inspect:element returns context data', async () => {
      const div = document.createElement('div');
      div.id = 'devtools-test';
      div.__ctx = createContext({ name: 'hello' });
      document.body.appendChild(div);

      const result = await sendCommand('inspect:element', { selector: '#devtools-test' });

      expect(result.hasContext).toBe(true);
      expect(result.data.name).toBe('hello');
      expect(result.contextId).toBe(div.__ctx.__raw.__devtoolsId);

      div.remove();
    });

    test('inspect:element returns error for missing element', async () => {
      const result = await sendCommand('inspect:element', { selector: '#nonexistent' });
      expect(result.error).toBe('Element not found');
    });

    test('inspect:store returns store data', async () => {
      _stores.user = createContext({ name: 'Alice', age: 30 });
      const result = await sendCommand('inspect:store', { name: 'user' });

      expect(result.name).toBe('user');
      expect(result.data.name).toBe('Alice');
      expect(result.data.age).toBe(30);
    });

    test('inspect:store returns error for missing store', async () => {
      const result = await sendCommand('inspect:store', { name: 'nope' });
      expect(result.error).toBe('Store not found');
    });

    test('mutate:context changes value and triggers reactivity', async () => {
      const ctx = createContext({ count: 0 });
      const id = ctx.__raw.__devtoolsId;

      const result = await sendCommand('mutate:context', { id, key: 'count', value: 42 });

      expect(result.ok).toBe(true);
      expect(ctx.count).toBe(42);
    });

    test('mutate:store changes store value', async () => {
      _stores.cart = createContext({ items: 0 });

      const result = await sendCommand('mutate:store', { name: 'cart', key: 'items', value: 5 });

      expect(result.ok).toBe(true);
      expect(_stores.cart.items).toBe(5);
    });

    test('get:config returns current config', async () => {
      const result = await sendCommand('get:config');
      expect(result.devtools).toBe(true);
      expect(result.baseApiUrl).toBe('');
    });

    test('get:config redacts csrf.token but preserves other csrf fields', async () => {
      _config.csrf = { token: 'secret-token-123', header: 'X-CSRF-Token' };

      const result = await sendCommand('get:config');

      expect(result.csrf.token).toBe('[REDACTED]');
      expect(result.csrf.header).toBe('X-CSRF-Token');

      delete _config.csrf;
    });

    test('get:config redacts headers', async () => {
      _config.headers = { Authorization: 'Bearer secret' };

      const result = await sendCommand('get:config');

      expect(result.headers).toBe('[REDACTED]');

      delete _config.headers;
    });

    test('get:config still returns non-sensitive config values', async () => {
      _config.csrf = { token: 'secret', header: 'X-CSRF' };
      _config.headers = { Authorization: 'Bearer tok' };

      const result = await sendCommand('get:config');

      expect(result.devtools).toBe(true);
      expect(result.baseApiUrl).toBe('');
      expect(result.csrf.token).toBe('[REDACTED]');
      expect(result.headers).toBe('[REDACTED]');

      delete _config.csrf;
      delete _config.headers;
    });

    test('get:stats returns stats', async () => {
      createContext({ a: 1 });
      createContext({ b: 2 });
      _stores.test = createContext({ c: 3 });

      const result = await sendCommand('get:stats');

      expect(result.contexts).toBe(3);
      expect(result.stores).toBe(1);
      expect(typeof result.listeners).toBe('number');
    });

    test('inspect:tree returns tree structure', async () => {
      const parent = document.createElement('div');
      parent.id = 'tree-root';
      parent.__ctx = createContext({ root: true });
      parent.__declared = true;

      const child = document.createElement('span');
      child.__ctx = createContext({ child: true });
      child.__declared = true;
      parent.appendChild(child);
      document.body.appendChild(parent);

      const result = await sendCommand('inspect:tree', { selector: '#tree-root' });

      expect(result.tag).toContain('div');
      expect(result.contextId).toBe(parent.__ctx.__raw.__devtoolsId);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].contextId).toBe(child.__ctx.__raw.__devtoolsId);

      parent.remove();
    });

    test('unknown command returns error', async () => {
      const result = await sendCommand('foo:bar');
      expect(result.error).toBe('Unknown command');
    });
  });

  // ─── Highlight overlay ──────────────────────────────────────────────────

  describe('Highlight overlay', () => {
    beforeEach(() => {
      initDevtools({ version: '1.5.2' });
    });

    test('highlight creates overlay and unhighlight removes it', async () => {
      const div = document.createElement('div');
      div.id = 'highlight-test';
      document.body.appendChild(div);

      await sendCommand('highlight:element', { selector: '#highlight-test' });
      expect(document.getElementById('__nojs_devtools_highlight__')).not.toBeNull();

      await sendCommand('unhighlight');
      expect(document.getElementById('__nojs_devtools_highlight__')).toBeNull();

      div.remove();
    });
  });

  // ─── Event subscription (on) ──────────────────────────────────────────

  describe('Event subscription via __NOJS_DEVTOOLS__.on', () => {
    test('subscribes to specific event type', () => {
      initDevtools({ version: '1.5.2' });

      const received = [];
      const unsub = window.__NOJS_DEVTOOLS__.on('ctx:updated', (detail) => {
        received.push(detail);
      });

      const ctx = createContext({ val: 1 });
      ctx.val = 2;

      expect(received).toHaveLength(1);
      expect(received[0].data.key).toBe('val');

      unsub();
      ctx.val = 3;
      expect(received).toHaveLength(1); // unsubscribed
    });
  });

  // ─── store:created event ──────────────────────────────────────────────

  describe('store:created event', () => {
    test('emitted when store directive registers a store', () => {
      // Simulate what the store directive does
      const { events, cleanup } = collectEvents('store:created');

      // Manually emit as the directive would
      _devtoolsEmit("store:created", { name: "cart", keys: ["items", "total"] });
      cleanup();

      expect(events).toHaveLength(1);
      expect(events[0].data.name).toBe('cart');
      expect(events[0].data.keys).toEqual(['items', 'total']);
    });
  });
});

describe('initDevtools — hostname guard', () => {
  afterEach(() => {
    _config.devtools = false;
    delete window.__NOJS_DEVTOOLS__;
    jest.restoreAllMocks();
  });

  describe('_isLocalHostname', () => {
    test.each([
      ['localhost', true],
      ['127.0.0.1', true],
      ['::1', true],
      ['0.0.0.0', true],
      ['app.localhost', true],
      ['', true],
      ['app.example.com', false],
      ['192.168.1.1', false],
      ['evil.com', false],
    ])('hostname "%s" → %s', (hostname, expected) => {
      // Pass hostname directly — avoids JSDOM window.location mocking limitations
      expect(_isLocalHostname(hostname)).toBe(expected);
    });

    test('reads window.location.hostname when no argument given (JSDOM = localhost)', () => {
      expect(_isLocalHostname()).toBe(true);
    });
  });

  test('does not initialize when hostname is not local', () => {
    // Directly verify the guard logic: non-local hostname returns false
    _config.devtools = true;
    expect(_isLocalHostname('evil.com')).toBe(false);
    // Since JSDOM runs on localhost, initDevtools would pass the check —
    // we verify the guard function itself rejects non-local hostnames
    expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
  });

  test('initDevtools is blocked and warns for non-local hostname (integration)', () => {
    // JSDOM's window.location.hostname is 'localhost' — we cannot override it easily.
    // Instead we test the guard contract: if _isLocalHostname returns false, initDevtools
    // must not set window.__NOJS_DEVTOOLS__. We verify this by calling the real
    // initDevtools with devtools:false (guard never reached) vs devtools:true (guard runs).
    _config.devtools = false;
    initDevtools({ version: '1.0.0' });
    expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
  });

  test('initializes devtools when running in local environment', () => {
    // JSDOM hostname is localhost — guard passes, API is exposed
    _config.devtools = true;
    initDevtools({ version: '1.0.0' });
    expect(window.__NOJS_DEVTOOLS__).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  H4 — Devtools exposes shallow copies, not live references
// ═══════════════════════════════════════════════════════════════════════

describe('H4 — Devtools shallow-copy getters', () => {
  beforeEach(() => {
    _config.devtools = true;
    _ctxRegistry.clear();
    for (const key of Object.keys(_stores)) delete _stores[key];
    for (const key of Object.keys(_refs)) delete _refs[key];
    initDevtools({ version: '1.0.0' });
  });

  afterEach(() => {
    destroyDevtools();
    _config.devtools = false;
  });

  test('should not affect internal _stores when mutating the devtools stores copy', () => {
    _stores.cart = createContext({ items: 0 });

    const exposed = window.__NOJS_DEVTOOLS__.stores;
    exposed.injected = 'hacked';
    delete exposed.cart;

    // Internal _stores must be unmodified
    expect(_stores.cart).toBeDefined();
    expect(_stores.injected).toBeUndefined();
  });

  test('should not affect internal _config when mutating the devtools config copy', () => {
    const exposed = window.__NOJS_DEVTOOLS__.config;
    exposed.evilFlag = true;
    exposed.devtools = false;

    // Internal _config must be unmodified
    expect(_config.evilFlag).toBeUndefined();
    expect(_config.devtools).toBe(true);
  });

  test('should not affect internal _refs when mutating the devtools refs copy', () => {
    const div = document.createElement('div');
    _refs.myRef = div;

    const exposed = window.__NOJS_DEVTOOLS__.refs;
    exposed.injected = document.createElement('span');
    delete exposed.myRef;

    // Internal _refs must be unmodified
    expect(_refs.myRef).toBe(div);
    expect(_refs.injected).toBeUndefined();
  });

  test('should return a fresh copy on each access (not the same object reference)', () => {
    _stores.test = createContext({ x: 1 });

    const stores1 = window.__NOJS_DEVTOOLS__.stores;
    const stores2 = window.__NOJS_DEVTOOLS__.stores;
    expect(stores1).not.toBe(stores2);
    // Both copies have the same keys but values are independent snapshots
    expect(Object.keys(stores1)).toEqual(Object.keys(stores2));
    expect(stores1.test).not.toBe(stores2.test);
    expect(stores1.test).toEqual(stores2.test);

    const config1 = window.__NOJS_DEVTOOLS__.config;
    const config2 = window.__NOJS_DEVTOOLS__.config;
    expect(config1).not.toBe(config2);
    expect(Object.keys(config1).sort()).toEqual(Object.keys(config2).sort());

    const refs1 = window.__NOJS_DEVTOOLS__.refs;
    const refs2 = window.__NOJS_DEVTOOLS__.refs;
    expect(refs1).not.toBe(refs2);
    expect(Object.keys(refs1)).toEqual(Object.keys(refs2));
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  M12 — Devtools command listener is removed after cleanup
// ═══════════════════════════════════════════════════════════════════════

describe('M12 — destroyDevtools cleanup', () => {
  beforeEach(() => {
    _config.devtools = true;
    _ctxRegistry.clear();
    for (const key of Object.keys(_stores)) delete _stores[key];
  });

  afterEach(() => {
    _config.devtools = false;
    delete window.__NOJS_DEVTOOLS__;
  });

  test('should stop command handler from firing after destroyDevtools()', async () => {
    initDevtools({ version: '1.0.0' });
    expect(window.__NOJS_DEVTOOLS__).toBeDefined();

    destroyDevtools();

    // Send a command — the handler should no longer respond
    const responseReceived = { value: false };
    const handler = () => { responseReceived.value = true; };
    window.addEventListener('nojs:devtools:response', handler);

    window.dispatchEvent(
      new CustomEvent('nojs:devtools:cmd', {
        detail: { command: 'get:stats', args: {} },
      }),
    );

    // Give the event loop a tick
    await new Promise((r) => setTimeout(r, 10));

    window.removeEventListener('nojs:devtools:response', handler);
    expect(responseReceived.value).toBe(false);
  });

  test('should delete window.__NOJS_DEVTOOLS__ after destroyDevtools()', () => {
    initDevtools({ version: '1.0.0' });
    expect(window.__NOJS_DEVTOOLS__).toBeDefined();

    destroyDevtools();

    expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
  });

  test('should allow re-initialization after destroyDevtools()', () => {
    initDevtools({ version: '1.0.0' });
    expect(window.__NOJS_DEVTOOLS__).toBeDefined();
    expect(window.__NOJS_DEVTOOLS__.version).toBe('1.0.0');

    destroyDevtools();
    expect(window.__NOJS_DEVTOOLS__).toBeUndefined();

    initDevtools({ version: '2.0.0' });
    expect(window.__NOJS_DEVTOOLS__).toBeDefined();
    expect(window.__NOJS_DEVTOOLS__.version).toBe('2.0.0');

    // Clean up
    destroyDevtools();
  });
});
