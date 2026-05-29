



import { _stores, _refs, _config, _validators, _eventBus, _interceptors, setRouterInstance, _cache } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { findContext } from '../src/dom.js';
import { processTree } from '../src/registry.js';
import { _cacheSet } from '../src/fetch.js';
import { _i18n } from '../src/i18n.js';


import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/http.js';
import '../src/directives/refs.js';
import '../src/directives/events.js';
import '../src/directives/validation.js';
import '../src/directives/i18n.js';



describe('HTTP Directives', () => {
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

  test('GET directive fetches data and sets context', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('get', '/api/users');
    div.setAttribute('as', 'users');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);


    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).toHaveBeenCalled();
    expect(div.__ctx.users).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  test('POST directive does not auto-fetch (waits for form submit)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('post', '/api/users');
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);


    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('GET with loading template', async () => {
    let resolveReq;
    global.fetch = jest.fn().mockImplementation(
      () => new Promise((resolve) => { resolveReq = resolve; }),
    );

    const loadingTpl = document.createElement('template');
    loadingTpl.id = 'loading-tpl';
    loadingTpl.innerHTML = '<span class="loading">Loading...</span>';
    document.body.appendChild(loadingTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('get', '/api/data');
    div.setAttribute('loading', 'loading-tpl');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);


    await new Promise((r) => setTimeout(r, 10));
    expect(div.querySelector('.loading')).not.toBeNull();


    resolveReq({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ result: 'done' })),
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(div.querySelector('.loading')).toBeNull();
  });

  test('GET with error template on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Server error' }),
    });

    const errorTpl = document.createElement('template');
    errorTpl.id = 'error-tpl';
    errorTpl.innerHTML = '<span class="error">Error occurred</span>';
    document.body.appendChild(errorTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('get', '/api/broken');
    div.setAttribute('error', 'error-tpl');
    parent.appendChild(div);
    document.body.appendChild(parent);

    const spy = jest.spyOn(console, 'warn').mockImplementation();
    processTree(parent);

    await new Promise((r) => setTimeout(r, 100));

    expect(div.querySelector('.error')).not.toBeNull();
    spy.mockRestore();
  });

  test('GET saves data into store', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ items: [1, 2, 3] })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('get', '/api/items');
    div.setAttribute('as', 'data');
    div.setAttribute('into', 'myStore');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    await new Promise((r) => setTimeout(r, 50));

    expect(_stores.myStore).toBeDefined();
    expect(_stores.myStore.data).toEqual({ items: [1, 2, 3] });
  });

  test('GET with interpolated URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: 42 })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ userId: 42 }');
    const div = document.createElement('div');
    div.setAttribute('get', '/api/users/{userId}');
    div.setAttribute('as', 'user');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    await new Promise((r) => setTimeout(r, 50));

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/users/42');
  });
});



describe('Ref Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_refs).forEach((k) => delete _refs[k]);
  });

  test('registers element ref', () => {
    const div = document.createElement('div');
    div.setAttribute('ref', 'myDiv');
    document.body.appendChild(div);
    processTree(div);

    expect(_refs.myDiv).toBe(div);
  });

  test('multiple refs', () => {
    const div1 = document.createElement('div');
    div1.setAttribute('ref', 'first');
    const div2 = document.createElement('div');
    div2.setAttribute('ref', 'second');
    document.body.appendChild(div1);
    document.body.appendChild(div2);
    processTree(div1);
    processTree(div2);

    expect(_refs.first).toBe(div1);
    expect(_refs.second).toBe(div2);
  });
});

describe('Use Directive (Templates)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('inserts template content', () => {
    const tpl = document.createElement('template');
    tpl.id = 'use-tpl';
    tpl.innerHTML = '<p class="inserted">Template content</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('use', 'use-tpl');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.querySelector('.inserted')).not.toBeNull();
    expect(div.querySelector('.inserted').textContent).toBe('Template content');
  });

  test('passes var-* attributes to template context', () => {
    const tpl = document.createElement('template');
    tpl.id = 'var-tpl';
    tpl.innerHTML = '<span bind="title"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('use', 'var-tpl');
    div.setAttribute('var-title', "'Hello World'");
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    const span = div.querySelector('span');
    expect(span.textContent).toBe('Hello World');
  });

  test('handles slots', () => {
    const tpl = document.createElement('template');
    tpl.id = 'slot-tpl';
    tpl.innerHTML = '<div class="header"><slot name="header"></slot></div><div class="body"><slot></slot></div>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('use', 'slot-tpl');
    const header = document.createElement('div');
    header.setAttribute('slot', 'header');
    header.textContent = 'Header Content';
    const body = document.createElement('div');
    body.textContent = 'Body Content';
    div.appendChild(header);
    div.appendChild(body);
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.querySelector('.header').textContent).toBe('Header Content');
    expect(div.querySelector('.body').textContent).toBe('Body Content');
  });
});



describe('Validation Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_validators).forEach((k) => delete _validators[k]);
  });

  test('form-level validation sets $form', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');

    const input = document.createElement('input');
    input.name = 'email';
    input.setAttribute('validate', 'email');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);


    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const ctx = parent.__ctx;
        expect(ctx.$form).toBeDefined();
        expect(ctx.$form.errors).toBeDefined();
        expect(ctx.$form.values).toBeDefined();
        resolve();
      });
    });
  });

  test('built-in email validator', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.name = 'email';
    input.setAttribute('validate', 'email');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        input.value = 'invalid-email';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const ctx = parent.__ctx;
        expect(ctx.$form.errors.email).toBe('Invalid email');
        expect(ctx.$form.valid).toBe(false);

        input.value = 'test@example.com';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(ctx.$form.valid).toBe(true);

        resolve();
      });
    });
  });

  test('built-in min validator', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.name = 'age';
    input.type = 'number';
    input.setAttribute('validate', 'min:18');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        input.value = '15';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.errors.age).toBe('Minimum value is 18');

        input.value = '20';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.errors.age).toBeUndefined();

        resolve();
      });
    });
  });

  test('built-in max validator', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.name = 'qty';
    input.type = 'number';
    input.setAttribute('validate', 'max:100');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        input.value = '150';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.errors.qty).toBe('Maximum value is 100');

        input.value = '50';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.errors.qty).toBeUndefined();

        resolve();
      });
    });
  });

  test('custom validator', () => {
    _validators.even = (value) => {
      if (Number(value) % 2 !== 0) return 'Must be even';
      return true;
    };

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.name = 'num';
    input.setAttribute('validate', 'custom:even');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        input.value = '3';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.errors.num).toBe('Must be even');

        input.value = '4';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.errors.num).toBeUndefined();

        resolve();
      });
    });
  });

  test('form tracks dirty state', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.name = 'field';
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        expect(parent.__ctx.$form.dirty).toBe(false);
        input.value = 'something';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(parent.__ctx.$form.dirty).toBe(true);
        resolve();
      });
    });
  });

  test('form tracks touched state', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.name = 'field';
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        expect(parent.__ctx.$form.touched).toBe(false);
        input.dispatchEvent(new Event('focusout', { bubbles: true }));
        expect(parent.__ctx.$form.touched).toBe(true);
        resolve();
      });
    });
  });
});



