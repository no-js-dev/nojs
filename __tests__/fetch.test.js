import { _config, _interceptors, _cache } from '../src/globals.js';
import { resolveUrl, _doFetch, _cacheGet, _cacheSet } from '../src/fetch.js';

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
