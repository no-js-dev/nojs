import { _config, _interceptors, _cache, _plugins } from '../src/globals.js';
import { resolveUrl, _doFetch, _cacheGet, _cacheSet, _redactUrlParams, _eventUrl } from '../src/fetch.js';

describe('URL Resolution', () => {
  afterEach(() => {
    _config.baseApiUrl = '';
  });

  test('returns absolute URLs unchanged', () => {
    expect(resolveUrl('https://api.example.com/users', null)).toBe('https://api.example.com/users');
    expect(resolveUrl('http://localhost:3000/data', null)).toBe('http://localhost:3000/data');
    expect(resolveUrl('//cdn.example.com/script.js', null)).toBe('//cdn.example.com/script.js');
  });

  test('prepends baseApiUrl to relative URLs', () => {
    _config.baseApiUrl = 'https://api.example.com';
    expect(resolveUrl('/users', null)).toBe('https://api.example.com/users');
    expect(resolveUrl('users', null)).toBe('https://api.example.com/users');
  });

  test('handles trailing slashes in baseApiUrl', () => {
    _config.baseApiUrl = 'https://api.example.com/';
    expect(resolveUrl('/users', null)).toBe('https://api.example.com/users');
  });

  test('uses base attribute from parent element', () => {
    const parent = document.createElement('div');
    parent.setAttribute('base', 'https://myapi.com/v1');
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(resolveUrl('items', child)).toBe('https://myapi.com/v1/items');
  });

  test('returns relative URL as-is when no base configured', () => {
    _config.baseApiUrl = '';
    const el = document.createElement('div');
    expect(resolveUrl('data', el)).toBe('data');
  });
});

describe('Fetch (_doFetch)', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('makes GET request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: 1, name: 'Test' })),
    });

    const result = await _doFetch('/api/users/1', 'GET');
    expect(global.fetch).toHaveBeenCalled();
    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  test('makes POST request with JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    const body = { name: 'Alice', age: 30 };
    await _doFetch('/api/users', 'POST', body);

    const call = global.fetch.mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBe(JSON.stringify(body));
    expect(call[1].headers['Content-Type']).toBe('application/json');
  });

  test('makes PUT request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ updated: true })),
    });

    await _doFetch('/api/users/1', 'PUT', { name: 'Updated' });
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT');
  });

  test('makes PATCH request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ patched: true })),
    });

    await _doFetch('/api/users/1', 'PATCH', { age: 31 });
    expect(global.fetch.mock.calls[0][1].method).toBe('PATCH');
  });

  test('makes DELETE request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ deleted: true })),
    });

    await _doFetch('/api/users/1', 'DELETE');
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  test('makes QUERY request with body (RFC 10008)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ results: [] })),
    });

    const body = { filter: { role: 'admin' }, sort: 'name' };
    await _doFetch('/api/search', 'query', body);

    const call = global.fetch.mock.calls[0];
    // "query" uppercases to the QUERY fetch method (no mapping needed)
    expect(call[1].method).toBe('QUERY');
    // QUERY carries a request body, like POST
    expect(call[1].body).toBe(JSON.stringify(body));
    expect(call[1].headers['Content-Type']).toBe('application/json');
  });

  test('does not include CSRF token for QUERY (safe read method)', async () => {
    _config.csrf = { header: 'X-CSRF-Token', token: 'abc123' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await _doFetch('/api/search', 'query', { q: 'test' });
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBeUndefined();
  });

  test('returns plain text when JSON parsing fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('plain text response'),
    });

    const result = await _doFetch('/api/text');
    expect(result).toBe('plain text response');
  });

  test('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' }),
    });

    await expect(_doFetch('/api/missing')).rejects.toThrow('Not found');
  });

  test('includes CSRF token when configured', async () => {
    _config.csrf = { header: 'X-CSRF-Token', token: 'abc123' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await _doFetch('/api/users', 'POST', { name: 'test' });
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBe('abc123');
  });

  test('does not include CSRF token for GET', async () => {
    _config.csrf = { header: 'X-CSRF-Token', token: 'abc123' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await _doFetch('/api/users', 'GET');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBeUndefined();
  });

  test('applies request interceptors', async () => {
    _interceptors.request.push((url, opts) => {
      opts.headers['X-Custom'] = 'intercepted';
      return opts;
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await _doFetch('/api/test');
    expect(global.fetch.mock.calls[0][1].headers['X-Custom']).toBe('intercepted');
  });

  test('applies response interceptors', async () => {
    const modifiedResponse = {
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ intercepted: true })),
    };
    _interceptors.response.push(() => modifiedResponse);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    const result = await _doFetch('/api/test');
    expect(result).toEqual({ intercepted: true });
  });

  test('retries on failure', async () => {
    _config.retries = 2;
    _config.retryDelay = 10;
    let callCount = 0;

    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true })),
      });
    });

    const result = await _doFetch('/api/retry');
    expect(result).toEqual({ success: true });
    expect(callCount).toBe(3);
  });

  test('throws AbortError on abort', async () => {
    const controller = new AbortController();
    controller.abort();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await expect(_doFetch('/api/test', 'GET', null, {}, null, controller.signal))
      .rejects.toThrow('Aborted');
  });
});