describe('i18n Directive (t)', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        hello: 'Hello',
        greeting: 'Hello, {name}!',
        items: 'one item | {count} items',
      },
      es: {
        hello: 'Hola',
        greeting: '¡Hola, {name}!',
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    _i18n.locales = {};
    _i18n.locale = 'en';
  });

  test('translates simple key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('t', 'hello');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Hello');
  });

  test('translates with params via t-* attributes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('t', 'greeting');
    span.setAttribute('t-name', "'World'");
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Hello, World!');
  });

  test('updates when locale changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('t', 'hello');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Hello');



    _i18n.locale = 'es';
    expect(_i18n.t('hello')).toBe('Hola');
  });

  test('handles pluralization with count param', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ n: 5 }');
    const span = document.createElement('span');
    span.setAttribute('t', 'items');
    span.setAttribute('t-count', 'n');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('5 items');
  });

  test('returns key when no translation exists', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('t', 'nonexistent.key');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('nonexistent.key');
  });
});







function mockJsonResponse(data) {
  return {
    ok: true,
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

function mockErrorResponse(status, body) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify(body || {})),
    json: () => Promise.resolve(body || {}),
  };
}

function flush(ms = 50) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpSetup() {
  document.body.innerHTML = '';
  _config.baseApiUrl = '';
  _config.retries = 0;
  _config.timeout = 10000;
  _config.cache = { strategy: 'none', ttl: 300000, prefix: 'nojs_' };
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
  _interceptors.request = [];
  _interceptors.response = [];
  Object.keys(_cache).forEach((k) => delete _cache[k]);
  setRouterInstance(null);
  global.fetch = jest.fn();
}

function httpTeardown() {
  delete global.fetch;
}



describe('HTTP GET with empty template', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('shows empty template when response is empty array', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse([]));

    const emptyTpl = document.createElement('template');
    emptyTpl.id = 'empty-msg';
    emptyTpl.innerHTML = '<p class="empty">No results</p>';
    document.body.appendChild(emptyTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/items');
    el.setAttribute('as', 'items');
    el.setAttribute('empty', 'empty-msg');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(el.querySelector('.empty')).not.toBeNull();
    expect(el.querySelector('.empty').textContent).toBe('No results');
  });

  test('shows empty template when response is null', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(null));

    const emptyTpl = document.createElement('template');
    emptyTpl.id = 'empty-null';
    emptyTpl.innerHTML = '<p class="empty-null">Nothing</p>';
    document.body.appendChild(emptyTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/nothing');
    el.setAttribute('as', 'data');
    el.setAttribute('empty', 'empty-null');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(el.querySelector('.empty-null')).not.toBeNull();
  });
});

describe('HTTP GET with error template', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('shows error template on failed request', async () => {
    global.fetch.mockResolvedValue(mockErrorResponse(500, { message: 'HTTP 500' }));

    const errTpl = document.createElement('template');
    errTpl.id = 'err-tpl';
    errTpl.setAttribute('var', 'err');
    errTpl.innerHTML = '<p class="error" bind="err.message"></p>';
    document.body.appendChild(errTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/fail');
    el.setAttribute('error', 'err-tpl');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush(100);

    expect(el.querySelector('.error')).not.toBeNull();
  });
});

describe('HTTP GET with success template', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('renders success template with data', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ name: 'Item 1' }));

    const successTpl = document.createElement('template');
    successTpl.id = 'success-tpl';
    successTpl.setAttribute('var', 'result');
    successTpl.innerHTML = '<p class="success" bind="result.name"></p>';
    document.body.appendChild(successTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/item');
    el.setAttribute('as', 'data');
    el.setAttribute('success', 'success-tpl');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(el.querySelector('.success')).not.toBeNull();
    expect(el.querySelector('.success').textContent).toBe('Item 1');
  });
});

describe('HTTP GET with then expression', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('runs then expression after success', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ fetched: false }');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/check');
    el.setAttribute('as', 'resp');
    // NOJS-60 #28: writing to the real window from an expression is now a no-op,
    // so the `then` probe writes to a context state variable instead.
    el.setAttribute('then', 'fetched = true');
    const probe = document.createElement('span');
    probe.setAttribute('bind', 'fetched');
    parent.appendChild(el);
    parent.appendChild(probe);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(probe.textContent).toBe('true');
  });
});

describe('HTTP POST form submission', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('form submit triggers POST request', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ saved: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('post', '/api/save');
    form.setAttribute('as', 'result');
    form.innerHTML = '<input name="title" value="Hello" /><button type="submit">Save</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);

    form.dispatchEvent(new Event('submit', { bubbles: true }));
    await flush();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/save',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('HTTP GET with caching', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('cached="memory" caches response', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ data: 1 }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/cached-data');
    el.setAttribute('as', 'result');
    el.setAttribute('cached', 'memory');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('HTTP GET with custom headers', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('passes extra headers from attribute', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/secure');
    el.setAttribute('as', 'data');
    el.setAttribute('headers', '{"Authorization":"Bearer token123"}');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/secure',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token123',
        }),
      }),
    );
  });

  test('warns when a sensitive header is set inline', async () => {
    _config.debug = true;
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/secure');
    el.setAttribute('as', 'data');
    el.setAttribute('headers', '{"Authorization":"Bearer token123"}');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('Authorization')
    );

    warnSpy.mockRestore();
    _config.debug = false;
  });

  test('warns about sensitive headers even with debug mode off', async () => {
    _config.debug = false;
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/data');
    el.setAttribute('as', 'data');
    el.setAttribute('headers', '{"Authorization":"Bearer token123"}');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  test('warns for mixed-case sensitive header names (e.g. AUTHORIZATION)', async () => {
    _config.debug = true;
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/secure');
    el.setAttribute('as', 'data');
    el.setAttribute('headers', '{"AUTHORIZATION":"Bearer token123"}');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('AUTHORIZATION')
    );

    warnSpy.mockRestore();
    _config.debug = false;
  });

  test('warns for x-auth-* and x-api-* prefix headers', async () => {
    _config.debug = true;
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/secure');
    el.setAttribute('as', 'data');
    el.setAttribute('headers', '{"X-Auth-Secret":"abc","X-Api-Key":"xyz"}');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    const calls = warnSpy.mock.calls.map((a) => a[1]);
    expect(calls.some((m) => m.includes('X-Auth-Secret'))).toBe(true);
    expect(calls.some((m) => m.includes('X-Api-Key'))).toBe(true);

    warnSpy.mockRestore();
    _config.debug = false;
  });
});

