import { _config, setRouterInstance } from '../src/globals.js';
import { _createRouter } from '../src/router.js';
import { _templateHtmlCache, _loadTemplateElement, _isHtmlDocument } from '../src/dom.js';

const INDEX_HTML = '<!DOCTYPE html>\n<html lang="en"><head><title>App</title></head>' +
  '<body><nav>SHELL</nav><main route-view></main></body></html>';

let routers = [];
let warnSpy;

function mount(html) {
  document.body.innerHTML = html;
}

async function boot() {
  const router = _createRouter();
  routers.push(router);
  setRouterInstance(router);
  await router.init();
  await new Promise((r) => setTimeout(r, 20));
  return router;
}

// server(map): map of url → body (200). Anything else → SPA fallback (200 +
// index.html) when fallback is true, 404 otherwise.
function server(map = {}, { fallback = false } = {}) {
  const urls = [];
  global.fetch = jest.fn((url) => {
    urls.push(url);
    if (Object.prototype.hasOwnProperty.call(map, url)) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(map[url]) });
    }
    if (fallback) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(INDEX_HTML) });
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not Found') });
  });
  return urls;
}

beforeEach(() => {
  _config.router = { useHash: true, suppressHashWarning: true, base: '/', scrollBehavior: 'top', templates: 'pages', ext: '.tpl' };
  _templateHtmlCache.clear();
  document.body.innerHTML = '';
  window.location.hash = '';
  window.scrollTo = jest.fn();
  setRouterInstance(null);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  routers.forEach((r) => r.destroy());
  routers = [];
  setRouterInstance(null);
  document.body.innerHTML = '';
  window.location.hash = '';
  warnSpy.mockRestore();
  delete global.fetch;
});

const INLINE_APP = `
  <nav><a route="/">Home</a><a route="/about">About</a><a route="/p/hello">P</a></nav>
  <main route-view></main>
  <template route="/"><p class="home">HOME</p></template>
  <template route="/about"><p class="about">ABOUT</p></template>
  <template route="/p/:slug"><p class="post">POST</p></template>
  <template route="*"><p class="nf">INLINE 404</p></template>`;

describe('Prefetch — inline routes do not trigger file lookups', () => {
  test('inline-only app with links: zero requests at boot', async () => {
    const urls = server();
    mount(INLINE_APP);
    await boot();
    expect(urls).toEqual([]);
    expect(document.querySelector('.home')).not.toBeNull();
  });

  test('inline-only app without links: zero requests at boot', async () => {
    const urls = server();
    mount(`
      <main route-view></main>
      <template route="/"><p class="home">HOME</p></template>
      <template route="/about"><p>ABOUT</p></template>
      <template route="/p/:slug"><p>POST</p></template>
      <template route="*"><p>404</p></template>`);
    await boot();
    expect(urls).toEqual([]);
  });

  test('no literal :param or * URL is ever requested', async () => {
    const urls = server({}, { fallback: true });
    mount(`
      <main route-view></main>
      <a route="/p/:slug">x</a><a route="/docs/*">y</a><a route="/time/10:30">z</a>
      <template route="/"><p>HOME</p></template>`);
    await boot();
    expect(urls.some((u) => u.includes(':slug') || u.includes('*'))).toBe(false);
    // A colon that is not a param marker is still a concrete path
    expect(urls).toEqual(['pages/time/10:30.tpl']);
  });

  test('file-based app: links are prefetched exactly as before', async () => {
    const urls = server({
      'pages/index.tpl': '<p class="idx">INDEX</p>',
      'pages/about.tpl': '<p>ABOUT</p>',
      'pages/p/hello.tpl': '<p>HELLO</p>',
    });
    mount(`
      <nav><a route="/">Home</a><a route="/about">About</a><a route="/p/hello">P</a><a route="/missing">M</a></nav>
      <main route-view></main>`);
    await boot();
    expect(urls).toEqual([
      'pages/index.tpl',
      'pages/about.tpl',
      'pages/p/hello.tpl',
      'pages/missing.tpl',
    ]);
    expect(document.querySelector('.idx')).not.toBeNull();
  });

  test('mixed app: only links without an explicit route for the outlet are prefetched', async () => {
    const urls = server({ 'pages/docs.tpl': '<p>DOCS</p>', 'pages/stats.tpl': '<p>STATS</p>' });
    mount(`
      <nav><a route="/">H</a><a route="/about">A</a><a route="/docs">D</a>
           <a route="/stats">S</a><a route="/p/hello">P</a></nav>
      <main route-view></main>
      <template route="/"><p>HOME</p></template>
      <template route="/about"><p>ABOUT</p></template>
      <template route="/p/:slug"><p>POST</p></template>
      <template route="/stats" outlet="sidebar"><p>SIDEBAR STATS</p></template>`);
    await boot();
    // /stats only defines the sidebar outlet, so the default outlet still
    // resolves it from a file and keeps prefetching it.
    expect(urls).toEqual(['pages/docs.tpl', 'pages/stats.tpl']);
  });

  test('explicit route per named outlet is checked against that outlet', async () => {
    const urls = server({ 'side/stats.tpl': '<p>S</p>', 'pages/stats.tpl': '<p>S</p>' });
    mount(`
      <a route="/stats">S</a>
      <main route-view></main>
      <aside route-view="sidebar" src="side/"></aside>
      <template route="/"><p>HOME</p></template>
      <template route="/" outlet="sidebar"><p>SIDE HOME</p></template>
      <template route="/stats" outlet="sidebar"><p>SIDEBAR STATS</p></template>`);
    await boot();
    expect(urls).toEqual(['pages/stats.tpl']);
  });
});

