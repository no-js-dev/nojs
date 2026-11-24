// ═══════════════════════════════════════════════════════════════════════
//  Router — <a href route> links (the form the routing docs recommend)
//  A plain click on a link that carries both attributes is an SPA
//  navigation: the router cancels the browser's own navigation to href.
// ═══════════════════════════════════════════════════════════════════════

import { _config, setRouterInstance } from '../src/globals.js';
import { _createRouter } from '../src/router.js';

let router;

afterEach(() => {
  router?.destroy();
  router = null;
  setRouterInstance(null);
  document.body.innerHTML = '';
});

describe.each([
  ['history mode', false, '/', '/about', () => window.location.pathname],
  ['hash mode', true, '/#/', '#/about', () => window.location.hash],
])('<a href route> in %s', (_name, useHash, startUrl, href, currentUrl) => {
  test('a click navigates through the router, not the browser', async () => {
    _config.router = { useHash, base: '/', scrollBehavior: 'top', suppressHashWarning: true };
    window.scrollTo = jest.fn();
    window.history.replaceState(null, '', startUrl);
    document.body.innerHTML = `
      <a id="link" href="${href}" route="/about">About</a>
      <div route-view></div>
      <template route="/"><p class="page">home</p></template>
      <template route="/about"><p class="page">about</p></template>
    `;
    router = _createRouter();
    await router.init();

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    document.getElementById('link').dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(router.current.path).toBe('/about');
    expect(currentUrl()).toBe(useHash ? '#/about' : '/about');
  });
});