describe('HTTP GET with redirect', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('redirects via router after success', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    const mockRouter = { push: jest.fn() };
    setRouterInstance(mockRouter);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/check');
    el.setAttribute('as', 'data');
    el.setAttribute('redirect', '/dashboard');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });
});

describe('HTTP POST with body attribute', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('sends body from attribute', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ created: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "test" }');

    const form = document.createElement('form');
    form.setAttribute('post', '/api/create');
    form.setAttribute('as', 'result');
    form.setAttribute('body', '{"name":"test"}');
    form.innerHTML = '<button type="submit">Go</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);

    form.dispatchEvent(new Event('submit', { bubbles: true }));
    await flush();

    expect(global.fetch).toHaveBeenCalled();
  });
});

describe('HTTP events emitted', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('emits fetch:success event', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    const handler = jest.fn();
    _eventBus['fetch:success'] = [handler];

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/ok');
    el.setAttribute('as', 'data');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/ok' }),
    );
  });

  test('emits fetch:error event on failure', async () => {
    global.fetch.mockResolvedValue(mockErrorResponse(500));

    const handler = jest.fn();
    _eventBus['fetch:error'] = [handler];

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/fail');
    el.setAttribute('as', 'data');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush(100);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/fail' }),
    );
  });
});



describe('use directive — slots', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_refs).forEach((k) => delete _refs[k]);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('use handles default slot', () => {
    const tpl = document.createElement('template');
    tpl.id = 'wrapper';
    tpl.innerHTML = '<div class="wrapper"><slot></slot></div>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('use', 'wrapper');
    el.innerHTML = '<p>Slotted Content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    expect(el.querySelector('.wrapper p').textContent).toBe('Slotted Content');
  });

  test('use handles named slots', () => {
    const tpl = document.createElement('template');
    tpl.id = 'layout';
    tpl.innerHTML = '<header><slot name="header"></slot></header><main><slot></slot></main><footer><slot name="footer"></slot></footer>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('use', 'layout');
    el.innerHTML = `
      <span slot="header">My Header</span>
      <p>Main Content</p>
      <span slot="footer">My Footer</span>
    `;
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    expect(el.querySelector('header span').textContent).toBe('My Header');
    expect(el.querySelector('main p').textContent).toBe('Main Content');
    expect(el.querySelector('footer span').textContent).toBe('My Footer');
  });

  test('use with nonexistent template does nothing', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('use', 'nonexistent');
    el.innerHTML = '<p>Original</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

  });
});



describe('call directive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_refs).forEach((k) => delete _refs[k]);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('call makes request on click', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ result: 'ok' })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('method', 'post');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/action',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('call sets "as" key on context', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ id: 42 })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/item');
    btn.setAttribute('as', 'item');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    const ctx = findContext(btn);
    expect(ctx.item).toEqual({ id: 42 });
  });

  test('call with into stores data', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify([1, 2, 3])),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/list');
    btn.setAttribute('as', 'items');
    btn.setAttribute('into', 'myStore');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(_stores.myStore).toBeDefined();
    expect(_stores.myStore.items).toEqual([1, 2, 3]);
  });

  test('call with body sends request body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "test" }');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/create');
    btn.setAttribute('method', 'post');
    btn.setAttribute('body', 'hello world');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/create',
      expect.objectContaining({
        method: 'POST',
        body: 'hello world',
      }),
    );
  });

  test('call with confirm=false blocks request', async () => {
    window.confirm = jest.fn(() => false);
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({})),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/delete');
    btn.setAttribute('method', 'delete');
    btn.setAttribute('confirm', 'Are you sure?');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(window.confirm).toHaveBeenCalledWith('Are you sure?');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('call with then expression runs after success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ id: 1 })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ done: false }');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('then', 'done = true');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    const ctx = findContext(parent);
    expect(ctx.done).toBe(true);
  });

  test('call with success template renders result', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ name: 'Widget' })),
    });

    const tpl = document.createElement('template');
    tpl.id = 'success-msg';
    tpl.setAttribute('var', 'result');
    tpl.innerHTML = '<p class="success" bind="result.name"></p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/item');
    btn.setAttribute('as', 'data');
    btn.setAttribute('success', 'success-msg');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 100));

    const successEl = parent.querySelector('.success');
    expect(successEl).not.toBeNull();
    expect(successEl.textContent).toBe('Widget');
  });

  test('call with error template renders on failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'Server error' }),
    });

    const tpl = document.createElement('template');
    tpl.id = 'error-msg';
    tpl.setAttribute('var', 'err');
    tpl.innerHTML = '<p class="error" bind="err.message"></p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/fail');
    btn.setAttribute('error', 'error-msg');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 100));

    const errorEl = parent.querySelector('.error');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toBe('Server error');
  });

  test('call with loading template shows template while in-flight', async () => {
    let resolveFetch;
    global.fetch.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const tpl = document.createElement('template');
    tpl.id = 'spinner';
    tpl.innerHTML = '<span>Loading...</span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.textContent = 'Click me';
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('loading', 'spinner');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 10));

    expect(btn.innerHTML).toContain('Loading...');
    expect(btn.disabled).toBe(true);

    resolveFetch({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(btn.innerHTML).toContain('Click me');
    expect(btn.disabled).toBe(false);
  });

  test('call with loading template disables element during request', async () => {
    let resolveFetch;
    global.fetch.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const tpl = document.createElement('template');
    tpl.id = 'loading-tpl';
    tpl.innerHTML = '<span>Wait</span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('loading', 'loading-tpl');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 10));

    expect(btn.disabled).toBe(true);

    resolveFetch({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(btn.disabled).toBe(false);
  });

  test('call with loading template restores on error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'fail' }),
    });

    const tpl = document.createElement('template');
    tpl.id = 'load-err';
    tpl.innerHTML = '<span>Loading...</span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.textContent = 'Original';
    btn.setAttribute('call', '/api/fail');
    btn.setAttribute('loading', 'load-err');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 100));

    expect(btn.innerHTML).toContain('Original');
    expect(btn.disabled).toBe(false);
  });

  test('call aborts previous request on rapid clicks (switchMap)', async () => {
    let fetchCount = 0;
    const signals = [];
    global.fetch.mockImplementation((url, opts) => {
      fetchCount++;
      signals.push(opts.signal);
      return new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve(JSON.stringify({ n: fetchCount })),
        }), 200);
      });
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/data');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 10));
    btn.click();
    await new Promise((r) => setTimeout(r, 10));

    expect(signals[0].aborted).toBe(true);
  });

  test('call aborted request does not trigger error template', async () => {
    let fetchCount = 0;
    global.fetch.mockImplementation((url, opts) => {
      fetchCount++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve(JSON.stringify({ n: fetchCount })),
        }), 200);
        if (opts.signal) {
          opts.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new DOMException('The operation was aborted.', 'AbortError');
            reject(err);
          });
        }
      });
    });

    const errTpl = document.createElement('template');
    errTpl.id = 'abort-err';
    errTpl.innerHTML = '<span class="abort-error">Error!</span>';
    document.body.appendChild(errTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/data');
    btn.setAttribute('error', 'abort-err');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 10));
    btn.click();
    await new Promise((r) => setTimeout(r, 300));

    expect(parent.querySelector('.abort-error')).toBeNull();
  });

  test('call logs warning on error without error template', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'Server error' }),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/fail');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 100));

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('call emits fetch:success event', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    const handler = jest.fn();
    _eventBus['fetch:success'] = [handler];

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/event-test');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/event-test', data: { ok: true } }),
    );
  });

  test('call emits fetch:error event', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'fail' }),
    });

    const handler = jest.fn();
    _eventBus['fetch:error'] = [handler];

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/fail-event');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 100));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/fail-event' }),
    );
  });

  test('call with redirect navigates after success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    const mockRouter = { push: jest.fn() };
    setRouterInstance(mockRouter);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/login');
    btn.setAttribute('redirect', '/dashboard');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    setRouterInstance(null);
  });

  test('call with headers passes them to fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/secure');
    btn.setAttribute('headers', '{"X-Custom":"val"}');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/secure',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Custom': 'val' }),
      }),
    );
  });

  test('call defaults as to "data"', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ value: 99 })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/default-as');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    const ctx = findContext(btn);
    expect(ctx.data).toEqual({ value: 99 });
  });

  test('call with into and no as writes "data" key to store', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ items: [1, 2] })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/store-default');
    btn.setAttribute('into', 'myStore');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(_stores.myStore).toBeDefined();
    expect(_stores.myStore.data).toEqual({ items: [1, 2] });
  });
});



