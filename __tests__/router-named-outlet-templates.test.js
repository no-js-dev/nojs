/**
 * Named outlets and the config `router.templates` file lookup (NOJS-312 F3).
 *
 * The shipped default is `router.templates: "pages"`. By default (v1.21.1
 * behavior) every outlet, named ones included, resolves the route from that
 * folder, so a named outlet without `src` on an explicitly matched route
 * fetches pages/<route>.tpl and, when the file is missing, renders the
 * wildcard or the built-in 404 instead of being cleared.
 *
 * router.strictOutlets on: only the default outlet uses `router.templates`;
 * a named outlet resolves files only from its own `src`.
 */
import { _config, setRouterInstance } from '../src/globals.js';
import { _createRouter } from '../src/router.js';
import { _templateHtmlCache } from '../src/dom.js';
import NoJS from '../src/index.js';

let routers = [];
let warnSpy;

async function boot(html) {
  document.body.innerHTML = html;
  const router = _createRouter();
  routers.push(router);
  setRouterInstance(router);
  await router.init();
  await new Promise((r) => setTimeout(r, 20));
  return router;
}

// server(map): url → body (200); anything else → 404.
function server(map = {}) {
  const urls = [];
  global.fetch = jest.fn((url) => {
    urls.push(url);
    if (Object.prototype.hasOwnProperty.call(map, url)) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(map[url]) });
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not Found') });
  });
  return urls;
}

function setRouterConfig(strict) {
  _config.router = {
    useHash: true, suppressHashWarning: true, base: '/', scrollBehavior: 'top',
    templates: 'pages', ext: '.tpl', strictOutlets: strict,
  };
}

beforeEach(() => {
  _templateHtmlCache.clear();
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

// The routing.md "Named Outlets" example, plus a global wildcard.
const DOCS_EXAMPLE = `
  <main route-view></main>
  <aside route-view="sidebar"></aside>
  <header route-view="topbar"></header>
  <template route="/home"><h1>Home page</h1></template>
  <template route="/home" outlet="sidebar"><nav>Home navigation</nav></template>
  <template route="/home" outlet="topbar"><span>Home breadcrumb</span></template>
  <template route="/about"><h1 class="about">About us</h1></template>`;

const WILDCARD = '<template route="*"><h1 class="nf">404</h1></template>';

describe('router.strictOutlets config', () => {
  test('defaults to false and keeps router.templates', () => {
    jest.isolateModules(() => {
      const { _config: fresh } = require('../src/globals.js');
      expect(fresh.router.strictOutlets).toBe(false);
      expect(fresh.router.templates).toBe('pages');
    });
  });

  test('can be set through NoJS.config() without dropping sibling router keys', () => {
    setRouterConfig(false);
    NoJS.config({ router: { strictOutlets: true } });
    expect(_config.router.strictOutlets).toBe(true);
    expect(_config.router.templates).toBe('pages');
    expect(_config.router.useHash).toBe(true);
  });
});

describe('default (strictOutlets off) keeps v1.21.1 behavior', () => {
  beforeEach(() => setRouterConfig(false));

  test('matched route: a named outlet without src fetches pages/<route>.tpl and renders the wildcard', async () => {
    const urls = server();
    const router = await boot(DOCS_EXAMPLE + WILDCARD);
    await router.push('/home');
    await router.push('/about');
    expect(document.querySelector('main .about')).not.toBeNull();
    expect(document.querySelector('aside .nf')).not.toBeNull();
    expect(document.querySelector('header .nf')).not.toBeNull();
    expect(urls).toContain('pages/about.tpl');
  });

  test('matched route without a wildcard: the named outlet shows the built-in 404', async () => {
    server();
    const router = await boot(DOCS_EXAMPLE);
    await router.push('/about');
    expect(document.querySelector('aside').textContent).toContain('404');
  });
});

describe('router.strictOutlets on', () => {
  beforeEach(() => setRouterConfig(true));

  test('matched route: named outlets without src are cleared, no file request', async () => {
    const urls = server();
    const router = await boot(DOCS_EXAMPLE + WILDCARD);
    await router.push('/home');
    expect(document.querySelector('aside').textContent).toContain('Home navigation');
    expect(document.querySelector('header').textContent).toContain('Home breadcrumb');

    await router.push('/about');
    expect(document.querySelector('main .about')).not.toBeNull();
    expect(document.querySelector('aside').innerHTML).toBe('');
    expect(document.querySelector('header').innerHTML).toBe('');
    // Only the boot lookup of "/" by the default outlet: the docs example has
    // no route for it.
    expect(urls).toEqual(['pages/index.tpl']);
  });

  test('matched route without a wildcard: no built-in 404 in named outlets', async () => {
    server();
    const router = await boot(DOCS_EXAMPLE);
    await router.push('/about');
    expect(document.querySelector('aside').innerHTML).toBe('');
    expect(document.querySelector('header').innerHTML).toBe('');
  });

  test('the default outlet still resolves pages from router.templates', async () => {
    const urls = server({ 'pages/settings.tpl': '<p class="settings">SETTINGS</p>' });
    const router = await boot(`
      <main route-view></main>
      <aside route-view="sidebar"></aside>
      <template route="/" ><p>HOME</p></template>`);
    await router.push('/settings');
    expect(document.querySelector('main .settings')).not.toBeNull();
    expect(urls).toEqual(['pages/settings.tpl']);
  });

  test('unmatched page: a named outlet without src keeps the wildcard fallback', async () => {
    const urls = server({ 'pages/settings.tpl': '<p class="settings">SETTINGS</p>' });
    const router = await boot(`
      <main route-view></main>
      <aside route-view="sidebar"></aside>
      <template route="/"><p>HOME</p></template>
      <template route="*" outlet="sidebar"><p class="side-nf">No sidebar content</p></template>`);
    await router.push('/settings');
    expect(document.querySelector('main .settings')).not.toBeNull();
    expect(document.querySelector('aside .side-nf')).not.toBeNull();
    expect(urls).toEqual(['pages/settings.tpl']);
  });

  test('a named outlet with its own src still resolves files from it', async () => {
    const urls = server({ 'side/about.tpl': '<nav class="side-about">SIDE ABOUT</nav>' });
    const router = await boot(DOCS_EXAMPLE.replace('<aside route-view="sidebar">', '<aside route-view="sidebar" src="side/">'));
    await router.push('/about');
    expect(document.querySelector('aside .side-about')).not.toBeNull();
    expect(urls).toEqual(['pages/index.tpl', 'side/index.tpl', 'side/about.tpl']);
  });

  test('prefetch skips named outlets without src', async () => {
    const urls = server({ 'pages/stats.tpl': '<p>S</p>' });
    await boot(`
      <a route="/stats">S</a>
      <main route-view></main>
      <aside route-view="sidebar"></aside>
      <template route="/"><p>HOME</p></template>
      <template route="/" outlet="sidebar"><p>SIDE HOME</p></template>`);
    expect(urls).toEqual(['pages/stats.tpl']);
  });
});
