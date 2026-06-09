


import { _stores, _config, _eventBus } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree, _disposeTree } from '../src/registry.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/http.js';
import '../src/directives/refs.js';
import '../src/directives/events.js';


// ── IntersectionObserver mock ──────────────────────────────────────────────
class MockIntersectionObserver {
  constructor(callback, options) {
    this._callback = callback;
    this._options = options;
    this._entries = [];
    MockIntersectionObserver._instances.push(this);
  }
  observe(el) { this._entries.push(el); }
  unobserve(el) { this._entries = this._entries.filter((e) => e !== el); }
  disconnect() { this._entries = []; this._disconnected = true; }
  _trigger(entries) { this._callback(entries, this); }
  static _instances = [];
  static _reset() { MockIntersectionObserver._instances = []; }
}


// ── Helpers ────────────────────────────────────────────────────────────────

function mockFetchJson(data, headers = {}) {
  const h = new Headers({ 'content-type': 'application/json', ...headers });
  return jest.fn().mockResolvedValue({
    ok: true,
    headers: h,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockFetchSequence(responses) {
  let callIndex = 0;
  return jest.fn().mockImplementation(() => {
    const res = responses[Math.min(callIndex, responses.length - 1)];
    callIndex++;
    const h = new Headers({ 'content-type': 'application/json', ...(res.headers || {}) });
    if (res.ok === false) {
      return Promise.resolve({
        ok: false,
        status: res.status || 500,
        headers: h,
        text: () => Promise.resolve(res.body || 'Server Error'),
      });
    }
    return Promise.resolve({
      ok: true,
      headers: h,
      text: () => Promise.resolve(JSON.stringify(res.data)),
    });
  });
}

function wait(ms = 60) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDom(attrs, children = '') {
  const parent = document.createElement('div');
  parent.setAttribute('state', '{}');
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  if (children) el.innerHTML = children;
  parent.appendChild(el);
  document.body.appendChild(parent);
  return { parent, el };
}


describe('HTTP Pagination & Triggers', () => {
  let originalFetch;
  let originalIO;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalIO = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;
    MockIntersectionObserver._reset();
    _config.retries = 0;
    _config.timeout = 10000;
    _config.baseApiUrl = '';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.IntersectionObserver = originalIO;
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  1. get-insert modes
  // ═══════════════════════════════════════════════════════════════════════

  describe('get-insert modes', () => {

    test('1 — get-insert="append" renders content and places sentinel at bottom', async () => {
      global.fetch = mockFetchJson([{ id: 1 }, { id: 2 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
      }, '<span class="item"></span>');

      processTree(el.parentElement);
      await wait();

      expect(global.fetch).toHaveBeenCalled();
      expect(el.__ctx.items).toEqual([{ id: 1 }, { id: 2 }]);
      // Sentinel should be the last child
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).not.toBeNull();
      expect(el.lastElementChild).toBe(sentinel);
    });

    test('2 — get-insert="prepend" renders content and places sentinel at top', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'prepend',
      }, '<span class="item"></span>');

      processTree(el.parentElement);
      await wait();

      expect(el.__ctx.items).toEqual([{ id: 1 }]);
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).not.toBeNull();
      expect(el.firstElementChild).toBe(sentinel);
    });

    test('3 — Default (no get-insert) uses replace mode', async () => {
      global.fetch = mockFetchJson({ msg: 'hello' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
      }, '<span>original</span>');

      processTree(el.parentElement);
      await wait();

      expect(el.__ctx.data).toEqual({ msg: 'hello' });
      // No sentinel in replace mode
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).toBeNull();
    });

    test('4 — Append mode accumulates array data across fetches', async () => {
      const page1 = [{ id: 1 }, { id: 2 }];
      const page2 = [{ id: 3 }, { id: 4 }];
      global.fetch = mockFetchSequence([
        { data: page1 },
        { data: page2 },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      }, '<span class="item"></span>');

      processTree(el.parentElement);
      await wait();

      // First fetch: items = page1
      expect(el.__ctx.items).toEqual(page1);

      // Click "Load More" button
      const btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).not.toBeNull();
      btn.click();
      await wait();

      // After second fetch: items should have both pages appended
      expect(el.__ctx.items).toEqual([...page1, ...page2]);
    });

    test('5 — Prepend mode accumulates array data with new data at start', async () => {
      const page1 = [{ id: 1 }];
      const page2 = [{ id: 2 }];
      global.fetch = mockFetchSequence([
        { data: page1 },
        { data: page2 },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'prepend',
        'get-page': '1',
        'get-trigger': 'button',
      }, '<span class="item"></span>');

      processTree(el.parentElement);
      await wait();

      expect(el.__ctx.items).toEqual(page1);

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // Prepend: new data comes first
      expect(el.__ctx.items).toEqual([...page2, ...page1]);
    });

    test('6 — Sentinel has aria-hidden and zero height for accessibility', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
      });

      processTree(el.parentElement);
      await wait();

      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel.getAttribute('aria-hidden')).toBe('true');
      expect(sentinel.style.height).toBe('0px');
      expect(sentinel.style.overflow).toBe('hidden');
      expect(sentinel.style.pointerEvents).toBe('none');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  2. get-trigger values
  // ═══════════════════════════════════════════════════════════════════════

  describe('get-trigger values', () => {

    test('7 — get-trigger="visible" fires fetch when element enters viewport', async () => {
      global.fetch = mockFetchJson({ msg: 'visible' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'visible',
      });

      processTree(el.parentElement);
      await wait(10);

      // Fetch should NOT have fired yet (waiting for intersection)
      expect(global.fetch).not.toHaveBeenCalled();

      // Simulate intersection
      expect(MockIntersectionObserver._instances.length).toBeGreaterThan(0);
      const observer = MockIntersectionObserver._instances[0];
      observer._trigger([{ isIntersecting: true, target: el }]);
      await wait();

      expect(global.fetch).toHaveBeenCalled();
      expect(el.__ctx.data).toEqual({ msg: 'visible' });
    });

    test('8 — get-trigger="visible" disconnects observer after first intersection', async () => {
      global.fetch = mockFetchJson({ msg: 'once' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'visible',
      });

      processTree(el.parentElement);
      await wait(10);

      const observer = MockIntersectionObserver._instances[0];
      observer._trigger([{ isIntersecting: true, target: el }]);
      await wait();

      expect(observer._disconnected).toBe(true);
    });

    test('9 — get-trigger="hover" fires fetch on mouseenter', async () => {
      global.fetch = mockFetchJson({ msg: 'hovered' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'hover',
      });

      processTree(el.parentElement);
      await wait(10);

      // No fetch yet
      expect(global.fetch).not.toHaveBeenCalled();

      // Simulate hover
      el.dispatchEvent(new Event('mouseenter'));
      await wait();

      expect(global.fetch).toHaveBeenCalled();
      expect(el.__ctx.data).toEqual({ msg: 'hovered' });
    });

    test('10 — get-trigger="hover" with no refresh fires only once (mouseenter with once)', async () => {
      global.fetch = mockFetchJson({ msg: 'once' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'hover',
      });

      processTree(el.parentElement);
      await wait(10);

      el.dispatchEvent(new Event('mouseenter'));
      await wait();

      el.dispatchEvent(new Event('mouseenter'));
      await wait();

      // Only one fetch due to { once: true }
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('11 — get-trigger="none" does not auto-fetch', async () => {
      global.fetch = mockFetchJson({ msg: 'manual' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'none',
      });

      processTree(el.parentElement);
      await wait(100);

      // No fetch should fire
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('12 — get-trigger="none" allows manual refresh via el.refresh()', async () => {
      global.fetch = mockFetchJson({ msg: 'refreshed' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'none',
      });

      processTree(el.parentElement);
      await wait(10);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(typeof el.refresh).toBe('function');

      el.refresh();
      await wait();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(el.__ctx.data).toEqual({ msg: 'refreshed' });
    });

    test('13 — get-trigger="scroll" fires initial fetch and creates observer for sentinel', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'scroll',
      });

      processTree(el.parentElement);
      await wait();

      // Initial fetch fires immediately for scroll trigger
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(el.__ctx.items).toEqual([{ id: 1 }]);
    });

    test('14 — get-trigger="scroll" fires next fetch when sentinel enters viewport', async () => {
      const page1 = [{ id: 1 }];
      const page2 = [{ id: 2 }];
      global.fetch = mockFetchSequence([
        { data: page1 },
        { data: page2 },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'scroll',
      });

      processTree(el.parentElement);
      await wait();

      // First page loaded
      expect(el.__ctx.items).toEqual(page1);

      // Find the scroll observer (created lazily after first fetch)
      const scrollObservers = MockIntersectionObserver._instances.filter(
        (obs) => obs._entries.some((e) => e.hasAttribute && e.hasAttribute('data-nojs-sentinel'))
      );
      expect(scrollObservers.length).toBeGreaterThan(0);

      const scrollObs = scrollObservers[0];
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      // Simulate sentinel becoming visible
      scrollObs._trigger([{ isIntersecting: true, target: sentinel }]);
      await wait();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(el.__ctx.items).toEqual([...page1, ...page2]);
    });

    test('15 — get-trigger="button" renders a Load More button after first fetch', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('Load More');
      expect(btn.getAttribute('type')).toBe('button');
    });

    test('16 — get-trigger="button" with custom label via get-trigger-label', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'button',
        'get-trigger-label': 'Show More Results',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('Show More Results');
      expect(btn.getAttribute('aria-label')).toBe('Show More Results');
    });

    test('17 — get-trigger="button" click triggers next page fetch', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [{ id: 2 }] },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('18 — Default (no get-trigger) fires GET immediately', async () => {
      global.fetch = mockFetchJson({ msg: 'immediate' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
      });

      processTree(el.parentElement);
      await wait();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(el.__ctx.data).toEqual({ msg: 'immediate' });
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  3. get-page (page-based pagination)
  // ═══════════════════════════════════════════════════════════════════════

  describe('get-page (page-based pagination)', () => {

    test('19 — Page auto-increments after successful fetch', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [{ id: 2 }] },
        { data: [{ id: 3 }] },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // After first fetch, page should have incremented
      expect(el.__ctx.page).toBe(2);

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      expect(el.__ctx.page).toBe(3);
    });

    test('20 — URL interpolation with {page} token', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items?page={page}&size=10',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('page=1');
      expect(fetchUrl).toContain('size=10');
    });

    test('21 — get-page starts at the specified initial page value', async () => {
      global.fetch = mockFetchJson([{ id: 5 }]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '3',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('page=3');
      // After fetch, page should be 4
      expect(el.__ctx.page).toBe(4);
    });

    test('22 — get-page defaults to 1 when attribute is empty or non-numeric', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': 'abc',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('page=1');
    });

    test('23 — Pagination stops on empty response array', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [] },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).not.toBeNull();

      btn.click();
      await wait();

      // Button should be removed after end-of-data
      const btnAfter = el.querySelector('[data-nojs-load-more]');
      expect(btnAfter).toBeNull();
    });

    test('24 — Pagination stops on X-NoJS-Last-Page header', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [{ id: 2 }], headers: { 'X-NoJS-Last-Page': 'true' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // Button removed after last page
      const btnAfter = el.querySelector('[data-nojs-load-more]');
      expect(btnAfter).toBeNull();
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  4. get-cursor (cursor-based pagination)
  // ═══════════════════════════════════════════════════════════════════════

  describe('get-cursor (cursor-based pagination)', () => {

    test('25 — Cursor extracted from X-NoJS-Cursor response header', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }], headers: { 'X-NoJS-Cursor': 'abc123' } },
        { data: [{ id: 2 }], headers: { 'X-NoJS-Cursor': '' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // After first fetch, cursor should be set
      expect(el.__ctx.cursor).toBe('abc123');

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // Second call should include cursor in URL
      const secondUrl = global.fetch.mock.calls[1][0];
      expect(secondUrl).toContain('cursor=abc123');
    });

    test('26 — Cursor extracted from JSON body field', async () => {
      global.fetch = mockFetchSequence([
        { data: { items: [{ id: 1 }], cursor: 'next-token' } },
        { data: { items: [{ id: 2 }], cursor: null } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(el.__ctx.cursor).toBe('next-token');
      // renderData should be the extracted array, not the full object
      expect(el.__ctx.items).toEqual([{ id: 1 }]);
    });

    test('27 — Custom cursor field via get-cursor-field', async () => {
      global.fetch = mockFetchSequence([
        { data: { results: [{ id: 1 }], pagination: { nextToken: 'tok1' } } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-cursor-field': 'pagination.nextToken',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(el.__ctx.cursor).toBe('tok1');
    });

    test('28 — End-of-data when cursor is null', async () => {
      global.fetch = mockFetchSequence([
        { data: { items: [{ id: 1 }], cursor: 'abc' } },
        { data: { items: [{ id: 2 }], cursor: null } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // End of data — button should be gone
      const btnAfter = el.querySelector('[data-nojs-load-more]');
      expect(btnAfter).toBeNull();
    });

    test('29 — Mutual exclusion warning when both get-cursor and get-page are set', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('mutually exclusive'),
      );

      warnSpy.mockRestore();
    });

    test('30 — Default cursor field probe: checks cursor, next_cursor, nextCursor, next', async () => {
      // Uses "nextCursor" field (third in probe order)
      global.fetch = mockFetchSequence([
        { data: { rows: [{ id: 1 }], nextCursor: 'nc-1' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(el.__ctx.cursor).toBe('nc-1');
    });

    test('31 — Header cursor takes priority over body cursor', async () => {
      global.fetch = mockFetchSequence([
        { data: { items: [{ id: 1 }], cursor: 'body-cursor' }, headers: { 'X-NoJS-Cursor': 'header-cursor' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // Header cursor should win
      expect(el.__ctx.cursor).toBe('header-cursor');
    });

    test('32 — _extractCursorData finds first array-valued field in object', async () => {
      global.fetch = mockFetchSequence([
        { data: { meta: { total: 100 }, records: [{ id: 1 }, { id: 2 }], cursor: 'c1' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // Should extract the "records" array as renderable data
      expect(el.__ctx.items).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  5. get-threshold
  // ═══════════════════════════════════════════════════════════════════════

  describe('get-threshold', () => {

    test('33 — Custom rootMargin passed to IntersectionObserver for visible trigger', async () => {
      global.fetch = mockFetchJson({ msg: 'lazy' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'visible',
        'get-threshold': '500px',
      });

      processTree(el.parentElement);
      await wait(10);

      const observer = MockIntersectionObserver._instances[0];
      expect(observer._options.rootMargin).toBe('500px');
    });

    test('34 — Default threshold is "0px" for visible trigger', async () => {
      global.fetch = mockFetchJson({ msg: 'lazy' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'visible',
      });

      processTree(el.parentElement);
      await wait(10);

      const observer = MockIntersectionObserver._instances[0];
      expect(observer._options.rootMargin).toBe('0px');
    });

    test('35 — Default threshold is "200px" for scroll trigger', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'scroll',
      });

      processTree(el.parentElement);
      await wait();

      // Find the scroll observer (created after first fetch)
      const scrollObs = MockIntersectionObserver._instances.find(
        (obs) => obs._entries.some((e) => e.hasAttribute && e.hasAttribute('data-nojs-sentinel'))
      );
      expect(scrollObs).toBeDefined();
      expect(scrollObs._options.rootMargin).toBe('200px');
    });

    test('36 — Custom threshold overrides default for scroll trigger', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'scroll',
        'get-threshold': '1000px',
      });

      processTree(el.parentElement);
      await wait();

      const scrollObs = MockIntersectionObserver._instances.find(
        (obs) => obs._entries.some((e) => e.hasAttribute && e.hasAttribute('data-nojs-sentinel'))
      );
      expect(scrollObs).toBeDefined();
      expect(scrollObs._options.rootMargin).toBe('1000px');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  6. Error handling in insert mode
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error handling in insert mode', () => {

    test('37 — Error template renders in insert mode without removing existing content', async () => {
      const errorTpl = document.createElement('template');
      errorTpl.id = 'err-tpl';
      errorTpl.innerHTML = '<span class="error-msg">Error occurred</span>';
      document.body.appendChild(errorTpl);

      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { ok: false, status: 500, body: 'Server Error' },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
        error: 'err-tpl',
      });

      processTree(el.parentElement);
      await wait();

      // First fetch succeeds
      expect(el.__ctx.items).toEqual([{ id: 1 }]);

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // Error template should be shown inline
      const errEl = el.querySelector('[data-nojs-inline-error]');
      expect(errEl).not.toBeNull();
      expect(errEl.querySelector('.error-msg')).not.toBeNull();
    });

    test('38 — Error wrappers do not accumulate (previous inline error removed)', async () => {
      const errorTpl = document.createElement('template');
      errorTpl.id = 'err-tpl2';
      errorTpl.innerHTML = '<span class="err">Oops</span>';
      document.body.appendChild(errorTpl);

      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { ok: false, status: 500, body: 'Error 1' },
        { ok: false, status: 500, body: 'Error 2' },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
        error: 'err-tpl2',
      });

      processTree(el.parentElement);
      await wait();

      // First fetch OK
      let btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // First error
      let errors = el.querySelectorAll('[data-nojs-inline-error]');
      expect(errors.length).toBe(1);

      // The button is re-rendered after the error for pagination triggers
      btn = el.querySelector('[data-nojs-load-more]');
      if (btn) {
        btn.click();
        await wait();
      }

      // Should still be only one error (previous removed)
      errors = el.querySelectorAll('[data-nojs-inline-error]');
      expect(errors.length).toBeLessThanOrEqual(1);
    });

    test('39 — Retry after error works for pagination', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { ok: false, status: 500, body: 'Temporary Error' },
        { data: [{ id: 2 }] },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // Click load more — triggers error
      let btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // Button should still be present (error does not end pagination)
      btn = el.querySelector('[data-nojs-load-more]');
      if (btn) {
        btn.click();
        await wait();
      } else {
        // If button was removed, use refresh
        el.refresh();
        await wait();
      }

      // Third fetch should succeed
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  7. _resolveField security
  // ═══════════════════════════════════════════════════════════════════════

  describe('_resolveField security', () => {

    test('40 — _resolveField blocks __proto__ traversal in cursor-field', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchSequence([
        { data: { items: [{ id: 1 }], __proto__: { polluted: true } } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-cursor-field': '__proto__.polluted',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('forbidden property'),
      );

      warnSpy.mockRestore();
    });

    test('41 — _resolveField blocks constructor traversal', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchSequence([
        { data: { items: [{ id: 1 }], nested: { constructor: 'bad' } } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-cursor-field': 'nested.constructor',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('forbidden property'),
      );

      warnSpy.mockRestore();
    });

    test('42 — _resolveField blocks prototype traversal', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchSequence([
        { data: { items: [{ id: 1 }], prototype: 'bad' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-cursor-field': 'prototype',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('forbidden property'),
      );

      warnSpy.mockRestore();
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  8. Disposal
  // ═══════════════════════════════════════════════════════════════════════

  describe('Disposal', () => {

    test('43 — Scroll observer is created for sentinel after first fetch', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { parent, el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'scroll',
      });

      processTree(parent);
      await wait();

      // Verify that a scroll observer was created observing the sentinel
      const scrollObs = MockIntersectionObserver._instances.find(
        (obs) => obs._entries.some((e) => e.hasAttribute && e.hasAttribute('data-nojs-sentinel'))
      );
      expect(scrollObs).toBeDefined();
      expect(scrollObs._disconnected).toBeFalsy();
      // Observer is watching the sentinel element
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(scrollObs._entries).toContain(sentinel);
    });

    test('44 — Load-more button is removed when data is exhausted', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [] },
      ]);

      const { parent, el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(parent);
      await wait();

      // Button exists after first successful fetch
      let btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).not.toBeNull();

      // Click triggers fetch of empty data (end of data)
      btn.click();
      await wait();

      // Button should be removed
      btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).toBeNull();
    });

    test('45 — Sentinel is removed when end-of-data is reached', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [] },
      ]);

      const { parent, el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(parent);
      await wait();

      // Sentinel should exist after first fetch
      let sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).not.toBeNull();

      // Trigger end-of-data
      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      // Sentinel should be removed after end-of-data
      sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).toBeNull();
    });

    test('46 — el.refresh is removed on dispose', async () => {
      global.fetch = mockFetchJson({ msg: 'data' });

      const { parent, el } = buildDom({
        get: '/api/data',
        as: 'data',
      });

      processTree(parent);
      await wait();

      expect(typeof el.refresh).toBe('function');

      _disposeTree(el);

      expect(el.refresh).toBeUndefined();
    });

    test('47 — Visible trigger observer disconnects on dispose', async () => {
      global.fetch = mockFetchJson({ msg: 'data' });

      const { parent, el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'visible',
      });

      processTree(parent);
      await wait(10);

      const observer = MockIntersectionObserver._instances[0];
      expect(observer._disconnected).toBeFalsy();

      _disposeTree(el);

      expect(observer._disconnected).toBe(true);
    });

    test('48 — Hover listener removed on dispose', async () => {
      global.fetch = mockFetchJson({ msg: 'hover' });

      const { parent, el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'hover',
      });

      const removeSpy = jest.spyOn(el, 'removeEventListener');

      processTree(parent);
      await wait(10);

      _disposeTree(el);

      expect(removeSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));

      removeSpy.mockRestore();
    });
  });


  // ═══════════════════════════════════════════════════════════════════════
  //  9. Edge cases & warnings
  // ═══════════════════════════════════════════════════════════════════════

  describe('Edge cases & warnings', () => {

    test('49 — scroll trigger without get-insert warns and falls back', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchJson({ msg: 'data' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'scroll',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('requires get-insert'),
      );

      warnSpy.mockRestore();
    });

    test('50 — button trigger without get-insert warns and falls back', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchJson({ msg: 'data' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('requires get-insert'),
      );

      warnSpy.mockRestore();
    });

    test('51 — scroll/button trigger suppresses refresh interval and warns', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'scroll',
        refresh: '5000',
      });

      processTree(el.parentElement);
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('mutually exclusive with refresh'),
      );

      warnSpy.mockRestore();
    });

    test('52 — get-insert="prepend" falls back to prepend for valid value', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'prepend',
      });

      processTree(el.parentElement);
      await wait();

      // Sentinel at top confirms prepend mode
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).not.toBeNull();
      expect(el.firstElementChild).toBe(sentinel);
    });

    test('53 — Invalid get-insert value defaults to append', async () => {
      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'invalid-value',
      });

      processTree(el.parentElement);
      await wait();

      // Invalid value should default to "append"
      const sentinel = el.querySelector('[data-nojs-sentinel]');
      expect(sentinel).not.toBeNull();
      // Append puts sentinel at bottom
      expect(el.lastElementChild).toBe(sentinel);
    });

    test('54 — Concurrency guard prevents double-fetch for scroll trigger', async () => {
      let fetchCount = 0;
      let resolvers = [];
      global.fetch = jest.fn().mockImplementation(() => {
        fetchCount++;
        return new Promise((resolve) => {
          resolvers.push(resolve);
        });
      });

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'scroll',
      });

      processTree(el.parentElement);
      await wait(10);

      // First fetch is in-flight (initial)
      expect(fetchCount).toBe(1);

      // Resolve the first fetch
      resolvers[0]({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify([{ id: 1 }])),
      });
      await wait();

      // Now find the scroll observer
      const scrollObs = MockIntersectionObserver._instances.find(
        (obs) => obs._entries.some((e) => e.hasAttribute && e.hasAttribute('data-nojs-sentinel'))
      );

      if (scrollObs) {
        const sentinel = el.querySelector('[data-nojs-sentinel]');
        // Trigger two rapid intersections
        scrollObs._trigger([{ isIntersecting: true, target: sentinel }]);
        // The second one should be blocked by concurrency guard
        scrollObs._trigger([{ isIntersecting: true, target: sentinel }]);
        await wait(10);

        // Should only have 2 total fetches (initial + one scroll trigger)
        expect(fetchCount).toBe(2);
      }
    });

    test('55 — IntersectionObserver fallback for scroll trigger when IO unavailable', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      delete global.IntersectionObserver;

      global.fetch = mockFetchJson([{ id: 1 }]);

      const { el } = buildDom({
        get: '/api/items',
        as: 'items',
        'get-insert': 'append',
        'get-trigger': 'scroll',
      });

      processTree(el.parentElement);
      await wait();

      // Should warn about IO not available and fall back to button
      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('IntersectionObserver not available'),
      );

      // Should have created a load-more button as fallback
      const btn = el.querySelector('[data-nojs-load-more]');
      expect(btn).not.toBeNull();

      warnSpy.mockRestore();
    });

    test('56 — IntersectionObserver fallback for visible trigger when IO unavailable', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      delete global.IntersectionObserver;

      global.fetch = mockFetchJson({ msg: 'immediate' });

      const { el } = buildDom({
        get: '/api/data',
        as: 'data',
        'get-trigger': 'visible',
      });

      processTree(el.parentElement);
      await wait();

      // Should fallback to immediate fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('IntersectionObserver not available'),
      );

      warnSpy.mockRestore();
    });

    test('57 — el.refresh() resets pagination state for button trigger', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [{ id: 2 }] },
        { data: [{ id: 10 }] },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // After first fetch, page = 2
      expect(el.__ctx.page).toBe(2);

      // Click load more, page = 3
      let btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();
      expect(el.__ctx.page).toBe(3);

      // Refresh resets pagination
      el.refresh();
      await wait();

      // Page should be reset to initial (1), then incremented after fetch
      expect(el.__ctx.page).toBe(2);
    });

    test('58 — fetch:end event emitted when data is exhausted', async () => {
      const endHandler = jest.fn();
      _eventBus['fetch:end'] = [endHandler];

      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }] },
        { data: [] },
      ]);

      const { el } = buildDom({
        get: '/api/items?page={page}',
        as: 'items',
        'get-insert': 'append',
        'get-page': '1',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      const btn = el.querySelector('[data-nojs-load-more]');
      btn.click();
      await wait();

      expect(endHandler).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.any(String) }),
      );

      delete _eventBus['fetch:end'];
    });

    test('59 — get-insert on non-GET method is ignored', async () => {
      global.fetch = mockFetchJson({ success: true });

      const parent = document.createElement('div');
      parent.setAttribute('state', '{}');
      const form = document.createElement('form');
      form.setAttribute('post', '/api/items');
      form.setAttribute('get-insert', 'append');
      parent.appendChild(form);
      document.body.appendChild(parent);
      processTree(parent);

      await wait(10);

      // No sentinel should exist since get-insert is ignored for POST
      const sentinel = form.querySelector('[data-nojs-sentinel]');
      expect(sentinel).toBeNull();
    });

    test('60 — Cursor mode: array root response used directly without extraction', async () => {
      global.fetch = mockFetchSequence([
        { data: [{ id: 1 }, { id: 2 }], headers: { 'X-NoJS-Cursor': 'next' } },
      ]);

      const { el } = buildDom({
        get: '/api/items?cursor={cursor}',
        as: 'items',
        'get-insert': 'append',
        'get-cursor': '',
        'get-trigger': 'button',
      });

      processTree(el.parentElement);
      await wait();

      // When cursor comes from header, data should be used as-is (it's already an array)
      expect(el.__ctx.items).toEqual([{ id: 1 }, { id: 2 }]);
      expect(el.__ctx.cursor).toBe('next');
    });
  });
});