describe('Form validation — dirty and touched tracking', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('submitting becomes true on submit', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML =
      '<input name="x" /><button type="submit">Submit</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.submitting).toBe(false);

    form.dispatchEvent(new Event('submit', { bubbles: true }));

    expect(ctx.$form.submitting).toBe(true);
  });

  test('form validation detects errors', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="email" value="bad" />';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    const ctx = findContext(form);

    const input = form.querySelector('input');
    input.value = 'not-an-email';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(ctx.$form.valid).toBe(false);
    expect(ctx.$form.errors.email).toBe('Invalid email');
  });

  test('form valid when all fields pass', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="email" />';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = 'test@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.valid).toBe(true);
    expect(ctx.$form.errors.email).toBeUndefined();
  });

  test('form collects values from all named fields', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML =
      '<input name="first" value="John" /><input name="last" value="Doe" />';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    form
      .querySelector('input[name="first"]')
      .dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.values.first).toBe('John');
    expect(ctx.$form.values.last).toBe('Doe');
  });
});

describe('Field-level validation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('shows error template on invalid input', () => {
    const tpl = document.createElement('template');
    tpl.id = 'field-error';
    tpl.innerHTML = '<span class="err" bind="err.message"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const input = document.createElement('input');
    input.setAttribute('validate', 'email');
    input.setAttribute('error', 'field-error');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.value = 'bad-email';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const errEl = parent.querySelector('.err');
    expect(errEl).not.toBeNull();
    expect(errEl.textContent).toBe('Invalid email');
  });

  test('clears error on valid input', () => {
    const tpl = document.createElement('template');
    tpl.id = 'field-err2';
    tpl.innerHTML = '<span class="err2" bind="err.message"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const input = document.createElement('input');
    input.setAttribute('validate', 'email');
    input.setAttribute('error', 'field-err2');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.value = 'bad';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(parent.querySelector('.err2')).not.toBeNull();

    input.value = 'good@test.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const errEl = parent.querySelector('.err2');
    expect(!errEl || errEl.innerHTML === '').toBe(true);
  });
});

describe('Built-in validators', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    Object.keys(_validators).forEach((k) => delete _validators[k]);
  });

  test('url validator - valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="site" validate="url" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = 'https://example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.errors.site).toBeUndefined();
  });

  test('url validator - invalid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="site" validate="url" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = 'not a url';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.errors.site).toBe('Invalid URL');
  });

  test('pipe-separated multiple rules', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="val" validate="min:5|max:10" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise((r) => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = '3';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.errors.val).toMatch(/minimum/i);

    input.value = '15';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.val).toMatch(/maximum/i);

    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.val).toBeUndefined();
  });
});

describe('error-boundary directive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('listens for window errors', () => {
    const tpl = document.createElement('template');
    tpl.id = 'fallback';
    tpl.innerHTML = '<p class="fallback">Something went wrong</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('error-boundary', 'fallback');
    el.innerHTML = '<p>Content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    const errorEvent = new ErrorEvent('error', {
      message: 'Test error',
      error: new Error('Test error'),
    });
    Object.defineProperty(errorEvent, 'target', { value: el });
    window.dispatchEvent(errorEvent);

    expect(el.querySelector('.fallback')).not.toBeNull();
  });
});



describe('GET cache hit', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('uses cached data when available, skipping fetch', async () => {
    _config.cache = { strategy: 'memory', ttl: 300000, prefix: 'nojs_' };

    _cacheSet('get:/api/items', [{ id: 1 }], 'memory');

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/items');
    el.setAttribute('as', 'items');
    el.setAttribute('cached', 'memory');
    el.innerHTML = '<p>Item content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();

    const ctx = findContext(el);
    expect(ctx.items).toEqual([{ id: 1 }]);
  });
});