describe('SPA fallback — index.html is not a route template', () => {
  test('inline app: unmatched path renders route="*" instead of index.html', async () => {
    const urls = server({}, { fallback: true });
    mount(INLINE_APP);
    const router = await boot();
    await router.push('/nope');
    const outlet = document.querySelector('main[route-view]');
    expect(outlet.querySelector('.nf')).not.toBeNull();
    expect(outlet.textContent).not.toContain('SHELL');
    expect(urls).toEqual(['pages/nope.tpl']);
    const warned = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(warned).toContain('pages/nope.tpl');
    expect(warned).toContain('SPA fallback');
  });

  test('file-based app: real .tpl renders, missing one falls to route="*"', async () => {
    server({ 'pages/index.tpl': '<p>IDX</p>', 'pages/about.tpl': '<p class="about">ABOUT</p>' }, { fallback: true });
    mount(`
      <main route-view></main>
      <template route="*"><p class="nf">WILD</p></template>`);
    const router = await boot();
    const outlet = document.querySelector('main');
    await router.push('/about');
    expect(outlet.querySelector('.about')).not.toBeNull();
    await router.push('/missing');
    expect(outlet.querySelector('.nf')).not.toBeNull();
    expect(outlet.textContent).not.toContain('SHELL');
  });

  test('file-based app without wildcard: missing page shows the built-in 404', async () => {
    server({ 'pages/index.tpl': '<p>IDX</p>' }, { fallback: true });
    mount('<main route-view></main>');
    const router = await boot();
    await router.push('/missing');
    const outlet = document.querySelector('main');
    expect(outlet.textContent).toContain('404');
    expect(outlet.textContent).not.toContain('SHELL');
  });

  test('layout probe: fallback for pages/p.tpl is not taken as a layout', async () => {
    const urls = server({ 'pages/index.tpl': '<p>IDX</p>', 'pages/p/hello.tpl': '<p class="hello">HELLO</p>' }, { fallback: true });
    mount('<main route-view></main>');
    const router = await boot();
    await router.push('/p/hello');
    const outlet = document.querySelector('main');
    expect(urls).toContain('pages/p.tpl');
    expect(outlet.querySelector('.hello')).not.toBeNull();
    expect(outlet.textContent).not.toContain('SHELL');
  });

  test('404 behavior is unchanged', async () => {
    server({}, { fallback: false });
    mount(INLINE_APP);
    const router = await boot();
    await router.push('/nope');
    expect(document.querySelector('main .nf')).not.toBeNull();
    const warned = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(warned).toContain('HTTP 404');
    expect(warned).not.toContain('SPA fallback');
  });

  test('a .tpl whose markup merely contains <html> later is still a template', async () => {
    server({ 'pages/code.tpl': '<pre>&lt;html&gt;</pre>\n<p class="ok">OK</p>\n<!-- <html> -->' }, { fallback: true });
    mount('<main route-view></main>');
    const router = await boot();
    await router.push('/code');
    expect(document.querySelector('main .ok')).not.toBeNull();
  });
});

describe('Non-router templates keep loading full documents', () => {
  test('<template src> include still injects a full HTML document', async () => {
    server({ 'frag.html': '<!doctype html><html><body><p class="frag">FRAG</p></body></html>' });
    mount('<div id="host"><template src="frag.html"></template></div>');
    await _loadTemplateElement(document.querySelector('template'));
    expect(document.querySelector('#host .frag')).not.toBeNull();
  });

  test('explicit <template route src> still accepts a full HTML document', async () => {
    server({ 'about.html': '<!DOCTYPE html><html><body><p class="about">ABOUT</p></body></html>' });
    mount(`
      <main route-view></main>
      <template route="/"><p>HOME</p></template>
      <template route="/about" src="about.html"></template>`);
    const router = await boot();
    await router.push('/about');
    expect(document.querySelector('main .about')).not.toBeNull();
  });
});

describe('_isHtmlDocument', () => {
  test.each([
    ['<!DOCTYPE html><html></html>', true],
    ['<!doctype html>', true],
    ['<html lang="en">', true],
    ['<HTML>', true],
    ['\uFEFF<!doctype html>', true],
    ['  \n\t<!doctype html>', true],
    ['<!-- build 42 -->\n<!-- x -->\n<!DOCTYPE html>', true],
    ['<p>hi</p>', false],
    ['<htmlx-widget></htmlx-widget>', false],
    ['<div><html></div>', false],
    ['', false],
    ['<!-- unterminated <!doctype html>', false],
  ])('%j → %s', (html, expected) => {
    expect(_isHtmlDocument(html)).toBe(expected);
  });
});