describe('Cache', () => {
  beforeEach(() => {
    _cache.clear();
    _config.cache.ttl = 300000;
  });

  describe('memory cache', () => {
    test('set and get', () => {
      _cacheSet('key1', { data: 'hello' }, 'memory');
      expect(_cacheGet('key1', 'memory')).toEqual({ data: 'hello' });
    });

    test('returns null for missing key', () => {
      expect(_cacheGet('missing', 'memory')).toBeNull();
    });

    test('returns null for expired entry', () => {
      _cacheSet('key2', 'data', 'memory');
      _cache.get('key2').time = Date.now() - 400000;
      expect(_cacheGet('key2', 'memory')).toBeNull();
    });
  });

  describe('no-op for strategy "none"', () => {
    test('cacheGet returns null', () => {
      expect(_cacheGet('key', 'none')).toBeNull();
    });

    test('cacheSet is no-op', () => {
      _cacheSet('key', 'data', 'none');
      expect(_cache.has('key')).toBe(false);
    });
  });

  describe('local storage cache', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('set and get', () => {
      _cacheSet('lkey', { x: 1 }, 'local');
      expect(_cacheGet('lkey', 'local')).toEqual({ x: 1 });
    });

    test('returns null for missing key', () => {
      expect(_cacheGet('missing', 'local')).toBeNull();
    });

    test('returns null and removes expired entry', () => {
      localStorage.setItem(
        'nojs_cache_ekey',
        JSON.stringify({ data: 'old', time: Date.now() - 400000 })
      );
      expect(_cacheGet('ekey', 'local')).toBeNull();
      expect(localStorage.getItem('nojs_cache_ekey')).toBeNull();
    });
  });

  describe('session storage cache', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    test('set and get', () => {
      _cacheSet('skey', { y: 2 }, 'session');
      expect(_cacheGet('skey', 'session')).toEqual({ y: 2 });
    });
  });

  describe('LRU eviction (max 200 entries)', () => {
    test('cache does not grow beyond 200 entries', () => {
      _cache.clear();
      for (let i = 0; i < 210; i++) {
        _cacheSet(`/test-${i}`, { data: i }, 'memory');
      }
      expect(_cache.size).toBeLessThanOrEqual(200);
    });

    test('oldest cache entry is evicted first', () => {
      _cache.clear();
      for (let i = 0; i < 200; i++) {
        _cacheSet(`/fill-${i}`, { data: i }, 'memory');
      }
      // First entry exists
      expect(_cache.has('/fill-0')).toBe(true);
      // Add one more — should evict /fill-0
      _cacheSet('/overflow', { data: 'new' }, 'memory');
      expect(_cache.has('/fill-0')).toBe(false);
      expect(_cache.has('/overflow')).toBe(true);
    });

    test('reading an entry promotes it (LRU refresh)', () => {
      _cache.clear();
      for (let i = 0; i < 200; i++) {
        _cacheSet(`/lru-${i}`, { data: i }, 'memory');
      }
      // Read the first entry to promote it to most-recently-used
      expect(_cacheGet('/lru-0', 'memory')).toEqual({ data: 0 });
      // Add a new entry — should evict /lru-1 (now the oldest), not /lru-0
      _cacheSet('/lru-new', { data: 'new' }, 'memory');
      expect(_cache.has('/lru-0')).toBe(true);
      expect(_cache.has('/lru-1')).toBe(false);
      expect(_cache.has('/lru-new')).toBe(true);
    });

    test('re-setting an existing key refreshes its position', () => {
      _cache.clear();
      for (let i = 0; i < 200; i++) {
        _cacheSet(`/pos-${i}`, { data: i }, 'memory');
      }
      // Re-set the first entry to refresh its position
      _cacheSet('/pos-0', { data: 'updated' }, 'memory');
      // Add a new entry — should evict /pos-1 (now the oldest), not /pos-0
      _cacheSet('/pos-new', { data: 'new' }, 'memory');
      expect(_cache.has('/pos-0')).toBe(true);
      expect(_cache.has('/pos-1')).toBe(false);
      expect(_cache.size).toBe(200);
    });
  });
});

describe('fetch.js — string body that is valid JSON', () => {
  test('sends JSON string body with application/json content-type', async () => {
    const jsonString = '{"key":"value"}';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(jsonString),
    });

    await _doFetch('/api/test', 'POST', jsonString);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: jsonString,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });
});

describe('fetch.js — FormData body', () => {
  test('sends FormData body without setting Content-Type', async () => {
    const formData = new FormData();
    formData.append('file', 'data');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'multipart/form-data' },
      text: () => Promise.resolve('ok'),
    });

    await _doFetch('/api/upload', 'POST', formData);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        body: formData,
      }),
    );
    const callOpts = global.fetch.mock.calls[0][1];
    expect(callOpts.headers['Content-Type']).toBeUndefined();
  });
});

describe('fetch.js — timeout config fallback', () => {
  test('uses default timeout of 10000 when _config.timeout is 0', async () => {
    _config.timeout = 0;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    });

    const result = await _doFetch('/api/test', 'GET');
    expect(result).toEqual({});
  });
});

describe('fetch.js — non-JSON string body', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('sends plain string body without Content-Type when JSON.parse fails', async () => {
    const plainString = 'this is not json';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('ok'),
    });

    await _doFetch('/api/raw', 'POST', plainString);

    const call = global.fetch.mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBe(plainString);
    expect(call[1].headers['Content-Type']).toBeUndefined();
  });
});

describe('fetch.js — CSRF with default header name', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _config.csrf = null;
  });

  test('uses default X-CSRF-Token header when no header is specified', async () => {
    _config.csrf = { token: 'mytoken123' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await _doFetch('/api/update', 'PUT', { x: 1 });

    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBe('mytoken123');
  });

  test('uses default empty token when no token is specified', async () => {
    _config.csrf = {};
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    await _doFetch('/api/update', 'DELETE');

    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBe('');
  });
});

describe('fetch.js — external abort signal listener', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('abort listener aborts internal controller when external signal fires', async () => {
    const controller = new AbortController();
    let fetchResolve;
    global.fetch = jest.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        fetchResolve = resolve;
        const signal = global.fetch.mock.calls[0][1].signal;
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const promise = _doFetch('/api/slow', 'GET', null, {}, null, controller.signal);

    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });
});