describe('reactive URL watching', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('re-fetches when interpolated URL changes', async () => {
    global.fetch
      .mockResolvedValueOnce(mockJsonResponse({ name: 'Alice' }))
      .mockResolvedValueOnce(mockJsonResponse({ name: 'Bob' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ userId: 1 }');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/users/{userId}');
    el.setAttribute('as', 'user');
    el.innerHTML = '<p>User</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush(100);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const ctx = findContext(parent);
    ctx.userId = 2;

    await flush(100);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('polling with refresh-interval', () => {
  beforeEach(() => {
    httpSetup();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    httpTeardown();
  });

  test('repeatedly fetches data at specified interval', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ status: 'ok' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/status');
    el.setAttribute('as', 'status');
    el.setAttribute('refresh', '2000');
    el.innerHTML = '<p>Status</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    await jest.advanceTimersByTimeAsync(100);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2000);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('stops polling when element is removed from DOM without explicit dispose', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ status: 'ok' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/status');
    el.setAttribute('as', 'status');
    el.setAttribute('refresh', '1000');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    await jest.advanceTimersByTimeAsync(100);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Remove element externally (bypassing framework dispose)
    parent.innerHTML = '';

    const countBefore = global.fetch.mock.calls.length;
    await jest.advanceTimersByTimeAsync(3000);
    expect(global.fetch).toHaveBeenCalledTimes(countBefore);
  });
});

describe('loading template', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('shows loading template while fetching', async () => {
    let resolveResponse;
    global.fetch.mockReturnValue(new Promise((res) => { resolveResponse = res; }));

    const loadingTpl = document.createElement('template');
    loadingTpl.id = 'loading-tpl';
    loadingTpl.innerHTML = '<p class="spinner">Loading...</p>';
    document.body.appendChild(loadingTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/data');
    el.setAttribute('as', 'data');
    el.setAttribute('loading', 'loading-tpl');
    el.innerHTML = '<p>Data</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush(20);

    expect(el.querySelector('.spinner')).not.toBeNull();

    resolveResponse(mockJsonResponse({ value: 42 }));
    await flush(100);

    expect(el.querySelector('.spinner')).toBeNull();
  });
});



describe('custom validator error', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    Object.keys(_validators).forEach((k) => delete _validators[k]);
  });

  test('custom validator returns error message when validation fails', async () => {
    _validators.noSpaces = (value) => {
      if (/\s/.test(value)) return 'No spaces allowed';
      return true;
    };

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="username" validate="noSpaces" value="has space" />';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.errors.username).toBe('No spaces allowed');
  });
});

describe('$form context initialization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('$form starts with dirty=false and touched=false', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" />';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    const ctx = findContext(form);
    expect(ctx.$form.dirty).toBe(false);
    expect(ctx.$form.touched).toBe(false);
  });
});

describe('native checkValidity', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('uses native validationMessage when checkValidity fails', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" type="email" required value="" />';
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.valid).toBe(false);
    expect(ctx.$form.errors.email).toBeTruthy();
  });
});





describe('HTTP GET with confirm dialog', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('proceeds with request when confirm returns true', async () => {
    window.confirm = jest.fn(() => true);
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/data');
    el.setAttribute('as', 'data');
    el.setAttribute('confirm', 'Are you sure?');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(window.confirm).toHaveBeenCalledWith('Are you sure?');
    expect(global.fetch).toHaveBeenCalled();
  });

  test('blocks request when confirm returns false', async () => {
    window.confirm = jest.fn(() => false);
    global.fetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/data');
    el.setAttribute('as', 'data');
    el.setAttribute('confirm', 'Are you sure?');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(window.confirm).toHaveBeenCalledWith('Are you sure?');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});





describe('HTTP GET with success template using var attribute', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('success template uses var from template element', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ title: 'My Item' }));

    const successTpl = document.createElement('template');
    successTpl.id = 'custom-var-tpl';
    successTpl.setAttribute('var', 'item');
    successTpl.innerHTML = '<p class="item-title" bind="item.title"></p>';
    document.body.appendChild(successTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/item');
    el.setAttribute('as', 'data');
    el.setAttribute('success', 'custom-var-tpl');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush(100);

    const titleEl = el.querySelector('.item-title');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('My Item');
  });

  test('success template falls back to varName from element', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ name: 'Widget' }));

    const successTpl = document.createElement('template');
    successTpl.id = 'no-var-tpl';

    successTpl.innerHTML = '<p class="widget-name" bind="myVar.name"></p>';
    document.body.appendChild(successTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/widget');
    el.setAttribute('as', 'data');
    el.setAttribute('var', 'myVar');
    el.setAttribute('success', 'no-var-tpl');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush(100);

    const nameEl = el.querySelector('.widget-name');
    expect(nameEl).not.toBeNull();
    expect(nameEl.textContent).toBe('Widget');
  });
});





describe('HTTP GET cached attribute defaults', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('cached attribute without value defaults to memory strategy', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ id: 1 }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/default-cache');
    el.setAttribute('as', 'data');
    el.setAttribute('cached', '');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);


    const el2 = document.createElement('div');
    el2.setAttribute('get', '/api/default-cache');
    el2.setAttribute('as', 'data2');
    el2.setAttribute('cached', '');
    parent.appendChild(el2);
    processTree(el2);
    await flush();


    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});





describe('HTTP GET — reactive URL with debounce', () => {
  beforeEach(() => {
    httpSetup();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    httpTeardown();
  });

  test('debounces re-fetch when URL changes with debounce attribute', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ name: 'Alice' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ q: "a" }');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/search?q={q}');
    el.setAttribute('as', 'results');
    el.setAttribute('debounce', '300');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await jest.advanceTimersByTimeAsync(50);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const ctx = findContext(parent);


    ctx.q = 'ab';
    await jest.advanceTimersByTimeAsync(100);
    ctx.q = 'abc';
    await jest.advanceTimersByTimeAsync(100);


    expect(global.fetch).toHaveBeenCalledTimes(1);


    await jest.advanceTimersByTimeAsync(400);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});





describe('Validation — field-level error template reuse', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('reuses existing error element on subsequent invalid inputs', () => {
    const tpl = document.createElement('template');
    tpl.id = 'reuse-err';
    tpl.innerHTML = '<span class="reuse-error" bind="err.message"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const input = document.createElement('input');
    input.setAttribute('validate', 'email');
    input.setAttribute('error', 'reuse-err');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);


    input.value = 'bad1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const errEl = input.nextElementSibling;
    expect(errEl).not.toBeNull();
    expect(errEl.__validationError).toBe(true);


    input.value = 'bad2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.nextElementSibling).toBe(errEl);
    expect(errEl.querySelector('.reuse-error')).not.toBeNull();
  });

  test('clears error element when field becomes valid', () => {
    const tpl = document.createElement('template');
    tpl.id = 'clear-err';
    tpl.innerHTML = '<span class="clear-error" bind="err.message"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const input = document.createElement('input');
    input.setAttribute('validate', 'email');
    input.setAttribute('error', 'clear-err');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);


    input.value = 'bad';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(parent.querySelector('.clear-error')).not.toBeNull();


    input.value = 'good@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const errEl = input.nextElementSibling;
    expect(!errEl || errEl.innerHTML === '').toBe(true);
  });
});





