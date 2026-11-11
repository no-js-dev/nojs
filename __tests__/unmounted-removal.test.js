/**
 * on:unmounted when a directive removes the element (NOJS-312 F1).
 *
 * Directives dispose an element before removing it (dispose before removal),
 * and the on:unmounted disposer disconnects its MutationObserver, so the hook
 * never sees removals made by `if`, `each` or a route change.
 *
 * Default (strictUnmounted off): v1.21.1 behavior, asserted as-is below.
 * strictUnmounted on: the disposer fires the hook on the next microtask when
 * the element is no longer connected, at most once per element.
 */
import { _config, _stores, setRouterInstance } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { findContext } from '../src/dom.js';
import { processTree } from '../src/registry.js';
import { _createRouter } from '../src/router.js';
import NoJS from '../src/index.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/loops.js';
import '../src/directives/events.js';
import '../src/directives/conditionals.js';

const flush = (ms = 30) => new Promise((r) => setTimeout(r, ms));

function mount(html) {
  document.body.innerHTML = html;
  processTree(document.body);
  return findContext(document.getElementById('root'));
}

afterEach(() => {
  _config.strictUnmounted = false;
  document.body.innerHTML = '';
});

describe('strictUnmounted config', () => {
  test('defaults to false', () => {
    expect(_config.strictUnmounted).toBe(false);
  });

  test('can be set through NoJS.config()', () => {
    NoJS.config({ strictUnmounted: true });
    expect(_config.strictUnmounted).toBe(true);
    NoJS.config({ strictUnmounted: false });
    expect(_config.strictUnmounted).toBe(false);
  });
});

describe.each([
  // [flag, expected count for: if, keyed each removal, route swap, reorder]
  [false, { if: 0, each: 0, route: 0, reorder: 10 }],
  [true, { if: 1, each: 10, route: 1, reorder: 0 }],
])('on:unmounted (strictUnmounted %s)', (flag, expected) => {
  beforeEach(() => {
    _config.strictUnmounted = flag;
  });

  test('plain el.remove() fires exactly once', async () => {
    const ctx = mount('<div id="root" state="{ gone: 0 }"><span id="s" on:unmounted="gone++">x</span></div>');
    document.getElementById('s').remove();
    await flush();
    expect(ctx.gone).toBe(1);
  });

  test('if removal', async () => {
    const ctx = mount('<div id="root" state="{ alive: true, gone: 0 }"><div if="alive"><span id="m" on:unmounted="gone++">m</span></div></div>');
    expect(document.getElementById('m')).not.toBeNull();
    ctx.alive = false;
    await flush();
    expect(document.getElementById('m')).toBeNull();
    expect(ctx.gone).toBe(expected.if);
  });

  test('if removal of a nested element', async () => {
    const ctx = mount('<div id="root" state="{ alive: true, gone: 0 }"><div if="alive"><p><b id="m" on:unmounted="gone++">m</b></p></div></div>');
    ctx.alive = false;
    await flush();
    expect(document.getElementById('m')).toBeNull();
    expect(ctx.gone).toBe(expected.if);
  });

  test('keyed each removal', async () => {
    const ctx = mount('<div id="root" state="{ rows: [1, 2, 3], gone: 0 }"><ul><li each="n in rows" key="n" on:unmounted="gone = gone + 10" bind="n"></li></ul></div>');
    expect(document.querySelectorAll('li').length).toBe(3);
    ctx.rows = ctx.rows.filter((r) => r !== 2);
    await flush();
    expect(document.querySelectorAll('li').length).toBe(2);
    expect(ctx.gone).toBe(expected.each);
  });

  test('keyed each reorder (insertBefore) and a later removal', async () => {
    const ctx = mount('<div id="root" state="{ rows: [1, 2, 3], gone: 0 }"><ul><li each="n in rows" key="n" on:unmounted="gone = gone + 10" bind="n"></li></ul></div>');
    ctx.rows = [3, 1, 2];
    await flush();
    expect([...document.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['3', '1', '2']);
    // Default: the observer reads the move as a removal (v1.21.1 behavior).
    expect(ctx.gone).toBe(expected.reorder);

    const before = ctx.gone;
    ctx.rows = [3, 2];
    await flush();
    expect(document.querySelectorAll('li').length).toBe(2);
    if (flag) {
      // The moved rows stay watched: removing one fires once, not twice.
      expect(ctx.gone - before).toBe(10);
    }
  });

  test('switch hide does not fire: the case stays connected', async () => {
    const ctx = mount('<div id="root" state="{ s: \'a\', gone: 0 }"><div switch="s"><div case="\'a\'"><span id="m" on:unmounted="gone++">A</span></div><div case="\'b\'">B</div></div></div>');
    ctx.s = 'b';
    await flush();
    expect(document.getElementById('m').isConnected).toBe(true);
    expect(ctx.gone).toBe(0);
  });
});

describe.each([
  [false, 0],
  [true, 1],
])('on:unmounted on router outlet swap (strictUnmounted %s)', (flag, expected) => {
  let router;

  beforeEach(() => {
    _config.strictUnmounted = flag;
    _config.router = { useHash: true, suppressHashWarning: true, base: '/', scrollBehavior: 'top', templates: 'pages', ext: '.tpl' };
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    _stores.t = createContext({ gone: 0 });
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') }));
  });

  afterEach(() => {
    router?.destroy();
    setRouterInstance(null);
    delete _stores.t;
    delete global.fetch;
    window.location.hash = '';
  });

  test('leaving a route', async () => {
    document.body.innerHTML = `
      <main route-view></main>
      <template route="/"><p id="home" on:unmounted="$store.t.gone++">HOME</p></template>
      <template route="/about"><p class="about">ABOUT</p></template>`;
    router = _createRouter();
    setRouterInstance(router);
    await router.init();
    await flush(20);
    expect(document.getElementById('home')).not.toBeNull();

    await router.push('/about');
    await flush();
    expect(document.getElementById('home')).toBeNull();
    expect(document.querySelector('.about')).not.toBeNull();
    expect(_stores.t.gone).toBe(expected);
  });
});
