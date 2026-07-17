import { _stores, _config, _onDispose } from '../src/globals.js';
import { processTree, _disposeTree } from '../src/registry.js';

// Side-effect imports: register built-in directives needed for tests
import '../src/directives/state.js';
import '../src/directives/conditionals.js';
import '../src/directives/http.js';
import '../src/directives/binding.js';

// ═══════════════════════════════════════════════════════════════════════
//  HTTP GATE TESTS
//
//  Verifies that HTTP verb directives (get, post, put, patch, delete)
//  registered with `gated: true` are properly gated by a same-element
//  `if` condition.  Finding 16: un-gated network requests when `if` is
//  falsy must produce zero network activity.
// ═══════════════════════════════════════════════════════════════════════

describe('HTTP Gate — if-gated HTTP verbs', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.baseApiUrl = '';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  function mockFetch(data) {
    return jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  }

  function buildGetFixture(stateObj) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', JSON.stringify(stateObj));
    const el = document.createElement('div');
    el.setAttribute('if', Object.keys(stateObj)[0]);
    el.setAttribute('get', '/api/users');
    el.setAttribute('as', 'users');
    el.textContent = 'placeholder';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    return { wrapper, el };
  }

  function flush(ms = 10) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ── Finding 16 repro: falsy if + get performs 0 fetches ──────────────

  test('1 — falsy if + get performs zero fetches (Finding 16)', async () => {
    global.fetch = mockFetch([{ id: 1, name: 'Alice' }]);

    const { wrapper } = buildGetFixture({ active: false });
    processTree(wrapper);

    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('2 — falsy if + post performs zero fetches', async () => {
    global.fetch = mockFetch({ success: true });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ active: false }');
    const form = document.createElement('form');
    form.setAttribute('if', 'active');
    form.setAttribute('post', '/api/submit');
    form.setAttribute('as', 'result');
    wrapper.appendChild(form);
    document.body.appendChild(wrapper);

    processTree(wrapper);
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('3 — falsy if + put performs zero fetches', async () => {
    global.fetch = mockFetch({ updated: true });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ active: false }');
    const el = document.createElement('div');
    el.setAttribute('if', 'active');
    el.setAttribute('put', '/api/item/1');
    el.setAttribute('as', 'result');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('4 — falsy if + patch performs zero fetches', async () => {
    global.fetch = mockFetch({ patched: true });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ active: false }');
    const el = document.createElement('div');
    el.setAttribute('if', 'active');
    el.setAttribute('patch', '/api/item/1');
    el.setAttribute('as', 'result');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('5 — falsy if + delete performs zero fetches', async () => {
    global.fetch = mockFetch({ deleted: true });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ active: false }');
    const el = document.createElement('div');
    el.setAttribute('if', 'active');
    el.setAttribute('delete', '/api/item/1');
    el.setAttribute('as', 'result');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ── Flip-true: exactly 1 fetch fires ────────────────────────────────

  test('6 — flip-true fires exactly 1 GET fetch', async () => {
    global.fetch = mockFetch([{ id: 1, name: 'Alice' }]);

    const { wrapper } = buildGetFixture({ active: false });
    processTree(wrapper);

    await flush();
    expect(global.fetch).not.toHaveBeenCalled();

    // Flip to true — gate activates the get directive
    wrapper.__ctx.active = true;
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users');
  });

  // ── Flip-false: disposal prevents further fetches ───────────────────

  test('7 — flip-false disposes in-flight state and prevents further fetches', async () => {
    // Use a delayed fetch to simulate in-flight request
    let resolveRequest;
    global.fetch = jest.fn().mockImplementation(
      () => new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { wrapper } = buildGetFixture({ active: false });
    processTree(wrapper);

    // Activate — starts the fetch
    wrapper.__ctx.active = true;
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Deactivate while request is in-flight
    wrapper.__ctx.active = false;
    await flush();

    // Resolve the in-flight request after deactivation
    if (resolveRequest) {
      resolveRequest({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([{ id: 1 }])),
      });
    }
    await flush();

    // No further fetches should fire
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('8 — flip-false clears poll intervals (no further fetches)', async () => {
    let fetchCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      fetchCount++;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([{ id: fetchCount }])),
      });
    });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ active: false }');
    const el = document.createElement('div');
    el.setAttribute('if', 'active');
    el.setAttribute('get', '/api/data');
    el.setAttribute('as', 'data');
    el.setAttribute('refresh', '500');
    el.textContent = 'placeholder';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    jest.useFakeTimers();
    try {
      processTree(wrapper);
      await jest.advanceTimersByTimeAsync(50);

      expect(global.fetch).not.toHaveBeenCalled();

      // Activate — triggers initial fetch + starts interval
      wrapper.__ctx.active = true;
      await jest.advanceTimersByTimeAsync(100);

      const callsAfterActivation = global.fetch.mock.calls.length;
      expect(callsAfterActivation).toBeGreaterThanOrEqual(1);

      // Deactivate — should clear the polling interval via gate disposer
      wrapper.__ctx.active = false;
      await jest.advanceTimersByTimeAsync(100);

      const callsAfterDeactivation = global.fetch.mock.calls.length;

      // Advance past several poll cycles — none should fire if interval was cleared
      await jest.advanceTimersByTimeAsync(2000);

      // No additional fetches after deactivation
      expect(global.fetch.mock.calls.length).toBe(callsAfterDeactivation);
    } finally {
      jest.useRealTimers();
    }
  });

  // ── Re-activation cycle ─────────────────────────────────────────────

  test('9 — re-activation after deactivation fires a new fetch', async () => {
    let callNum = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callNum++;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ call: callNum })),
      });
    });

    const { wrapper } = buildGetFixture({ active: false });
    processTree(wrapper);

    await flush();
    expect(global.fetch).not.toHaveBeenCalled();

    // Cycle 1: activate
    wrapper.__ctx.active = true;
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Deactivate
    wrapper.__ctx.active = false;
    await flush();

    // Cycle 2: re-activate fires a new fetch
    wrapper.__ctx.active = true;
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  // ── No if attribute: normal behavior unchanged ──────────────────────

  test('10 — get without if attribute fires normally (no gating)', async () => {
    global.fetch = mockFetch([{ id: 1, name: 'Bob' }]);

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/users');
    el.setAttribute('as', 'users');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);
    await flush();

    // Without if, the directive runs immediately
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // ── Initially-true if: fetch fires immediately ──────────────────────

  test('11 — initially-true if fires GET immediately', async () => {
    global.fetch = mockFetch([{ id: 1, name: 'Carol' }]);

    const { wrapper } = buildGetFixture({ active: true });
    processTree(wrapper);

    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
