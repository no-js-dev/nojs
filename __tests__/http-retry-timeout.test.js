import { _config, _eventBus, _interceptors, _stores, _CANCEL } from '../src/globals.js';
import { processTree, _disposeTree } from '../src/registry.js';
import { _doFetch } from '../src/fetch.js';

// Side-effect imports: register built-in directives needed for tests
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/http.js';

// ═══════════════════════════════════════════════════════════════════════
//  HTTP RETRY POLICY + TIMEOUT / CANCEL SETTLEMENT
//
//  NOJS-HTTP-007: only network failures and 5xx are retried (4xx are
//  final), and an explicit retry="0" disables retries for one element.
//  NOJS-HTTP-006: a timed-out or interceptor-cancelled request settles the
//  directive (error template + fetch:error); only the element's own abort
//  (switch-map / dispose) stays silent.
// ═══════════════════════════════════════════════════════════════════════

describe('HTTP retry policy and timeout/cancel settlement', () => {
  let originalFetch;
  let errors;

  beforeEach(() => {
    originalFetch = global.fetch;
    document.body.innerHTML = '';
    _config.baseApiUrl = '';
    _config.headers = {};
    _config.csrf = null;
    _config.retries = 0;
    _config.retryDelay = 1000;
    _config.timeout = 10000;
    _config.cache = { strategy: 'none', ttl: 300000 };
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
    Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
    errors = [];
    _eventBus['fetch:error'] = [(e) => errors.push(e)];
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    console.warn.mockRestore();
    global.fetch = originalFetch;
    document.body.innerHTML = '';
    _config.retries = 0;
    _config.retryDelay = 1000;
    _config.timeout = 10000;
    _interceptors.request.length = 0;
    Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  function errorResponse(status) {
    return {
      ok: false,
      status,
      json: () => Promise.resolve({}),
    };
  }

  // A fetch that never answers; it only rejects when its signal aborts.
  function hangingFetch() {
    return jest.fn((url, opts) => new Promise((_, reject) => {
      opts.signal.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    }));
  }

  function mount(attrs) {
    document.body.innerHTML = `
      <template id="spin"><p class="spin">Loading</p></template>
      <template id="err" var="err"><p class="err" bind="err.message"></p></template>
      <div state="{}"><div id="t" ${attrs}><span class="orig">original</span></div></div>`;
    const root = document.body.querySelector('[state]');
    processTree(root);
    return { root, el: document.getElementById('t') };
  }

  function flush(ms = 10) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ── NOJS-HTTP-007: retry policy ───────────────────────────────────────

  // NOJS-HTTP-007 — flipped to test() by the fix commit
  test.failing('1 — 4xx responses are not retried', async () => {
    global.fetch = jest.fn().mockResolvedValue(errorResponse(404));

    await expect(_doFetch('/api/x', 'GET', null, {}, null, null, 2, 1))
      .rejects.toMatchObject({ status: 404 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('2 — 5xx responses are retried `retries` times', async () => {
    global.fetch = jest.fn().mockResolvedValue(errorResponse(503));

    await expect(_doFetch('/api/x', 'GET', null, {}, null, null, 2, 1))
      .rejects.toMatchObject({ status: 503 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('3 — POST 5xx is still retried (documented: 5xx retried for any method)', async () => {
    global.fetch = jest.fn().mockResolvedValue(errorResponse(500));

    await expect(_doFetch('/api/orders', 'POST', { item: 1 }, {}, null, null, 1, 1))
      .rejects.toMatchObject({ status: 500 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  // NOJS-HTTP-007 — flipped to test() by the fix commit
  test.failing('4 — retry="0" makes exactly one attempt despite a global retries', async () => {
    _config.retries = 2;
    _config.retryDelay = 1;
    global.fetch = jest.fn().mockResolvedValue(errorResponse(503));

    mount('get="/api/x" retry="0" error="#err"');
    await flush(50);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(errors.length).toBe(1);
  });

  // ── NOJS-HTTP-006: timeout / CANCEL settle the directive ──────────────

  // NOJS-HTTP-006 — flipped to test() by the fix commit
  test.failing('5 — a timeout is retried, then renders the error template and emits fetch:error', async () => {
    jest.useFakeTimers();
    _config.timeout = 50;
    global.fetch = hangingFetch();

    const { el } = mount('get="/api/slow" retry="1" retry-delay="10" loading="#spin" error="#err"');
    await jest.advanceTimersByTimeAsync(10);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.spin')).not.toBeNull();

    await jest.advanceTimersByTimeAsync(200);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(el.querySelector('.spin')).toBeNull();
    expect(el.querySelector('.err')).not.toBeNull();
    expect(el.querySelector('.err').textContent).toBe('Request timed out');
    expect(errors.length).toBe(1);
  });

  // NOJS-HTTP-006 — flipped to test() by the fix commit
  test.failing('6 — NoJS.CANCEL sends no request, removes loading and renders the error template', async () => {
    global.fetch = jest.fn();
    _interceptors.request.push(() => ({ [_CANCEL]: true }));

    const { el } = mount('get="/api/x" loading="#spin" error="#err"');
    await flush(20);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(el.querySelector('.spin')).toBeNull();
    expect(el.querySelector('.err')).not.toBeNull();
    expect(errors.length).toBe(1);
  });

  test('7 — disposing the element aborts the request silently', async () => {
    global.fetch = hangingFetch();

    const { root, el } = mount('get="/api/slow" retry="2" retry-delay="1" loading="#spin" error="#err"');
    await flush(10);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    _disposeTree(root);
    await flush(30);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(el.querySelector('.err')).toBeNull();
    expect(errors.length).toBe(0);
  });
});