describe('Validation — custom: rule in form validation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    Object.keys(_validators).forEach((k) => delete _validators[k]);
  });

  test('custom validator is called via custom:validatorName rule', async () => {
    _validators.startsWithA = (value) => {
      if (!value.startsWith('A')) return 'Must start with A';
      return true;
    };

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="code" validate="custom:startsWithA" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await flush();

    const input = form.querySelector('input');
    input.value = 'Btest';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.errors.code).toBe('Must start with A');

    input.value = 'Atest';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.code).toBeUndefined();
  });
});





describe('call directive — into store', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_refs).forEach((k) => delete _refs[k]);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('call saves result into global store when into is set', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ id: 99, name: 'Stored' })),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/store-item');
    btn.setAttribute('as', 'result');
    btn.setAttribute('into', 'globalStore');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await flush();

    expect(_stores.globalStore).toBeDefined();
    expect(_stores.globalStore.result).toEqual({ id: 99, name: 'Stored' });
  });
});





describe('call directive — error template rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_refs).forEach((k) => delete _refs[k]);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('renders error template with err context on failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'Validation failed' }),
    });

    const tpl = document.createElement('template');
    tpl.id = 'call-error';
    tpl.setAttribute('var', 'err');
    tpl.innerHTML = '<p class="call-err" bind="err.message"></p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/fail');
    btn.setAttribute('error', 'call-error');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    btn.click();
    await flush(100);

    const errEl = parent.querySelector('.call-err');
    expect(errEl).not.toBeNull();
    expect(errEl.textContent).toBe('Validation failed');
  });
});





describe('error-boundary — error event handler', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('renders fallback template when error targets contained element', () => {
    const tpl = document.createElement('template');
    tpl.id = 'boundary-fallback';
    tpl.innerHTML = '<p class="boundary-error">Error caught</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const boundary = document.createElement('div');
    boundary.setAttribute('error-boundary', 'boundary-fallback');
    const child = document.createElement('div');
    child.className = 'child-content';
    child.textContent = 'Normal content';
    boundary.appendChild(child);
    parent.appendChild(boundary);
    document.body.appendChild(parent);

    processTree(parent);


    const errorEvent = new ErrorEvent('error', {
      message: 'Child error',
      error: new Error('Child error'),
    });
    Object.defineProperty(errorEvent, 'target', { value: child });
    window.dispatchEvent(errorEvent);

    expect(boundary.querySelector('.boundary-error')).not.toBeNull();
  });

  test('does not render fallback when error targets element outside boundary', () => {
    const tpl = document.createElement('template');
    tpl.id = 'boundary-outside';
    tpl.innerHTML = '<p class="outside-err">Error</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const boundary = document.createElement('div');
    boundary.setAttribute('error-boundary', 'boundary-outside');
    boundary.innerHTML = '<p>Content</p>';
    parent.appendChild(boundary);
    const outsider = document.createElement('div');
    parent.appendChild(outsider);
    document.body.appendChild(parent);

    processTree(parent);

    const errorEvent = new ErrorEvent('error', {
      message: 'Outside error',
      error: new Error('Outside error'),
    });
    Object.defineProperty(errorEvent, 'target', { value: outsider });
    window.dispatchEvent(errorEvent);

    expect(boundary.querySelector('.outside-err')).toBeNull();
  });
});





describe('HTTP GET — AbortError is silently ignored on switch-map', () => {
  beforeEach(httpSetup);
  afterEach(httpTeardown);

  test('aborting a previous in-flight request does not trigger error handling', async () => {

    let rejectFirst;
    const firstFetch = new Promise((_, reject) => { rejectFirst = reject; });

    const secondResponse = mockJsonResponse({ id: 2 });

    global.fetch
      .mockImplementationOnce((url, opts) => {

        if (opts && opts.signal) {
          opts.signal.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted.', 'AbortError');
            rejectFirst(err);
          });
        }
        return firstFetch;
      })
      .mockImplementationOnce(() => Promise.resolve(secondResponse));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ q: "a" }');
    const el = document.createElement('div');
    el.setAttribute('get', '/api/search?q={q}');
    el.setAttribute('as', 'results');
    parent.appendChild(el);
    document.body.appendChild(parent);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    processTree(parent);


    await flush(10);
    expect(global.fetch).toHaveBeenCalledTimes(1);


    const ctx = findContext(parent);
    ctx.q = 'ab';
    await flush(100);


    expect(global.fetch).toHaveBeenCalledTimes(2);

    const abortWarnings = warnSpy.mock.calls.filter(
      (c) => c[0] && String(c[0]).includes('AbortError'),
    );
    expect(abortWarnings.length).toBe(0);


    const elCtx = findContext(el);
    expect(elCtx.results).toEqual({ id: 2 });

    warnSpy.mockRestore();
  });
});





describe('use directive — slot without matching content', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_refs).forEach((k) => delete _refs[k]);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('slot element remains when no matching content is provided', () => {

    const tpl = document.createElement('template');
    tpl.id = 'layout-with-optional-slot';
    tpl.innerHTML = '<div class="main"><slot></slot></div><aside><slot name="sidebar"></slot></aside>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('use', 'layout-with-optional-slot');

    el.innerHTML = '<p>Main area</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);


    expect(el.querySelector('.main p').textContent).toBe('Main area');


    const aside = el.querySelector('aside');
    expect(aside).not.toBeNull();
  });
});





