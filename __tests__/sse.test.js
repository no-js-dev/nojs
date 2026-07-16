


import {
  _stores,
  _config,
  _storeWatchers,
  _addStoreWatcher,
  _routeWatchers,
  _i18nListeners,
} from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree, _disposeTree } from '../src/registry.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/sse.js';


// ── EventSource mock (ADR-003 D4 — mirrors MockIntersectionObserver in
//    directives-http-pagination.test.js) ────────────────────────────────────
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static _instances = [];
  static _reset() { MockEventSource._instances = []; }
  static get _last() {
    return MockEventSource._instances[MockEventSource._instances.length - 1];
  }

  constructor(url, options = {}) {
    this.url = url;
    this.withCredentials = !!options.withCredentials;
    this.readyState = MockEventSource.CONNECTING;
    this.closed = false;
    this.onopen = null;
    this.onerror = null;
    this._listeners = new Map(); // type → Set<fn>
    MockEventSource._instances.push(this);
  }

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  close() {
    this.closed = true;
    this.readyState = MockEventSource.CLOSED;
  }

  _simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) this.onopen({ type: 'open' });
  }

  _simulateMessage(data, eventType = 'message') {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const event = { type: eventType, data: payload };
    for (const fn of [...(this._listeners.get(eventType) || [])]) fn(event);
  }

  _simulateError(readyState) {
    if (readyState !== undefined) this.readyState = readyState;
    if (this.onerror) this.onerror({ type: 'error' });
  }
}


// ── Helpers ────────────────────────────────────────────────────────────────

function buildDom(attrs, children = '', stateExpr = '{}') {
  const parent = document.createElement('div');
  parent.setAttribute('state', stateExpr);
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  if (children) el.innerHTML = children;
  parent.appendChild(el);
  document.body.appendChild(parent);
  return { parent, el };
}

function warnedWith(spy, substr) {
  return spy.mock.calls.some((call) => call.join(' ').includes(substr));
}


