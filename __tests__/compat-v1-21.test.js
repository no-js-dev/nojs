// ═══════════════════════════════════════════════════════════════════════
//  v1.21.1 COMPATIBILITY SUITE (unit level)
//
//  Unit-level complement of e2e/tests/compat-v1-21.spec.ts. Every
//  expectation is the observable behavior of the v1.21.1 release; an app
//  that works on v1.21.1 must keep working unchanged.
//
//  Only APIs that exist in v1.21.1 are imported, so this file runs
//  unchanged against any later ref (see scripts/compat-check.sh).
//  Non-local-host devtools behavior lives in compat-v1-21-devtools-host.test.js
//  (it needs a different jsdom URL).
// ═══════════════════════════════════════════════════════════════════════

import NoJS from '../src/index.js';
import {
  _config,
  _globals,
  _globalOwners,
  _interceptors,
  _eventBus,
  _plugins,
} from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { _execStatement, _interpolate } from '../src/evaluate.js';
import { _doFetch } from '../src/fetch.js';
import { createContext } from '../src/context.js';
import { initDevtools, destroyDevtools } from '../src/devtools.js';

const flush = async (n = 10) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

function fakeResponse(status, body, headers = {}, url = 'http://localhost/') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    url,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  };
}

let realFetch;
let warnSpy;

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  _config.baseApiUrl = '';
  _config.headers = {};
  _config.csrf = null;
  _config.retries = 0;
  _config.devtools = false;
  _interceptors.request.length = 0;
  _interceptors.response.length = 0;
  Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
  for (const k in _globals) delete _globals[k];
  for (const k in _globalOwners) delete _globalOwners[k];
  _plugins.clear();
  realFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue(fakeResponse(200, { ok: true }));
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = realFetch;
  warnSpy.mockRestore();
});