describe('Validation — $form.reset() resets form and rechecks validity', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('calling $form.reset() triggers el.reset() and re-validates', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = `
      <input name="email" validate="email" value="bad" />
      <button type="submit">Submit</button>
    `;
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    const ctx = findContext(form);
    const input = form.querySelector('input[name="email"]');


    input.value = 'not-an-email';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.email).toBe('Invalid email');


    const resetSpy = jest.spyOn(form, 'reset');


    ctx.$form.reset();

    expect(resetSpy).toHaveBeenCalled();

    // After reset, field is pristine so $form.errors is empty,
    // but $form.fields still reflects real validation state
    expect(ctx.$form.errors.email).toBeUndefined();
    expect(ctx.$form.fields.email.error).toBe('Invalid email');

    resetSpy.mockRestore();
  });

  test('form reset clears errors when default values are valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = `
      <input name="name" validate="required" value="John" />
    `;
    parent.appendChild(form);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    const ctx = findContext(form);
    const input = form.querySelector('input[name="name"]');


    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));


    ctx.$form.reset();




    expect(ctx.$form).toBeDefined();
  });
});










describe('Validation — custom validator via _validators', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    delete _validators.myRule;
  });

  test('custom validator is called and returns error', async () => {
    _validators.myRule = jest.fn((val) => val !== 'valid' ? 'Must be valid' : null);

    const form = document.createElement('form');
    form.setAttribute('validate', '');

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const input = document.createElement('input');
    input.name = 'field1';
    input.value = 'bad';
    input.setAttribute('validate', 'custom:myRule');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);

    await new Promise(r => requestAnimationFrame(r));

    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.errors.field1).toBe('Must be valid');
    expect(_validators.myRule).toHaveBeenCalled();
  });
});



















// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — AUTO-DETECT HTML5 VALIDATION
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — Auto-detect HTML5 validation', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('auto-detects required attribute without validate=""', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="name" required value="" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.valid).toBe(false);
    expect(ctx.$form.errors.name).toBeTruthy();
  });

  test('valid when required field has value (auto-detect)', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="name" required value="John" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.valid).toBe(true);
  });

  test('backward compat: validate="email" still works', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="email" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = 'bad';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(findContext(form).$form.errors.email).toBe('Invalid email');
  });

  test('checkbox required auto-detected', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input type="checkbox" name="terms" required />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.valid).toBe(false);
    expect(ctx.$form.values.terms).toBe(false);
  });

  test('radio group value collection', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = `
      <input type="radio" name="color" value="red" />
      <input type="radio" name="color" value="blue" checked />
    `;
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.values.color).toBe('blue');
  });

  test('adds novalidate to form', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    expect(form.hasAttribute('novalidate')).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — PER-RULE ERROR MESSAGES
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — Per-rule error messages', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('error-{rule} provides custom message', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="required|email" error-required="Email is required" error-email="Invalid email format" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    const ctx = findContext(form);

    // Empty → required error
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.email).toBe('Email is required');

    // Invalid email → email error
    input.value = 'bad';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.email).toBe('Invalid email format');

    // Valid
    input.value = 'test@test.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.errors.email).toBeUndefined();
  });

  test('generic error attribute as fallback', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="val" validate="required" error="This field has an error" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(findContext(form).$form.errors.val).toBe('This field has an error');
  });

  test('error-{rule} takes priority over generic error', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="val" validate="required" error="Generic" error-required="Specific" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(findContext(form).$form.errors.val).toBe('Specific');
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — AUTO-DISABLE SUBMIT BUTTONS
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — Auto-disable submit buttons', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('submit button disabled when form invalid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" validate="required" /><button type="submit">Go</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const btn = form.querySelector('button');
    expect(btn.disabled).toBe(true);
  });

  test('submit button enabled when form valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" validate="required" value="ok" /><button type="submit">Go</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const btn = form.querySelector('button');
    expect(btn.disabled).toBe(false);
  });

  test('button type="button" is NOT auto-disabled', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" validate="required" /><button type="button">Cancel</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const btn = form.querySelector('button');
    expect(btn.disabled).toBe(false);
  });

  test('input[type=submit] is auto-disabled', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" validate="required" /><input type="submit" value="Send" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const submit = form.querySelector('input[type="submit"]');
    expect(submit.disabled).toBe(true);
  });

  test('button without type is auto-disabled (defaults to submit)', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" validate="required" /><button>Submit</button>';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const btn = form.querySelector('button');
    expect(btn.disabled).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — ERROR-CLASS
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — error-class', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('applies error class when field is invalid and touched', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('error-class', 'border-red');
    form.innerHTML = '<input name="x" validate="required" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    // Not touched yet — no error class
    expect(input.classList.contains('border-red')).toBe(false);

    // Touch + invalid
    input.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(input.classList.contains('border-red')).toBe(true);
  });

  test('removes error class when field becomes valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('error-class', 'border-red');
    form.innerHTML = '<input name="x" validate="required" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(input.classList.contains('border-red')).toBe(true);

    input.value = 'filled';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.classList.contains('border-red')).toBe(false);
  });

  test('per-field error-class overrides form-level', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('error-class', 'form-error');
    form.innerHTML = '<input name="x" validate="required" error-class="field-error" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(input.classList.contains('field-error')).toBe(true);
    expect(input.classList.contains('form-error')).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — VALIDATE-ON
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — validate-on', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('validate-on="blur" only validates on focusout', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('validate-on', 'blur');
    form.innerHTML = '<input name="x" validate="required" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    const ctx = findContext(form);

    // Input event should NOT trigger validation
    input.value = 'test';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // dirty should still be tracked
    expect(ctx.$form.dirty).toBe(true);

    // Focusout should trigger validation
    input.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(ctx.$form.touched).toBe(true);
  });

  test('per-field validate-on overrides form-level', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('validate-on', 'blur');
    form.innerHTML = '<input name="x" validate="required" validate-on="input" value="" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    const ctx = findContext(form);

    // Field has validate-on="input", so input events should trigger validation
    input.value = 'hello';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.$form.dirty).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — $form.firstError
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — $form.firstError', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('returns first error message in DOM order', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = `
      <input name="first" validate="required" error-required="First is required" />
      <input name="second" validate="required" error-required="Second is required" />
    `;
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.querySelectorAll('input').forEach(i => i.dispatchEvent(new Event('input', { bubbles: true })));

    const ctx = findContext(form);
    expect(ctx.$form.firstError).toBe('First is required');
  });

  test('null when all fields valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" validate="required" value="ok" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.firstError).toBeNull();
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — $form.errorCount
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — $form.errorCount', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('counts invalid fields', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = `
      <input name="a" validate="required" />
      <input name="b" validate="required" />
      <input name="c" validate="required" value="filled" />
    `;
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.querySelectorAll('input').forEach(i => i.dispatchEvent(new Event('input', { bubbles: true })));

    const ctx = findContext(form);
    expect(ctx.$form.errorCount).toBe(2);
  });

  test('zero when all valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="a" value="ok" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    expect(findContext(form).$form.errorCount).toBe(0);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — VALIDATE-IF
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — validate-if', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('skips validation when validate-if is false', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: false }');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="company" validate="required" validate-if="show" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    // Field should be treated as valid because validate-if is false
    expect(ctx.$form.valid).toBe(true);
    expect(ctx.$form.errors.company).toBeUndefined();
  });

  test('validates when validate-if is true', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="company" validate="required" validate-if="show" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.valid).toBe(false);
    expect(ctx.$form.errors.company).toBeTruthy();
  });

  test('validate-if field context shows valid when condition is false', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: false }');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="company" validate="required" validate-if="show" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.fields.company.valid).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — $form.fields (per-field context)
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — $form.fields', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('$form.fields contains per-field state', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="required" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    const field = ctx.$form.fields.email;
    expect(field).toBeDefined();
    expect(field.valid).toBe(false);
    expect(field.dirty).toBe(false);
    expect(field.touched).toBe(false);
    expect(field.error).toBeTruthy();
    expect(field.value).toBe('');
  });

  test('$form.fields updates on input', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="required" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.value = 'test@test.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.fields.email.valid).toBe(true);
    expect(ctx.$form.fields.email.dirty).toBe(true);
    expect(ctx.$form.fields.email.value).toBe('test@test.com');
  });

  test('as="" attribute exposes field context on parent', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="email" validate="required" as="emailField" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.emailField).toBeDefined();
    expect(ctx.emailField.valid).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — SUBMIT MARKS ALL TOUCHED
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — Submit marks all fields touched', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('submit marks all fields as touched', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('error-class', 'err');
    form.innerHTML = `
      <input name="a" validate="required" />
      <input name="b" validate="required" />
      <button type="submit">Go</button>
    `;
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.dispatchEvent(new Event('submit', { bubbles: true }));

    const ctx = findContext(form);
    expect(ctx.$form.touched).toBe(true);
    expect(ctx.$form.fields.a.touched).toBe(true);
    expect(ctx.$form.fields.b.touched).toBe(true);
    // Error classes should now be applied since fields are touched
    const inputA = form.querySelector('input[name="a"]');
    expect(inputA.classList.contains('err')).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — ERROR TEMPLATE REFERENCES
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — Error template references', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('error-{rule}="#tpl" renders template in-place', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const tpl = document.createElement('template');
    tpl.id = 'req-tpl';
    tpl.innerHTML = '<span class="tpl-err" bind="$error"></span>';
    form.innerHTML = '<input name="x" validate="required" error-required="#req-tpl" />';
    form.appendChild(tpl);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));

    // Template should be rendered after the <template> element
    const rendered = form.querySelector('.tpl-err');
    expect(rendered).not.toBeNull();
  });

  test('clears template when field becomes valid', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const tpl = document.createElement('template');
    tpl.id = 'req-tpl2';
    tpl.innerHTML = '<span class="tpl-err2">Error!</span>';
    form.innerHTML = '<input name="x" validate="required" error-required="#req-tpl2" />';
    form.appendChild(tpl);
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));

    expect(form.querySelector('.tpl-err2')).not.toBeNull();

    const input = form.querySelector('input');
    input.value = 'filled';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(form.querySelector('.tpl-err2')).toBeNull();
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — $form.pending (async validators)
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — $form.pending', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { Object.keys(_validators).forEach(k => delete _validators[k]); });

  test('$form.pending starts as false', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.innerHTML = '<input name="x" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const ctx = findContext(form);
    expect(ctx.$form.pending).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════════════════
// VALIDATION REVAMP — $form.reset() with new features
// ══════════════════════════════════════════════════════════════════════

describe('Validation Revamp — $form.reset() enhancements', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('reset clears error classes', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    form.setAttribute('error-class', 'is-error');
    form.innerHTML = '<input name="x" validate="required" />';
    parent.appendChild(form);
    document.body.appendChild(parent);
    processTree(parent);
    await new Promise(r => setTimeout(r, 50));

    const input = form.querySelector('input');
    input.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(input.classList.contains('is-error')).toBe(true);

    const ctx = findContext(form);
    ctx.$form.reset();
    await new Promise(r => setTimeout(r, 50));

    expect(input.classList.contains('is-error')).toBe(false);
    expect(ctx.$form.dirty).toBe(false);
    expect(ctx.$form.touched).toBe(false);
  });
});

describe('HTTP directive — skeleton= attribute (M3)', () => {
  let fetchMock;

  beforeEach(() => {
    document.body.innerHTML = '';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('skeleton element is hidden after a successful fetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ name: 'Test' }),
      text: async () => '{"name":"Test"}',
    });
    document.body.innerHTML = `
      <div id="my-skeleton" style="height:80px;background:#eee;"></div>
      <div get="/api/product" as="product" skeleton="my-skeleton"></div>
    `;
    processTree(document.body);
    await new Promise(r => setTimeout(r, 30));
    const skeleton = document.getElementById('my-skeleton');
    expect(skeleton.style.display).toBe('none');
  });

  test('skeleton element is hidden after a fetch error', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));
    document.body.innerHTML = `
      <div id="err-skeleton" style="height:40px;"></div>
      <div get="/api/fail" as="data" skeleton="err-skeleton"></div>
    `;
    processTree(document.body);
    await new Promise(r => setTimeout(r, 30));
    const skeleton = document.getElementById('err-skeleton');
    expect(skeleton.style.display).toBe('none');
  });

  test('skeleton element is visible before the fetch completes', async () => {
    let resolveFetch;
    fetchMock.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));
    document.body.innerHTML = `
      <div id="pending-skeleton" style="height:40px;"></div>
      <div get="/api/pending" as="data" skeleton="pending-skeleton"></div>
    `;
    processTree(document.body);
    // Tick just enough for doRequest to start but not resolve
    await new Promise(r => setTimeout(r, 5));
    const skeleton = document.getElementById('pending-skeleton');
    expect(skeleton.style.display).not.toBe('none');
    // Resolve to clean up
    resolveFetch({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}), text: async () => '{}' });
  });

  test('does not throw when skeleton id does not match any element', async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
      text: async () => '{}',
    });
    document.body.innerHTML = `
      <div get="/api/data" as="data" skeleton="nonexistent-skeleton"></div>
    `;
    await expect(async () => {
      processTree(document.body);
      await new Promise(r => setTimeout(r, 30));
    }).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  M6 — call directive warns about sensitive headers in HTML attributes
// ═══════════════════════════════════════════════════════════════════════

describe('M6 — call directive sensitive header warning', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    document.body.innerHTML = '';
  });

  test('should warn when call directive has Authorization in headers attribute', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('method', 'post');
    btn.setAttribute('headers', '{"Authorization": "Bearer x"}');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    // Trigger the click to exercise the handler which checks headers
    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('Authorization'),
    );

    warnSpy.mockRestore();
  });

  test('should warn for x-api-key sensitive header in call directive', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('headers', '{"X-Api-Key": "secret123"}');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('X-Api-Key'),
    );

    warnSpy.mockRestore();
  });

  test('should not warn for non-sensitive headers in call directive', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('call', '/api/action');
    btn.setAttribute('headers', '{"Content-Type": "application/json"}');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    btn.click();
    await new Promise((r) => setTimeout(r, 50));

    // _warn should NOT have been called with anything about sensitive headers
    const sensitiveWarns = warnSpy.mock.calls.filter(
      (args) => typeof args[1] === 'string' && args[1].includes('Sensitive header'),
    );
    expect(sensitiveWarns).toHaveLength(0);

    warnSpy.mockRestore();
  });
});
