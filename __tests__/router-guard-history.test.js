// ═══════════════════════════════════════════════════════════════════════
//  Router — guard redirects and browser history
//  A redirect must not overwrite the history entry of the page the user
//  navigated from: Back after a redirect returns to that page.
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, setRouterInstance } from '../src/globals.js';
import { _createRouter } from '../src/router.js';

const ROUTES = `
  <div route-view></div>
  <template route="/"><p class="page">home</p></template>
  <template route="/about"><p class="page">about</p></template>
  <template route="/login"><p class="page">login</p></template>
  <template route="/protected" guard="$store.auth.ok" redirect="/login"><p class="page">protected</p></template>
`;

let router;

async function until(check, label) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

const page = () => document.querySelector('[route-view] .page')?.textContent;
const currentUrl = () => (_config.router.useHash ? window.location.hash : window.location.pathname);

async function start(useHash, url) {
  _config.router = { useHash, base: '/', scrollBehavior: 'top', suppressHashWarning: true };
  window.history.replaceState(null, '', url);
  _stores.auth = { ok: false };
  document.body.innerHTML = ROUTES;
  router = _createRouter();
  await router.init();
}

beforeEach(() => {
  window.scrollTo = jest.fn();
});

afterEach(() => {
  router?.destroy();
  router = null;
  setRouterInstance(null);
  delete _stores.auth;
  document.body.innerHTML = '';
});

describe.each([
  ['history mode', false, '/', (p) => p],
  ['hash mode', true, '/#/', (p) => '#' + p],
])('Router guard redirect in %s', (_name, useHash, startUrl, url) => {
  test('Back after a redirected push returns to the page the user left', async () => {
    await start(useHash, startUrl);
    await router.push('/about');
    expect(page()).toBe('about');

    await router.push('/protected');
    expect(currentUrl()).toBe(url('/login'));
    expect(page()).toBe('login');

    window.history.back();
    await until(() => currentUrl() === url('/about') && page() === 'about', 'Back to /about');
  });

  test('a redirected replace still replaces the current entry', async () => {
    await start(useHash, startUrl);
    await router.push('/about');
    await router.replace('/protected');
    expect(currentUrl()).toBe(url('/login'));

    window.history.back();
    await until(() => currentUrl() === url('/') && page() === 'home', 'Back to / (the replaced /about is gone)');
  });

  test('Back onto an entry whose guard now fails replaces that entry', async () => {
    await start(useHash, startUrl);
    _stores.auth.ok = true;
    await router.push('/protected');
    expect(page()).toBe('protected');
    await router.push('/about');

    _stores.auth.ok = false;
    window.history.back();
    await until(() => currentUrl() === url('/login') && page() === 'login', 'Back redirected to /login');

    window.history.forward();
    await until(() => currentUrl() === url('/about') && page() === 'about', 'Forward to /about (no extra entry)');
  });

  test('a deep link to a guarded route is replaced by the redirect target', async () => {
    const lengthBefore = window.history.length;
    await start(useHash, useHash ? '/#/protected' : '/protected');
    expect(currentUrl()).toBe(url('/login'));
    expect(page()).toBe('login');
    expect(window.history.length).toBe(lengthBefore);
  });
});
