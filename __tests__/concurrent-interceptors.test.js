import { _config, _interceptors, _CANCEL } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { _doFetch } from '../src/fetch.js';
import '../src/directives/state.js';
import '../src/directives/http.js';

// NOJS-HTTP-003 — the request-interceptor re-entrancy guard is per call chain:
// a request that starts while another one is still inside its interceptor
// chain must run every interceptor too.
describe('Request interceptors with concurrent requests', () => {
  let originalFetch;
  const flush = (ms = 20) => new Promise((r) => setTimeout(r, ms));
  const tenants = () => global.fetch.mock.calls.map((c) => [c[0], c[1].headers['X-Tenant'] ?? null]);

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve('{}') }),
    );
    _config.baseApiUrl = '';
    _config.headers = {};
    _config.csrf = null;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.cache = { strategy: 'none', ttl: 300000 };
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    document.body.innerHTML = '';
    _interceptors.request.length = 0;
  });

  // NOJS-HTTP-003 — flipped to test() by the fix commit
  test.failing('every sibling get element passes through an async request interceptor', async () => {
    _interceptors.request.push(async () => {
      await flush(1); // e.g. an async token lookup
      return { headers: { 'X-Tenant': 'acme' } };
    });
    document.body.innerHTML =
      '<div state="{}"><div get="/api/a"></div><div get="/api/b"></div><div get="/api/c"></div></div>';
    processTree(document.body);
    await flush(50);

    expect(tenants().sort()).toEqual([['/api/a', 'acme'], ['/api/b', 'acme'], ['/api/c', 'acme']]);
  });

  // NOJS-HTTP-003 — flipped to test() by the fix commit
  test.failing('a CANCEL policy interceptor applies to every concurrent request', async () => {
    _interceptors.request.push((url) => (url.includes('/admin') ? { [_CANCEL]: true } : undefined));

    const results = await Promise.allSettled([
      _doFetch('/api/ok'),
      _doFetch('/api/admin/delete-all', 'POST', {}),
    ]);

    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(global.fetch.mock.calls.map((c) => c[0])).toEqual(['/api/ok']);
  });

  test('a fetch issued from inside a request interceptor still skips the chain', async () => {
    let calls = 0;
    _interceptors.request.push(async (url) => {
      calls++;
      if (url === '/api/outer') await _doFetch('/api/inner');
      return { headers: { 'X-Tenant': 'acme' } };
    });

    await _doFetch('/api/outer');

    expect(calls).toBe(1);
    expect(tenants()).toEqual([['/api/inner', null], ['/api/outer', 'acme']]);
  });
});