describe('fetch.js — retry delay between attempts', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('waits retryDelay between retry attempts', async () => {
    _config.retries = 1;
    _config.retryDelay = 50;

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'fail' }),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{"ok":true}'),
      });
    });

    const start = Date.now();
    const result = await _doFetch('/api/retry-delay');
    const elapsed = Date.now() - start;

    expect(result).toEqual({ ok: true });
    expect(callCount).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe('fetch.js — HTTP error json() catch', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns {} when response.json() fails on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    });

    try {
      await _doFetch('/api/broken-json');
    } catch (err) {
      expect(err.status).toBe(500);
      expect(err.body).toEqual({});
      expect(err.message).toBe('HTTP 500');
    }
  });
});



describe('fetch.js — external abort signal listener fires abort callback (L77)', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
    _config.baseApiUrl = '';
    _config.timeout = 10000;
    _config.retries = 0;
    _config.headers = {};
    _config.credentials = 'same-origin';
    _config.csrf = null;
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  test('aborting external signal triggers internal controller.abort via the listener', async () => {
    const externalController = new AbortController();

    global.fetch = jest.fn(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          externalController.abort();
        }, 10);

        setTimeout(() => {
          reject(new DOMException('Aborted', 'AbortError'));
        }, 50);
      });
    });

    await expect(
      _doFetch('/test', 'GET', null, {}, null, externalController.signal)
    ).rejects.toThrow();
  });

  test('external signal abort listener calls controller.abort during pending fetch', async () => {
    const externalController = new AbortController();
    let internalSignal;

    global.fetch = jest.fn((url, opts) => {
      internalSignal = opts.signal;
      return new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const fetchPromise = _doFetch('/test', 'GET', null, {}, null, externalController.signal);

    await new Promise((r) => setTimeout(r, 5));

    externalController.abort();

    await expect(fetchPromise).rejects.toThrow();
    expect(internalSignal.aborted).toBe(true);
  });
});

describe('fetch.js — explicit _doFetch retry params override _config', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.retryDelay = 1000;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('explicit retries param overrides _config.retries = 0', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true })),
      });
    });

    // _config.retries is 0, but we pass retries=2 and retryDelay=10 as positional args
    const result = await _doFetch('/api/retry-override', 'GET', null, {}, null, null, 2, 10);
    expect(result).toEqual({ success: true });
    expect(callCount).toBe(3);
  });
});

describe('fetch.js — CSRF token cross-origin protection (NOJS-232)', () => {
  // jsdom serves tests from http://localhost, so window.location.origin
  // is "http://localhost" (host "localhost").
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.baseApiUrl = '';
    _config.csrf = { header: 'X-CSRF-Token', token: 'secret-token' };
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _config.csrf = null;
  });

  const sentHeaders = () => global.fetch.mock.calls[0][1].headers;

  test('does NOT attach token for protocol-relative cross-origin URL (//evil.com/x)', async () => {
    await _doFetch('//evil.com/steal', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBeUndefined();
  });

  test('does NOT attach token for backslash cross-origin URL (\\\\evil.com/x)', async () => {
    await _doFetch('\\\\evil.com/steal', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBeUndefined();
  });

  test('does NOT attach token for uppercase-scheme cross-origin URL (HTTP://evil.com/x)', async () => {
    await _doFetch('HTTP://evil.com/steal', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBeUndefined();
  });

  test('does NOT attach token for absolute cross-origin URL (https://evil.com/x)', async () => {
    await _doFetch('https://evil.com/steal', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBeUndefined();
  });

  test('attaches token for same-origin absolute URL', async () => {
    await _doFetch('http://localhost/api/x', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBe('secret-token');
  });

  test('attaches token for relative URL (/api/x)', async () => {
    await _doFetch('/api/x', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBe('secret-token');
  });

  test('attaches token for protocol-relative same-origin URL (//localhost/x)', async () => {
    await _doFetch('//localhost/api/x', 'POST', { a: 1 });
    expect(sentHeaders()['X-CSRF-Token']).toBe('secret-token');
  });

  test('never attaches token for a GET request, even same-origin', async () => {
    await _doFetch('/api/x', 'GET');
    expect(sentHeaders()['X-CSRF-Token']).toBeUndefined();
  });

  test('never attaches token for a GET request to a cross-origin URL', async () => {
    await _doFetch('https://evil.com/steal', 'GET');
    expect(sentHeaders()['X-CSRF-Token']).toBeUndefined();
  });
});

describe('Sensitive header handling around interceptors', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.timeout = 10000;
    _config.headers = {};
    _config.csrf = null;
    _config.credentials = 'same-origin';
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
  });

  test('sensitive headers preserved in fetch call when zero interceptors exist', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    _config.headers = { Authorization: 'Bearer my-token' };
    await _doFetch('/api/protected', 'GET');

    const calledHeaders = global.fetch.mock.calls[0][1].headers;
    expect(calledHeaders['Authorization']).toBe('Bearer my-token');
  });

  test('custom x-api-key header preserved with zero interceptors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    _config.headers = { 'X-Api-Key': 'key-12345' };
    await _doFetch('/api/data', 'GET');

    const calledHeaders = global.fetch.mock.calls[0][1].headers;
    expect(calledHeaders['X-Api-Key']).toBe('key-12345');
  });

  test('multiple sensitive headers preserved with zero interceptors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    _config.headers = {
      Authorization: 'Bearer token',
      Cookie: 'session=abc',
      'X-Api-Key': 'key-456',
    };
    await _doFetch('/api/multi', 'GET');

    const calledHeaders = global.fetch.mock.calls[0][1].headers;
    expect(calledHeaders['Authorization']).toBe('Bearer token');
    expect(calledHeaders['Cookie']).toBe('session=abc');
    expect(calledHeaders['X-Api-Key']).toBe('key-456');
  });

  test('sensitive headers stripped from untrusted interceptor view', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    _config.headers = { Authorization: 'Bearer secret-token' };

    let interceptedHeaders = null;
    _interceptors.request.push((url, opts) => {
      interceptedHeaders = { ...opts.headers };
      return opts;
    });

    await _doFetch('/api/test', 'GET');

    // Interceptor should NOT see the sensitive header
    expect(interceptedHeaders['Authorization']).toBeUndefined();
  });

  test('sensitive headers restored after interceptor chain', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    _config.headers = { Authorization: 'Bearer restored-token' };

    _interceptors.request.push((url, opts) => {
      // Interceptor adds a custom header
      opts.headers['X-Custom'] = 'added';
      return opts;
    });

    await _doFetch('/api/test', 'GET');

    const calledHeaders = global.fetch.mock.calls[0][1].headers;
    // Sensitive header should be restored after interceptor chain
    expect(calledHeaders['Authorization']).toBe('Bearer restored-token');
    // Custom header from interceptor should also be present
    expect(calledHeaders['X-Custom']).toBe('added');
  });

  test('non-sensitive headers are visible to interceptors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    _config.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let interceptedHeaders = null;
    _interceptors.request.push((url, opts) => {
      interceptedHeaders = { ...opts.headers };
      return opts;
    });

    await _doFetch('/api/test', 'GET');

    expect(interceptedHeaders['Content-Type']).toBe('application/json');
    expect(interceptedHeaders['Accept']).toBe('application/json');
  });

  test('fetch works normally with non-sensitive headers and zero interceptors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'result' })),
    });

    _config.headers = { 'Content-Type': 'application/json' };
    const result = await _doFetch('/api/simple', 'GET');

    expect(result).toEqual({ data: 'result' });
    const calledHeaders = global.fetch.mock.calls[0][1].headers;
    expect(calledHeaders['Content-Type']).toBe('application/json');
  });
});