// ═══════════════════════════════════════════════════════════════════════
//  #379 — NoJS.global()
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — NoJS.global() (#379)', () => {
  test('a global object is published as a reactive proxy with $set / $watch / $notify', () => {
    NoJS.global('theme', { mode: 'light' });
    const theme = _globals.theme;
    expect(theme.__isProxy).toBe(true);
    expect(typeof theme.$set).toBe('function');
    expect(typeof theme.$watch).toBe('function');
    expect(typeof theme.$notify).toBe('function');
  });

  test('$watch on the global fires when $set changes it', () => {
    NoJS.global('theme', { mode: 'light' });
    const theme = _globals.theme;
    const seen = [];
    theme.$watch(() => seen.push(theme.mode));
    theme.$set('mode', 'dark');
    expect(theme.mode).toBe('dark');
    expect(seen).toEqual(['dark']);
  });

  test('a template statement $theme.$set(...) updates bind="$theme.mode"', () => {
    NoJS.global('theme', { mode: 'light' });
    document.body.innerHTML = '<div state="{}"><span bind="$theme.mode"></span></div>';
    processTree(document.body);
    const span = document.querySelector('span');
    expect(span.textContent).toBe('light');
    _execStatement("$theme.$set('mode', 'dark')", document.querySelector('div').__ctx);
    expect(span.textContent).toBe('dark');
  });

  test('a global holding a Date is JSON-cloned: the Date becomes an ISO string', () => {
    NoJS.global('stamp', { at: new Date(Date.UTC(2020, 0, 2, 3, 4, 5)) });
    expect(_globals.stamp.at).toBe('2020-01-02T03:04:05.000Z');
  });

  test('data with a "constructor" field is accepted', () => {
    NoJS.global('meta', { name: 'x', constructor: 'y' });
    expect(_globals.meta).toBeDefined();
    expect(_globals.meta.name).toBe('x');
  });

  test('the global is a copy: mutating the source object afterwards does not change it', () => {
    const cfg = { title: 'orig', nested: { n: 1 } };
    NoJS.global('cfg', cfg);
    cfg.title = 'mutated';
    cfg.nested.n = 2;
    expect(_globals.cfg.title).toBe('orig');
    expect(_globals.cfg.nested.n).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #356 — config headers
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — config headers (#356)', () => {
  test('config headers are sent to an absolute URL on another origin', async () => {
    NoJS.config({ headers: { Authorization: 'Bearer t' } });
    await _doFetch('https://api.other.test/x');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.other.test/x');
    expect(opts.headers.Authorization).toBe('Bearer t');
  });

  test('config headers are sent to a base= origin that differs from the page', async () => {
    NoJS.config({ headers: { Authorization: 'Bearer t' } });
    document.body.innerHTML = '<div base="https://cdn.other.test/v1"><span></span></div>';
    await _doFetch('items', 'GET', null, {}, document.querySelector('span'));
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://cdn.other.test/v1/items');
    expect(opts.headers.Authorization).toBe('Bearer t');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #366 — interceptors and events
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — interceptors (#366)', () => {
  test('an app request interceptor receives the full URL, query tokens included', async () => {
    const seen = [];
    NoJS.interceptor('request', (url) => { seen.push(url); });
    await _doFetch('/compat/search?author=ann&keyword=x&token=abc');
    expect(seen).toEqual(['/compat/search?author=ann&keyword=x&token=abc']);
  });

  test('an app response interceptor sees X-Api-Version and Authorization response headers', async () => {
    global.fetch.mockResolvedValue(
      fakeResponse(200, { ok: true }, { 'X-Api-Version': '2', Authorization: 'Bearer server' }),
    );
    let seen = null;
    NoJS.interceptor('response', (response) => {
      seen = {
        version: response.headers.get('X-Api-Version'),
        auth: response.headers.get('Authorization'),
      };
    });
    await _doFetch('/compat/versioned');
    expect(seen).toEqual({ version: '2', auth: 'Bearer server' });
  });

  test('a custom csrf.header is visible to and settable by the request interceptor', async () => {
    NoJS.config({ csrf: { header: 'X-App-Csrf', token: 'csrf-1' } });
    let seen;
    NoJS.interceptor('request', (url, opts) => {
      seen = opts.headers['X-App-Csrf'];
      return { headers: { 'X-App-Csrf': 'csrf-2' } };
    });
    await _doFetch('/compat/csrf', 'POST', { a: 1 });
    expect(seen).toBe('csrf-1');
    expect(global.fetch.mock.calls[0][1].headers['X-App-Csrf']).toBe('csrf-2');
  });

  test('the fetch:error event payload carries the raw URL', async () => {
    global.fetch.mockResolvedValue(fakeResponse(500, { message: 'boom' }));
    const urls = [];
    NoJS.on('fetch:error', (payload) => urls.push(payload.url));
    document.body.innerHTML = '<div get="/compat/fail?author=ann&amp;token=abc" as="d"></div>';
    processTree(document.body);
    await flush();
    expect(urls).toEqual(['/compat/fail?author=ann&token=abc']);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #369 — body= / URL placeholder interpolation bytes
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — placeholder interpolation (#369)', () => {
  const ctx = () => createContext({ v: '..', dot: '.', n: 'a&b=c d', msg: 'hello world 100%' });

  test('"{v}" with v=".." interpolates to ".."', () => {
    expect(_interpolate('{v}', ctx())).toBe('..');
    expect(_interpolate('{dot}', ctx())).toBe('.');
  });

  test('"name={n}&x=1" percent-encodes the placeholder value only', () => {
    expect(_interpolate('name={n}&x=1', ctx())).toBe('name=a%26b%3Dc%20d&x=1');
  });

  test('"{msg}" percent-encodes spaces and %', () => {
    expect(_interpolate('{msg}', ctx())).toBe('hello%20world%20100%25');
  });

  test('post body="{v}" sends ".." on the wire', async () => {
    document.body.innerHTML = `<button state="{ v: '..' }" post="/compat/body" body="{v}">Send</button>`;
    processTree(document.body);
    document.querySelector('button').click();
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].body).toBe('..');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #357 — persist
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — persist (#357)', () => {
  test.each([
    ['persist-fields=""', 'persist-fields=""'],
    ['bare persist-fields', 'persist-fields'],
  ])('%s persists every field', (_, attr) => {
    document.body.innerHTML = `<div state="{ a: 1, b: 2 }" persist="localStorage" persist-key="k" ${attr}></div>`;
    processTree(document.body);
    const ctx = document.querySelector('div').__ctx;
    ctx.a = 11;
    expect(JSON.parse(localStorage.getItem('nojs_state_k'))).toEqual({ a: 11, b: 2 });
  });

  test.each([
    ['persist-fields=""', 'persist-fields=""'],
    ['bare persist-fields', 'persist-fields'],
  ])('%s restores every stored field', (_, attr) => {
    localStorage.setItem('nojs_state_k', JSON.stringify({ a: 5, b: 6 }));
    document.body.innerHTML = `<div state="{ a: 1, b: 2 }" persist="localStorage" persist-key="k" ${attr}></div>`;
    processTree(document.body);
    const ctx = document.querySelector('div').__ctx;
    expect(ctx.a).toBe(5);
    expect(ctx.b).toBe(6);
  });

  test('a declared $tab state key is written and restored', () => {
    document.body.innerHTML = `<div state="{ $tab: 'one' }" persist="localStorage" persist-key="tab"></div>`;
    processTree(document.body);
    document.querySelector('div').__ctx.$set('$tab', 'two');
    expect(JSON.parse(localStorage.getItem('nojs_state_tab'))).toEqual({ $tab: 'two' });

    document.body.innerHTML = `<div state="{ $tab: 'one' }" persist="localStorage" persist-key="tab"><span bind="$tab"></span></div>`;
    processTree(document.body);
    expect(document.querySelector('div').__ctx.$tab).toBe('two');
    expect(document.querySelector('span').textContent).toBe('two');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #371 — app/plugin directives overlapping core wildcard prefixes
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — prefixed custom directives (#371)', () => {
  test.each(['on:clickoutside', 'class-compatx', 'bind-compatchart', 'style-compatx'])(
    'NoJS.directive("%s") registered by the app runs',
    (name) => {
      const calls = [];
      NoJS.directive(name, { init: (el, n, value) => calls.push([n, value]) });
      document.body.innerHTML = `<div state="{}"><span ${name}="expr"></span></div>`;
      processTree(document.body);
      expect(calls).toEqual([[name, 'expr']]);
    },
  );

  test('a plugin can register bind-chart and it runs', () => {
    const calls = [];
    NoJS.use({
      name: 'compat-chart-unit',
      install(nojs) {
        nojs.directive('bind-chart', { init: (el, n, value) => calls.push([n, value]) });
      },
    });
    document.body.innerHTML = '<div state="{ s: [1] }"><canvas bind-chart="s"></canvas></div>';
    processTree(document.body);
    expect(calls).toEqual([['bind-chart', 's']]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #360 — t-html params
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — t-html params (#360)', () => {
  beforeEach(() => {
    NoJS.i18n({ locales: { en: { msg: 'Read {link}' } } });
  });

  test('markup passed through a t-* param renders as a real element', () => {
    document.body.innerHTML = `<p t="msg" t-html t-link="'&lt;a href=/terms&gt;terms&lt;/a&gt;'"></p>`;
    processTree(document.body);
    const a = document.querySelector('p a');
    expect(a).not.toBeNull();
    expect(a.getAttribute('href')).toBe('/terms');
    expect(document.querySelector('p').textContent).toBe('Read terms');
  });

  test('the sanitizer still strips <script> and on* handlers from the param', () => {
    document.body.innerHTML =
      `<p t="msg" t-html t-link="'&lt;img src=&quot;data:image/gif;base64,R0lGODlhAQABAAAAACw=&quot; onerror=&quot;x()&quot;&gt;&lt;script&gt;x()&lt;/script&gt;&lt;b&gt;ok&lt;/b&gt;'"></p>`;
    processTree(document.body);
    const p = document.querySelector('p');
    expect(p.querySelector('b').textContent).toBe('ok');
    expect(p.querySelector('script')).toBeNull();
    expect(p.querySelector('img').hasAttribute('onerror')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #358 — page-jsonld
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — page-jsonld (#358)', () => {
  afterEach(() => {
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
  });

  test('a raw JSON fragment value outside quotes produces valid JSON', () => {
    document.body.innerHTML =
      `<div state="{ name: 'Widget', o: '{&quot;price&quot;:5}' }">` +
      '<div hidden page-jsonld>{"@type":"Product","name":"{name}","offers":{o}}</div></div>';
    processTree(document.body);
    const script = document.head.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script.textContent)).toEqual({ '@type': 'Product', name: 'Widget', offers: { price: 5 } });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #359 — dispose() → config() → init()
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — reconfigure after dispose() (#359)', () => {
  afterEach(async () => {
    await NoJS.dispose();
    NoJS.config({ sanitizeHtml: null, dangerouslyDisableSanitize: false, sanitize: true });
  });

  test('sanitize config keys can be changed after dispose() and apply on the next init()', async () => {
    await NoJS.init();
    await NoJS.dispose();
    const hook = (html) => html.toUpperCase();
    NoJS.config({ sanitizeHtml: hook });
    expect(_config.sanitizeHtml).toBe(hook);
    NoJS.config({ dangerouslyDisableSanitize: true });
    expect(_config.dangerouslyDisableSanitize).toBe(true);

    document.body.innerHTML = `<div state="{ h: '&lt;b onclick=&quot;x()&quot;&gt;b&lt;/b&gt;' }"><div bind-html="h"></div></div>`;
    await NoJS.init();
    expect(document.querySelector('b').getAttribute('onclick')).toBe('x()');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #370 — devtools get:config (local host)
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — devtools get:config (#370)', () => {
  afterEach(() => {
    destroyDevtools();
    _config.devtools = false;
  });

  test('get:config returns headers as the string "[REDACTED]"', () => {
    _config.devtools = true;
    NoJS.config({ headers: { Authorization: 'Bearer t', 'X-Trace': 'abc' }, csrf: { token: 'tok' } });
    initDevtools(NoJS);
    let result;
    const onResponse = (e) => { result = e.detail.result; };
    window.addEventListener('nojs:devtools:response', onResponse);
    window.dispatchEvent(new CustomEvent('nojs:devtools:cmd', { detail: { command: 'get:config' } }));
    window.removeEventListener('nojs:devtools:response', onResponse);
    expect(result.headers).toBe('[REDACTED]');
    expect(result.csrf.token).toBe('[REDACTED]');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Retries and NoJS.CANCEL (current behavior, pinned for open PRs)
// ═══════════════════════════════════════════════════════════════════════

describe('compat v1.21.1 — retries and CANCEL', () => {
  test('retries=2 on a 404 GET makes 3 attempts', async () => {
    global.fetch.mockResolvedValue(fakeResponse(404, { message: 'nope' }));
    await expect(_doFetch('/compat/missing', 'GET', null, {}, null, null, 2, 0)).rejects.toMatchObject({ status: 404 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('NoJS.CANCEL rejects with AbortError and never reaches the network', async () => {
    NoJS.interceptor('request', () => ({ [NoJS.CANCEL]: true }));
    await expect(_doFetch('/compat/cancel', 'POST', { a: 1 })).rejects.toMatchObject({ name: 'AbortError' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('NoJS.CANCEL is silent on an element: no error template, no fetch:error', async () => {
    NoJS.interceptor('request', () => ({ [NoJS.CANCEL]: true }));
    const errors = [];
    NoJS.on('fetch:error', (p) => errors.push(p));
    document.body.innerHTML =
      '<template id="cerr"><span class="cancel-error">err</span></template>' +
      '<button state="{}" post="/compat/cancel" error="#cerr">Send</button>';
    processTree(document.body);
    document.querySelector('button').click();
    await flush();
    expect(document.querySelector('.cancel-error')).toBeNull();
    expect(errors).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