describe('SSE Directive', () => {
  let originalEventSource;
  let warnSpy;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    global.EventSource = MockEventSource;
    MockEventSource._reset();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Dispose everything so module-level per-origin connection tracking
    // in sse.js is cleaned between tests.
    for (const child of [...document.body.children]) _disposeTree(child);
    document.body.innerHTML = '';
    global.EventSource = originalEventSource;
    warnSpy.mockRestore();
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _storeWatchers.clear();
    _routeWatchers.clear();
    _i18nListeners.clear();
    _config.debug = false;
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-1: Basic connection with reactive data binding
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-1 — basic connection & data binding', () => {

    test('1.1 — JSON payload is parsed and bound to the `as` variable (child bind renders)', () => {
      const { parent, el } = buildDom(
        { sse: '/api/stream', as: 'ticker' },
        '<span bind="ticker.price"></span>'
      );
      processTree(parent);

      expect(MockEventSource._instances).toHaveLength(1);
      expect(MockEventSource._last.url).toBe('/api/stream');

      MockEventSource._last._simulateMessage({ price: 42.5 });

      expect(el.__ctx.ticker).toEqual({ price: 42.5 });
      expect(el.querySelector('span').textContent).toBe('42.5');
    });

    test('1.2 — non-JSON payload falls back to the raw string', () => {
      const { parent, el } = buildDom({ sse: '/api/log', as: 'line' });
      processTree(parent);

      MockEventSource._last._simulateMessage('Server started on port 3000');

      expect(el.__ctx.line).toBe('Server started on port 3000');
    });

    test('1.3 — default `as` name is "data"', () => {
      const { parent, el } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      MockEventSource._last._simulateMessage({ ok: true });

      expect(el.__ctx.data).toEqual({ ok: true });
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-2: Named events
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-2 — named events', () => {

    test('2.1 — sse-event listens to the named event', () => {
      const { parent, el } = buildDom({
        sse: '/api/stream',
        'sse-event': 'price-update',
        as: 'price',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage({ value: 100 }, 'price-update');

      expect(el.__ctx.price).toEqual({ value: 100 });
    });

    test('2.2 — named event ignores default "message" events', () => {
      const { parent, el } = buildDom({
        sse: '/api/stream',
        'sse-event': 'price-update',
        as: 'price',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage({ value: 999 }, 'message');

      expect(el.__ctx.price).toBeUndefined();
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-3: Insert modes + sse-limit
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-3 — insert modes & sse-limit', () => {

    test('3.1 — replace mode (default): each message replaces the previous', () => {
      const { parent, el } = buildDom({ sse: '/api/ticker', as: 'quote' });
      processTree(parent);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');
      MockEventSource._last._simulateMessage('C');

      expect(el.__ctx.quote).toBe('C');
    });

    test('3.2 — append mode accumulates into an array', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'append',
        'sse-limit': '10',
      });
      processTree(parent);

      expect(el.__ctx.messages).toEqual([]);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');
      MockEventSource._last._simulateMessage('C');

      expect(el.__ctx.messages).toEqual(['A', 'B', 'C']);
    });

    test('3.3 — prepend mode accumulates newest-first', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'prepend',
        'sse-limit': '10',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');
      MockEventSource._last._simulateMessage('C');

      expect(el.__ctx.messages).toEqual(['C', 'B', 'A']);
    });

    test('3.4 — sse-limit caps append arrays (oldest dropped from front)', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'append',
        'sse-limit': '2',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');
      MockEventSource._last._simulateMessage('C');

      expect(el.__ctx.messages).toEqual(['B', 'C']);
    });

    test('3.5 — sse-limit caps prepend arrays (oldest dropped from end)', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'prepend',
        'sse-limit': '2',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');
      MockEventSource._last._simulateMessage('C');

      expect(el.__ctx.messages).toEqual(['C', 'B']);
    });

    test('3.6 — sse-limit in replace mode warns and is ignored', () => {
      const { parent, el } = buildDom({
        sse: '/api/ticker',
        as: 'quote',
        'sse-limit': '10',
      });
      processTree(parent);

      expect(warnedWith(warnSpy, 'sse-limit has no effect without sse-insert')).toBe(true);

      MockEventSource._last._simulateMessage({ price: 1 });

      expect(el.__ctx.quote).toEqual({ price: 1 });
      expect(Array.isArray(el.__ctx.quote)).toBe(false);
    });

    test('append without sse-limit warns about unbounded memory growth', () => {
      const { parent } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'append',
      });
      processTree(parent);

      expect(warnedWith(warnSpy, 'unbounded memory growth')).toBe(true);
    });

    test('non-numeric sse-limit warns and is treated as no limit', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'append',
        'sse-limit': 'abc',
      });
      processTree(parent);

      expect(warnedWith(warnSpy, 'not a valid non-negative integer')).toBe(true);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');
      MockEventSource._last._simulateMessage('C');

      expect(el.__ctx.messages).toEqual(['A', 'B', 'C']);
    });

    test('negative sse-limit warns and is treated as no limit', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'messages',
        'sse-insert': 'append',
        'sse-limit': '-5',
      });
      processTree(parent);

      expect(warnedWith(warnSpy, 'not a valid non-negative integer')).toBe(true);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');

      expect(el.__ctx.messages).toEqual(['A', 'B']);
    });

    test('empty-string sse-limit is silently treated as no limit (documented LOW gap)', () => {
      const { parent, el } = buildDom({
        sse: '/api/ticker',
        as: 'quote',
        'sse-limit': '',
      });
      processTree(parent);

      // Known LOW gap: empty string skips the validity warn and defaults to 0.
      expect(warnedWith(warnSpy, 'sse-limit')).toBe(false);

      MockEventSource._last._simulateMessage('A');
      expect(el.__ctx.quote).toBe('A');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-4: Global store integration
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-4 — into store', () => {

    test('4.1 — into store dual-writes (replace) and notifies store watchers', () => {
      const watcher = jest.fn();
      _addStoreWatcher(watcher, 'live');

      const { parent, el } = buildDom({
        sse: '/api/ticker',
        as: 'price',
        into: 'live',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage({ price: 42 });

      expect(el.__ctx.price).toEqual({ price: 42 });
      expect(_stores.live.price).toEqual({ price: 42 });
      expect(watcher).toHaveBeenCalled();
    });

    test('4.2 — into store accumulates arrays in append mode, notifying per message', () => {
      const watcher = jest.fn();
      _addStoreWatcher(watcher, 'feed');
      _stores.feed = createContext({ items: [] });

      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'items',
        into: 'feed',
        'sse-insert': 'append',
        'sse-limit': '10',
      });
      processTree(parent);

      MockEventSource._last._simulateMessage('A');
      MockEventSource._last._simulateMessage('B');

      expect(el.__ctx.items).toEqual(['A', 'B']);
      expect(_stores.feed.items).toEqual(['A', 'B']);
      expect(watcher).toHaveBeenCalledTimes(2);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-5: Reactive URL interpolation
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-5 — reactive URL', () => {

    test('5.1 — URL change closes the old connection, opens a new one, resets data', () => {
      const { parent, el } = buildDom(
        { sse: '/feed/{userId}', as: 'messages', 'sse-insert': 'append', 'sse-limit': '10' },
        '',
        '{ userId: 1 }'
      );
      processTree(parent);

      const first = MockEventSource._last;
      expect(first.url).toBe('/feed/1');

      first._simulateMessage('A');
      expect(el.__ctx.messages).toEqual(['A']);

      parent.__ctx.userId = 2;

      expect(MockEventSource._instances).toHaveLength(2);
      expect(first.closed).toBe(true);
      expect(MockEventSource._last.url).toBe('/feed/2');
      // Accumulated data reset on reconnect
      expect(el.__ctx.messages).toEqual([]);
    });

    test('5.2 — no reconnection when the resolved URL is unchanged', () => {
      const { parent } = buildDom(
        { sse: '/feed/{userId}', as: 'messages' },
        '',
        '{ userId: 1, other: 0 }'
      );
      processTree(parent);

      expect(MockEventSource._instances).toHaveLength(1);

      // Same value → resolved URL unchanged
      parent.__ctx.userId = 1;
      // Unrelated variable change → watcher fires but URL is identical
      parent.__ctx.other = 99;

      expect(MockEventSource._instances).toHaveLength(1);
      expect(MockEventSource._last.closed).toBe(false);
    });

    test('static URL (no interpolation) registers no ancestor watchers', () => {
      const { parent } = buildDom({ sse: '/api/static', as: 'data' });
      processTree(parent);

      parent.__ctx.$set('anything', 1);

      expect(MockEventSource._instances).toHaveLength(1);
    });

    test('URL containing $store registers a store watcher and cleans it up on dispose', () => {
      const { parent } = buildDom(
        { sse: '/feed/{userId}?src=$store.live', as: 'data' },
        '',
        '{ userId: 1 }'
      );
      processTree(parent);

      expect(_storeWatchers.get('live')?.size).toBe(1);

      _disposeTree(parent);

      expect(_storeWatchers.get('live')?.size || 0).toBe(0);
    });

    test('URL containing $route / $i18n registers route & i18n watchers and cleans up on dispose', () => {
      const { parent } = buildDom(
        { sse: '/feed/{userId}?r=$route&l=$i18n', as: 'data' },
        '',
        '{ userId: 1 }'
      );
      processTree(parent);

      expect(_routeWatchers.size).toBe(1);
      expect(_i18nListeners.size).toBe(1);

      _disposeTree(parent);

      expect(_routeWatchers.size).toBe(0);
      expect(_i18nListeners.size).toBe(0);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-6: Error template
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-6 — error template', () => {

    function addErrorTemplate() {
      const tpl = document.createElement('template');
      tpl.id = 'errorTpl';
      tpl.innerHTML = '<p>Connection lost</p>';
      document.body.appendChild(tpl);
    }

    test('6.1 — error template rendered when readyState is CLOSED', () => {
      addErrorTemplate();
      const { parent, el } = buildDom({ sse: '/api/stream', error: 'errorTpl' });
      processTree(parent);

      MockEventSource._last._simulateError(MockEventSource.CLOSED);

      expect(el.textContent).toContain('Connection lost');
      expect(el.__ctx.$sse).toEqual({ connecting: false, open: false, error: true });
    });

    test('6.2 — error template NOT rendered during auto-reconnect (CONNECTING)', () => {
      addErrorTemplate();
      const { parent, el } = buildDom({ sse: '/api/stream', error: 'errorTpl' });
      processTree(parent);

      MockEventSource._last._simulateError(MockEventSource.CONNECTING);

      expect(el.textContent).not.toContain('Connection lost');
      expect(el.__ctx.$sse).toEqual({ connecting: true, open: false, error: false });
    });

    test('terminal error without an error attribute does not throw or render', () => {
      const { parent, el } = buildDom({ sse: '/api/stream' }, '<span>keep</span>');
      processTree(parent);

      expect(() => {
        MockEventSource._last._simulateError(MockEventSource.CLOSED);
      }).not.toThrow();

      expect(el.textContent).toContain('keep');
      expect(el.__ctx.$sse.error).toBe(true);
    });

    test('missing error template id is a no-op (no crash)', () => {
      const { parent, el } = buildDom({ sse: '/api/stream', error: 'doesNotExist' });
      processTree(parent);

      expect(() => {
        MockEventSource._last._simulateError(MockEventSource.CLOSED);
      }).not.toThrow();

      expect(el.__ctx.$sse.error).toBe(true);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-7: $sse connection state
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-7 — $sse state', () => {

    test('7.1 — $sse reflects the full lifecycle', () => {
      const { parent, el } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      // Initial: connecting
      expect(el.__ctx.$sse).toEqual({ connecting: true, open: false, error: false });

      // open event
      MockEventSource._last._simulateOpen();
      expect(el.__ctx.$sse).toEqual({ connecting: false, open: true, error: false });

      // error while auto-reconnecting (CONNECTING) — not terminal
      MockEventSource._last._simulateError(MockEventSource.CONNECTING);
      expect(el.__ctx.$sse).toEqual({ connecting: true, open: false, error: false });

      // terminal error (CLOSED)
      MockEventSource._last._simulateError(MockEventSource.CLOSED);
      expect(el.__ctx.$sse).toEqual({ connecting: false, open: false, error: true });
    });

    test('7.2 — $sse is usable in child bindings (show="$sse.connecting")', () => {
      const { parent, el } = buildDom(
        { sse: '/api/stream' },
        '<span show="$sse.connecting">Reconnecting...</span>'
      );
      processTree(parent);

      const span = el.querySelector('span');
      expect(span.style.display).not.toBe('none');

      MockEventSource._last._simulateOpen();

      expect(span.style.display).toBe('none');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-8: then callback expression
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-8 — then expression', () => {

    test('8.1 — then expression fires once per message', () => {
      const { parent, el } = buildDom(
        { sse: '/api/notifications', as: 'notif', then: 'count = count + 1' },
        '',
        '{ count: 0 }'
      );
      processTree(parent);

      MockEventSource._last._simulateMessage({ n: 1 });
      MockEventSource._last._simulateMessage({ n: 2 });
      MockEventSource._last._simulateMessage({ n: 3 });

      expect(el.__ctx.count).toBe(3);
    });

    test('then expression receives the parsed message as $event', () => {
      const { parent, el } = buildDom(
        { sse: '/api/stream', as: 'data', then: 'last = $event.value' },
        '',
        '{ last: null }'
      );
      processTree(parent);

      MockEventSource._last._simulateMessage({ value: 42 });

      expect(el.__ctx.last).toBe(42);
    });

    test('then expression errors are caught and warned, not thrown', () => {
      const { parent, el } = buildDom({
        sse: '/api/stream',
        as: 'data',
        then: 'notAllowedFn()',
      });
      processTree(parent);

      expect(() => {
        MockEventSource._last._simulateMessage({ ok: 1 });
      }).not.toThrow();

      // _execStatement contains the error internally (Safety Rule 8) and
      // warns "Expression error: ..."; the stream keeps working.
      expect(warnedWith(warnSpy, 'Expression error')).toBe(true);
      expect(warnedWith(warnSpy, 'notAllowedFn')).toBe(true);
      // Data binding still happened despite the broken then expression
      expect(el.__ctx.data).toEqual({ ok: 1 });
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-9: Credentials
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-9 — sse-credentials', () => {

    test('9.1 — sse-credentials sets withCredentials: true', () => {
      const { parent } = buildDom({
        sse: 'https://other-domain.com/stream',
        'sse-credentials': '',
      });
      processTree(parent);

      expect(MockEventSource._last.withCredentials).toBe(true);
    });

    test('withCredentials defaults to false without sse-credentials', () => {
      const { parent } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      expect(MockEventSource._last.withCredentials).toBe(false);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-10: Disposal & disconnection guards
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-10 — disposal & guards', () => {

    test('10.1 — disposal closes the connection', () => {
      const { parent } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      const es = MockEventSource._last;
      expect(es.closed).toBe(false);

      _disposeTree(parent);

      expect(es.closed).toBe(true);
    });

    test('disposal after a reactive URL change closes the CURRENT connection (PR #285 regression)', () => {
      const { parent } = buildDom(
        { sse: '/feed/{userId}', as: 'data' },
        '',
        '{ userId: 1 }'
      );
      processTree(parent);

      // Reactive URL change replaces the EventSource
      parent.__ctx.userId = 2;

      expect(MockEventSource._instances).toHaveLength(2);
      const [first, second] = MockEventSource._instances;
      expect(first.closed).toBe(true);
      expect(second.closed).toBe(false);

      // Disposal must close the connection created AFTER the URL change
      _disposeTree(parent);

      expect(second.closed).toBe(true);
    });

    test('10.2 — message on a disconnected element is ignored and closes the connection', () => {
      const { parent, el } = buildDom({ sse: '/api/stream', as: 'data' });
      processTree(parent);

      const es = MockEventSource._last;
      parent.remove(); // detached without disposal

      es._simulateMessage({ late: true });

      expect(es.closed).toBe(true);
      expect(el.__ctx.data).toBeUndefined();

      _disposeTree(parent); // cleanup origin tracking
    });

    test('open/error events on a disconnected element are ignored (guards)', () => {
      const { parent, el } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      const es = MockEventSource._last;
      parent.remove();

      es._simulateOpen();
      expect(el.__ctx.$sse.open).toBe(false);
      expect(es.closed).toBe(true);

      const es2 = es;
      es2.closed = false; // re-arm to exercise the error guard too
      es2._simulateError(MockEventSource.CLOSED);
      expect(el.__ctx.$sse.error).toBe(false);
      expect(es2.closed).toBe(true);

      _disposeTree(parent);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  US-11: Per-origin connection count warning
  // ═══════════════════════════════════════════════════════════════════════

  describe('US-11 — connection count warning', () => {

    test('11.1 — warns at 6 concurrent connections to the same origin', () => {
      for (let i = 1; i <= 5; i++) {
        const { parent } = buildDom({ sse: `/api/stream-${i}` });
        processTree(parent);
      }
      expect(warnedWith(warnSpy, 'HTTP/1.1')).toBe(false);

      const { parent } = buildDom({ sse: '/api/stream-6' });
      processTree(parent);

      expect(warnedWith(warnSpy, 'connections to')).toBe(true);
      expect(warnedWith(warnSpy, 'HTTP/1.1')).toBe(true);
    });

    test('disposed connections are untracked (no warning after closing)', () => {
      const roots = [];
      for (let i = 1; i <= 5; i++) {
        const { parent } = buildDom({ sse: `/api/a-${i}` });
        processTree(parent);
        roots.push(parent);
      }
      // Free the slots
      roots.forEach((r) => _disposeTree(r));

      for (let i = 1; i <= 5; i++) {
        const { parent } = buildDom({ sse: `/api/b-${i}` });
        processTree(parent);
      }

      expect(warnedWith(warnSpy, 'HTTP/1.1')).toBe(false);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  Edge cases
  // ═══════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {

    test('empty message data is bound as an empty string', () => {
      const { parent, el } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      MockEventSource._last._simulateMessage('');

      expect(el.__ctx.data).toBe('');
    });

    test('malformed JSON falls back to the raw string', () => {
      const { parent, el } = buildDom({ sse: '/api/stream' });
      processTree(parent);

      MockEventSource._last._simulateMessage('{not: valid json');

      expect(el.__ctx.data).toBe('{not: valid json');
    });

    test('rapid message bursts respect sse-limit', () => {
      const { parent, el } = buildDom({
        sse: '/api/feed',
        as: 'items',
        'sse-insert': 'append',
        'sse-limit': '10',
      });
      processTree(parent);

      for (let i = 1; i <= 50; i++) {
        MockEventSource._last._simulateMessage(`m${i}`);
      }

      expect(el.__ctx.items).toHaveLength(10);
      expect(el.__ctx.items[0]).toBe('m41');
      expect(el.__ctx.items[9]).toBe('m50');
    });

    test('unparseable URL falls back to the page origin for tracking (no throw)', () => {
      const { parent } = buildDom({ sse: 'http://' });

      expect(() => processTree(parent)).not.toThrow();
      expect(MockEventSource._instances).toHaveLength(1);
      expect(MockEventSource._last.url).toBe('http://');
    });

    test('lifecycle _log calls fire only in debug mode', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // debug off (default): no SSE logs
      const a = buildDom({ sse: '/api/quiet' });
      processTree(a.parent);
      expect(logSpy.mock.calls.some((c) => c.join(' ').includes('SSE:'))).toBe(false);

      // debug on: connect / open / message / close logs fire
      _config.debug = true;
      const b = buildDom({ sse: '/api/loud' });
      processTree(b.parent);
      MockEventSource._last._simulateOpen();
      MockEventSource._last._simulateMessage('x');
      _disposeTree(b.parent);

      const logged = (substr) =>
        logSpy.mock.calls.some((c) => c.join(' ').includes(substr));
      expect(logged('SSE: connecting to')).toBe(true);
      expect(logged('SSE: connection opened')).toBe(true);
      expect(logged('SSE: message received on')).toBe(true);
      expect(logged('SSE: closing connection')).toBe(true);

      logSpy.mockRestore();
    });
  });
});