describe('Global headers origin scoping (scopeHeaders: true)', () => {
  const sent = () => global.fetch.mock.calls[0][1].headers;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });
    _config.headers = { Authorization: 'Bearer SECRET' };
    _config.baseApiUrl = 'https://api.myapp.com/v1';
    _config.scopeHeaders = true;
  });

  afterEach(() => {
    _config.headers = {};
    _config.baseApiUrl = '';
    _config.scopeHeaders = false;
  });

  test('global headers are not sent to a foreign absolute URL', async () => {
    await _doFetch('https://other-api.com/data', 'GET');
    expect(sent().Authorization).toBeUndefined();
  });

  test('global headers are not sent to a protocol-relative foreign URL', async () => {
    await _doFetch('//cdn.thirdparty.example/x.json', 'GET');
    expect(sent().Authorization).toBeUndefined();
  });

  test('global headers are not sent to another subdomain of the app', async () => {
    await _doFetch('https://auth.myapp.com/session', 'GET');
    expect(sent().Authorization).toBeUndefined();
  });

  test('global headers are not sent to an unparseable URL', async () => {
    await _doFetch('http://[bad/x', 'GET');
    expect(sent().Authorization).toBeUndefined();
  });

  test('per-request headers still apply to a foreign URL while global ones do not', async () => {
    await _doFetch('https://other-api.com/data', 'GET', null, { 'X-Explicit': '1' });
    expect(sent()['X-Explicit']).toBe('1');
    expect(sent().Authorization).toBeUndefined();
  });

  test('global headers are sent to baseApiUrl-relative and baseApiUrl-absolute URLs', async () => {
    await _doFetch('/users', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
    global.fetch.mockClear();
    await _doFetch('https://api.myapp.com/other', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('global headers are sent to same-origin URLs when no baseApiUrl is set', async () => {
    _config.baseApiUrl = '';
    await _doFetch('/api/test', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
    global.fetch.mockClear();
    await _doFetch(window.location.origin + '/api/abs', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('global headers are sent to the origin of an element base= attribute', async () => {
    const el = document.createElement('div');
    el.setAttribute('base', 'https://other-api.com/v2');
    await _doFetch('items', 'GET', null, {}, el);
    expect(sent().Authorization).toBe('Bearer SECRET');
    global.fetch.mockClear();
    await _doFetch('https://other-api.com/abs', 'GET', null, {}, el);
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('only the nearest base= counts, and the page origin stays trusted under it', async () => {
    const outer = document.createElement('div');
    outer.setAttribute('base', 'https://outer-api.com');
    const inner = document.createElement('div');
    inner.setAttribute('base', 'https://inner-api.com');
    outer.appendChild(inner);
    await _doFetch('https://outer-api.com/x', 'GET', null, {}, inner);
    expect(sent().Authorization).toBeUndefined();
    global.fetch.mockClear();
    await _doFetch(window.location.origin + '/x', 'GET', null, {}, inner);
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('the CSRF token is still injected only for same-origin writes', async () => {
    _config.csrf = { token: 'CSRF-1' };
    _config.baseApiUrl = '';
    try {
      await _doFetch('/api/save', 'POST', { a: 1 });
      expect(sent()['X-CSRF-Token']).toBe('CSRF-1');
      global.fetch.mockClear();
      const el = document.createElement('div');
      el.setAttribute('base', 'https://api.myapp.com');
      await _doFetch('https://api.myapp.com/save', 'POST', { a: 1 }, {}, el);
      expect(sent()['X-CSRF-Token']).toBeUndefined();
      expect(sent().Authorization).toBe('Bearer SECRET');
    } finally {
      _config.csrf = null;
    }
  });
});

describe('v1.21.1 defaults: global headers (scopeHeaders off)', () => {
  const okFetch = () => jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
  const sent = () => global.fetch.mock.calls[0][1].headers;

  afterEach(() => {
    _config.headers = {};
    _config.baseApiUrl = '';
    _config.debug = false;
  });

  test('scopeHeaders defaults to false', () => {
    expect(_config.scopeHeaders).toBe(false);
  });

  test('global headers are sent to a foreign absolute URL', async () => {
    global.fetch = okFetch();
    _config.headers = { Authorization: 'Bearer SECRET' };
    _config.baseApiUrl = 'https://api.myapp.com/v1';
    await _doFetch('https://other-api.com/data', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('global headers are sent to a protocol-relative foreign URL', async () => {
    global.fetch = okFetch();
    _config.headers = { Authorization: 'Bearer SECRET' };
    await _doFetch('//cdn.thirdparty.example/x.json', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('global headers are sent to an unparseable URL', async () => {
    global.fetch = okFetch();
    _config.headers = { Authorization: 'Bearer SECRET' };
    await _doFetch('http://[bad/x', 'GET');
    expect(sent().Authorization).toBe('Bearer SECRET');
  });

  test('per-request headers override global ones on a foreign URL', async () => {
    global.fetch = okFetch();
    _config.headers = { Authorization: 'Bearer SECRET', 'X-App': 'a' };
    await _doFetch('https://other-api.com/data', 'GET', null, { 'X-App': 'b' });
    expect(sent()).toEqual({ Authorization: 'Bearer SECRET', 'X-App': 'b' });
  });

  test('debug mode logs nothing extra for cross-origin global headers', async () => {
    global.fetch = okFetch();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      _config.debug = true;
      _config.headers = { Authorization: 'Bearer SECRET' };
      await _doFetch('https://other-api.com/data', 'GET');
      expect(log.mock.calls.map((c) => c.join(' ')).filter((l) => /cross-origin|scopeHeaders/.test(l))).toEqual([]);
    } finally {
      log.mockRestore();
    }
  });
});

describe('Untrusted interceptor redaction consistency (strictRedaction: true)', () => {
  beforeEach(() => {
    _config.strictRedaction = true;
  });

  afterEach(() => {
    _plugins.delete('analytics');
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
    _config.csrf = null;
    _config.strictRedaction = false;
  });

  test('configured CSRF header name is withheld from untrusted request interceptors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    _config.csrf = { header: 'X-XSRF-TOKEN', token: 'CSRF-SECRET' };
    let seen;
    _plugins.set('analytics', { plugin: {}, options: {} });
    _interceptors.request.push({ fn: (url, opts) => { seen = { ...opts.headers }; }, pluginName: 'analytics' });
    await _doFetch('/api/login', 'POST', { a: 1 });
    expect(seen['X-XSRF-TOKEN']).toBeUndefined();
    expect(global.fetch.mock.calls[0][1].headers['X-XSRF-TOKEN']).toBe('CSRF-SECRET');
  });

  test('a trusted plugin still sees and can rotate the configured CSRF header', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    _config.csrf = { header: 'X-XSRF-TOKEN', token: 'CSRF-1' };
    let seen;
    _plugins.set('analytics', { plugin: {}, options: { trusted: true } });
    _interceptors.request.push({
      fn: (url, opts) => { seen = opts.headers['X-XSRF-TOKEN']; return { headers: { 'X-XSRF-TOKEN': 'CSRF-2' } }; },
      pluginName: 'analytics',
    });
    await _doFetch('/api/login', 'POST', { a: 1 });
    expect(seen).toBe('CSRF-1');
    expect(global.fetch.mock.calls[0][1].headers['X-XSRF-TOKEN']).toBe('CSRF-2');
  });

  test('x-auth-* / x-api-* response headers are withheld from untrusted response interceptors', async () => {
    let seen;
    _plugins.set('analytics', { plugin: {}, options: {} });
    _interceptors.response.push({
      fn: (res) => { seen = { refresh: res.headers.get('x-auth-refresh-token'), key: res.headers.get('x-api-secret'), ct: res.headers.get('content-type') }; return res; },
      pluginName: 'analytics',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: '',
      headers: new Headers({ 'x-auth-refresh-token': 'RT', 'x-api-secret': 'K', 'content-type': 'application/json' }),
      text: () => Promise.resolve('{}'),
    });
    await _doFetch('/api/me', 'GET');
    expect(seen.refresh).toBeNull();
    expect(seen.key).toBeNull();
    expect(seen.ct).toBe('application/json');
  });

  test('untrusted request interceptors get a redacted url while the request goes to the real url', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    let seenUrl;
    _plugins.set('analytics', { plugin: {}, options: {} });
    _interceptors.request.push({ fn: (url) => { seenUrl = url; return { url }; }, pluginName: 'analytics' });
    await _doFetch('/api/login?access_token=abc123&page=2', 'GET');
    expect(seenUrl).toBe('/api/login?access_token=[REDACTED]&page=2');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/login?access_token=abc123&page=2');
  });

  test('trusted request interceptors receive the real url', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    let seenUrl;
    _plugins.set('analytics', { plugin: {}, options: { trusted: true } });
    _interceptors.request.push({ fn: (url) => { seenUrl = url; }, pluginName: 'analytics' });
    await _doFetch('/api/login?access_token=abc123#frag', 'GET');
    expect(seenUrl).toBe('/api/login?access_token=abc123#frag');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/login?access_token=abc123#frag');
  });

  test('non-string csrf.header does not throw during header redaction', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    _config.csrf = { header: 42, token: 't' };
    _interceptors.request.push({ fn: () => {}, pluginName: undefined });
    await expect(_doFetch('/api/x', 'POST', { a: 1 })).resolves.toBeDefined();
  });
});

describe('URL seen by untrusted request interceptors (strictRedaction: true)', () => {
  const seenUrl = async (url) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    let seen;
    _plugins.set('analytics', { plugin: {}, options: {} });
    _interceptors.request.push({ fn: (u) => { seen = u; }, pluginName: 'analytics' });
    await _doFetch(url, 'GET');
    return seen;
  };

  beforeEach(() => {
    _config.strictRedaction = true;
  });

  afterEach(() => {
    _plugins.delete('analytics');
    _interceptors.request.length = 0;
    _config.strictRedaction = false;
  });

  test('is the real url, byte for byte, when no parameter is sensitive and there is no fragment', async () => {
    for (const u of ['//cdn.example.com/a?x=1', 'HTTP://h.com/a?q=a%20b', 'api/x?a=1&b=a+b', '/p', 'https://h.com/a?page=2']) {
      expect(await seenUrl(u)).toBe(u);
      _interceptors.request.length = 0;
    }
  });

  test('drops the fragment', async () => {
    const cases = [
      ['HTTP://h.com/a?q=a%20b#frag', 'HTTP://h.com/a?q=a%20b'],
      ['/api/x#access_token=SEKH', '/api/x'],
      ['/api/x?q=1#a?token=b', '/api/x?q=1'],
    ];
    for (const [real, expected] of cases) {
      expect(await seenUrl(real)).toBe(expected);
      _interceptors.request.length = 0;
    }
  });

  test('differs from the real url only in sensitive values, replaced by a literal [REDACTED]', async () => {
    const cases = [
      ['//cdn.example.com/a?x=a%20b&access_token=S3&y=1#frag', '//cdn.example.com/a?x=a%20b&access_token=[REDACTED]&y=1'],
      ['HTTP://h.com/a?API_KEY=S&q=a+b', 'HTTP://h.com/a?API_KEY=[REDACTED]&q=a+b'],
      ['api/x?password=p&q=%20b', 'api/x?password=[REDACTED]&q=%20b'],
      ['/a?token=1&token=2', '/a?token=[REDACTED]&token=[REDACTED]'],
    ];
    for (const [real, expected] of cases) {
      expect(await seenUrl(real)).toBe(expected);
      _interceptors.request.length = 0;
    }
  });
});

describe('v1.21.1 defaults: interceptor redaction (strictRedaction off)', () => {
  const okFetch = () => jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
  const sent = () => global.fetch.mock.calls[0][1].headers;

  afterEach(() => {
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
    _plugins.delete('untrusted');
    _config.csrf = null;
  });

  test('strictRedaction defaults to false', () => {
    expect(_config.strictRedaction).toBe(false);
  });

  test('an app request interceptor sees the full url, unredacted, fragment included', async () => {
    global.fetch = okFetch();
    let seen;
    _interceptors.request.push((url) => { seen = url; });
    await _doFetch('/api/search?author=ann&keyword=x&token=abc#access_token=H', 'GET');
    expect(seen).toBe('/api/search?author=ann&keyword=x&token=abc#access_token=H');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/search?author=ann&keyword=x&token=abc#access_token=H');
  });

  test('an untrusted plugin request interceptor sees the full url, unredacted', async () => {
    global.fetch = okFetch();
    let seen;
    _plugins.set('untrusted', { plugin: {}, options: {} });
    _interceptors.request.push({ fn: (url) => { seen = url; }, pluginName: 'untrusted' });
    await _doFetch('/api/x?access_token=abc', 'GET');
    expect(seen).toBe('/api/x?access_token=abc');
  });

  test('an app response interceptor sees X-Api-Version and Authorization response headers', async () => {
    let seen;
    _interceptors.response.push((res) => {
      seen = {
        version: res.headers.get('x-api-version'),
        auth: res.headers.get('authorization'),
        refresh: res.headers.get('x-auth-refresh'),
        xsrf: res.headers.get('x-xsrf-token'),
        cookie: res.headers.get('set-cookie'),
        challenge: res.headers.get('www-authenticate'),
        authToken: res.headers.get('x-auth-token'),
      };
      return res;
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: '',
      headers: new Headers({
        'x-api-version': '2',
        authorization: 'Bearer NEXT',
        'x-auth-refresh': 'RT-1',
        'x-xsrf-token': 'CSRF-NEXT',
        'www-authenticate': 'Basic',
        'x-auth-token': 'T',
      }),
      text: () => Promise.resolve('{}'),
    });
    await _doFetch('/api/me', 'GET');
    expect(seen.version).toBe('2');
    expect(seen.auth).toBe('Bearer NEXT');
    expect(seen.refresh).toBe('RT-1');
    expect(seen.xsrf).toBe('CSRF-NEXT');
    // v1.21.1 always stripped the fixed response list
    expect(seen.challenge).toBeNull();
    expect(seen.cookie).toBeNull();
    expect(seen.authToken).toBeNull();
  });

  test('a custom csrf header is visible to and settable by an app request interceptor', async () => {
    global.fetch = okFetch();
    _config.csrf = { header: 'X-XSRF-TOKEN', token: 'CSRF-1' };
    let seen;
    _interceptors.request.push((url, opts) => {
      seen = opts.headers['X-XSRF-TOKEN'];
      return { headers: { 'X-XSRF-TOKEN': 'CSRF-2' } };
    });
    await _doFetch('/api/login', 'POST', { a: 1 });
    expect(seen).toBe('CSRF-1');
    expect(sent()['X-XSRF-TOKEN']).toBe('CSRF-2');
  });

  test('the default X-CSRF-Token header is still withheld from app request interceptors', async () => {
    global.fetch = okFetch();
    _config.csrf = { token: 'CSRF-1' };
    let seen;
    _interceptors.request.push((url, opts) => { seen = { ...opts.headers }; });
    await _doFetch('/api/login', 'POST', { a: 1 });
    expect(seen['X-CSRF-Token']).toBeUndefined();
    expect(sent()['X-CSRF-Token']).toBe('CSRF-1');
  });

  test('_eventUrl returns the url unchanged', () => {
    const u = '/api/x?access_token=abc#access_token=H';
    expect(_eventUrl(u)).toBe(u);
  });
});

describe('strictRedaction: true with app interceptors', () => {
  beforeEach(() => {
    _config.strictRedaction = true;
  });

  afterEach(() => {
    _config.strictRedaction = false;
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
    _config.csrf = null;
  });

  test('app request interceptors see sensitive query values redacted, matched by word', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    let seen;
    _interceptors.request.push((url) => { seen = url; });
    await _doFetch('/api/search?author=ann&keyword=x&sort_key=name&token=abc', 'GET');
    expect(seen).toBe('/api/search?author=ann&keyword=x&sort_key=name&token=[REDACTED]');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/search?author=ann&keyword=x&sort_key=name&token=abc');
  });

  test('app response interceptors do not see Authorization or X-Api-* response headers', async () => {
    let seen;
    _interceptors.response.push((res) => {
      seen = { version: res.headers.get('x-api-version'), auth: res.headers.get('authorization'), ct: res.headers.get('content-type') };
      return res;
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: '',
      headers: new Headers({ 'x-api-version': '2', authorization: 'Bearer NEXT', 'content-type': 'application/json' }),
      text: () => Promise.resolve('{}'),
    });
    await _doFetch('/api/me', 'GET');
    expect(seen).toEqual({ version: null, auth: null, ct: 'application/json' });
  });

  test('a custom csrf header cannot be read or overridden by an app request interceptor', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') });
    _config.csrf = { header: 'X-XSRF-TOKEN', token: 'CSRF-1' };
    let seen;
    _interceptors.request.push((url, opts) => {
      seen = opts.headers['X-XSRF-TOKEN'];
      return { headers: { 'X-XSRF-TOKEN': 'CSRF-2' } };
    });
    await _doFetch('/api/login', 'POST', { a: 1 });
    expect(seen).toBeUndefined();
    expect(global.fetch.mock.calls[0][1].headers['X-XSRF-TOKEN']).toBe('CSRF-1');
  });
});

// Response interceptors receive (redactedResponse, url). Untrusted ones (app
// NoJS.interceptor() and plugins without { trusted: true }) get the URL and
// res.url through v1.21.1's URL-object redaction by default.
describe('v1.21.1 defaults: response interceptor URL bytes', () => {
  const RESPONSE_URL_CASES = [
    ['/api/users?token=abc&page=2', '/api/users?token=%5BREDACTED%5D&page=2'],
    ['api/users', '/api/users'],
    ['/api/users#frag', '/api/users'],
    ['/api/users?token=x#frag', '/api/users?token=%5BREDACTED%5D'],
    ['/api/users?q=a%20b&token=x', '/api/users?q=a+b&token=%5BREDACTED%5D'],
    ['/x?%74oken%ZZ=sek', '/x?token%25ZZ=%5BREDACTED%5D'],
    ['/api/x?token', '/api/x?token=%5BREDACTED%5D'],
    ['//cdn.test/x?token=1', '/x?token=%5BREDACTED%5D'],
    ['http://API.test:80/x?token=1#h', 'http://api.test/x?token=%5BREDACTED%5D#h'],
    ['http://api.test/x?a=1&a=2&token=t&token=u', 'http://api.test/x?a=1&a=2&token=%5BREDACTED%5D'],
    ['/api/users', '/api/users'],
    ['/api/x#access_token=SEKH', '/api/x'],
    ['/api/items?author=ann&keyword=x&sort_key=n', '/api/items?author=%5BREDACTED%5D&keyword=%5BREDACTED%5D&sort_key=%5BREDACTED%5D'],
  ];

  const run = async (url, responseUrl) => {
    const seen = [];
    const record = (res, u) => { seen.push({ url: u, resUrl: res.url }); };
    _interceptors.response.push(record);
    _plugins.set('untrusted', { plugin: {}, options: {} });
    _interceptors.response.push({ fn: record, pluginName: 'untrusted' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: responseUrl,
      headers: new Headers(),
      text: () => Promise.resolve('{}'),
    });
    await _doFetch(url, 'GET');
    return seen;
  };

  afterEach(() => {
    _interceptors.response.length = 0;
    _plugins.delete('untrusted');
    _config.strictRedaction = false;
  });

  test.each(RESPONSE_URL_CASES)('url %s is seen as %s by app and untrusted plugin interceptors', async (url, expected) => {
    const seen = await run(url, '');
    expect(seen.map((s) => s.url)).toEqual([expected, expected]);
    expect(global.fetch.mock.calls[0][0]).toBe(url);
  });

  test('res.url is redacted with the v1.21.1 bytes', async () => {
    const seen = await run('/api/users?q=a%20b&token=x', 'http://localhost/api/users?q=a%20b&token=x');
    expect(seen.map((s) => s.resUrl)).toEqual([
      'http://localhost/api/users?q=a+b&token=%5BREDACTED%5D',
      'http://localhost/api/users?q=a+b&token=%5BREDACTED%5D',
    ]);
  });

  test('with strictRedaction the string-level redactor is used, and a partly malformed key is still matched', async () => {
    _config.strictRedaction = true;
    const seen = await run('/x?%74oken%=sek&q=a%20b', 'http://localhost/x?%74oken%=sek&q=a%20b');
    expect(seen).toEqual([
      { url: '/x?%74oken%=[REDACTED]&q=a%20b', resUrl: 'http://localhost/x?%74oken%=[REDACTED]&q=a%20b' },
      { url: '/x?%74oken%=[REDACTED]&q=a%20b', resUrl: 'http://localhost/x?%74oken%=[REDACTED]&q=a%20b' },
    ]);
  });

  test.each([
    ['/api/x#access_token=SEKH', '/api/x'],
    ['/api/x?token=t&q=1#access_token=SEKH', '/api/x?token=[REDACTED]&q=1'],
    ['http://api.test/x?q=1#frag', 'http://api.test/x?q=1'],
    ['/api/x?q=1', '/api/x?q=1'],
  ])('with strictRedaction the fragment is dropped: %s is seen as %s', async (url, expected) => {
    _config.strictRedaction = true;
    const seen = await run(url, 'http://localhost/api/x?q=1');
    expect(seen.map((s) => s.url)).toEqual([expected, expected]);
    expect(global.fetch.mock.calls[0][0]).toBe(url);
  });
});

describe('URL fragments: request vs response interceptors and the insecure-HTTP warning', () => {
  const URL_H = 'http://api.test/x?token=t&q=1#access_token=SEKH';

  async function run() {
    const seen = [];
    _plugins.set('untrusted', { plugin: {}, options: {} });
    _interceptors.request.push((u) => { seen.push(['app:req', u]); });
    _interceptors.request.push({ fn: (u) => { seen.push(['plugin:req', u]); }, pluginName: 'untrusted' });
    _interceptors.response.push((res, u) => { seen.push(['app:res', u]); });
    _interceptors.response.push({ fn: (res, u) => { seen.push(['plugin:res', u]); }, pluginName: 'untrusted' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, url: '', headers: new Headers(), text: () => Promise.resolve('{}') });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await _doFetch(URL_H, 'GET');
    const warnings = warn.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('insecure HTTP'));
    warn.mockRestore();
    return { seen, warnings };
  }

  afterEach(() => {
    _interceptors.request.length = 0;
    _interceptors.response.length = 0;
    _plugins.delete('untrusted');
    _config.strictRedaction = false;
  });

  test('defaults match v1.21.1: raw request URL, URL-object response URL, raw warning', async () => {
    const { seen, warnings } = await run();
    expect(seen).toEqual([
      ['app:req', URL_H],
      ['plugin:req', URL_H],
      ['app:res', 'http://api.test/x?token=%5BREDACTED%5D&q=1#access_token=SEKH'],
      ['plugin:res', 'http://api.test/x?token=%5BREDACTED%5D&q=1#access_token=SEKH'],
    ]);
    expect(warnings).toEqual(['[No.JS] Credentials sent over insecure HTTP: ' + URL_H]);
    expect(global.fetch.mock.calls[0][0]).toBe(URL_H);
  });

  test('with strictRedaction every untrusted stage sees the same URL, without fragment or secrets', async () => {
    _config.strictRedaction = true;
    const { seen, warnings } = await run();
    const expected = 'http://api.test/x?token=[REDACTED]&q=1';
    expect(seen).toEqual([
      ['app:req', expected],
      ['plugin:req', expected],
      ['app:res', expected],
      ['plugin:res', expected],
    ]);
    expect(warnings).toEqual(['[No.JS] Credentials sent over insecure HTTP: ' + expected]);
    expect(global.fetch.mock.calls[0][0]).toBe(URL_H);
  });
});

describe('_redactUrlParams (strict redactor)', () => {
  test('matches keys whose escapes are partly malformed', () => {
    expect(_redactUrlParams('/x?%74oken%=S&p%61ssword%G1=P&q=1')).toBe('/x?%74oken%=[REDACTED]&p%61ssword%G1=[REDACTED]&q=1');
  });

  test('leaves non-sensitive malformed keys unchanged', () => {
    expect(_redactUrlParams('/x?a%ZZ=1&page=2')).toBe('/x?a%ZZ=1&page=2');
  });

  test('matches by word, not substring', () => {
    const keep = ['author', 'authority', 'keyword', 'keywords', 'keyboard', 'sort_key', 'cache-key', 'monkey', 'tokenCount', 'sessionCount', 'primaryKey', 'keyId', 'oauth', 'page'];
    for (const k of keep) {
      expect(_redactUrlParams(`/x?${k}=v`)).toBe(`/x?${k}=v`);
    }
    const redact = [
      'token', 'access_token', 'accessToken', 'refresh-token', 'id_token', 'csrftoken', 'X-Amz-Security-Token',
      'api_key', 'apiKey', 'apikey', 'API-KEY', 'x-api-key', 'key', 'client_secret', 'secret',
      'password', 'user[password]', 'passwd', 'auth', 'authorization', 'credential', 'X-Amz-Credential',
      'X-Amz-Signature', 'sig', 'session', 'sessionid', 'session_id', 'jwt',
    ];
    for (const k of redact) {
      expect(_redactUrlParams(`/x?${k}=v&page=1`)).toBe(`/x?${k}=[REDACTED]&page=1`);
    }
  });

  test('matches percent-encoded and plus-encoded keys after decoding', () => {
    expect(_redactUrlParams('/x?access%5Ftoken=v')).toBe('/x?access%5Ftoken=[REDACTED]');
    expect(_redactUrlParams('/x?user%5Bpassword%5D=v')).toBe('/x?user%5Bpassword%5D=[REDACTED]');
    expect(_redactUrlParams('/x?api+key=v')).toBe('/x?api+key=[REDACTED]');
  });

  test('keeps keys without a value, empty values and non-string input as they are', () => {
    expect(_redactUrlParams('/x?token&page=1')).toBe('/x?token&page=1');
    expect(_redactUrlParams('/x?token=&page=1')).toBe('/x?token=[REDACTED]&page=1');
    expect(_redactUrlParams(undefined)).toBeUndefined();
    expect(_redactUrlParams('/x')).toBe('/x');
  });
});
