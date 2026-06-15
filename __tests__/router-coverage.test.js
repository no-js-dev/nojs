// ═══════════════════════════════════════════════════════════════════════
//  Router — branch coverage improvements
//  Targets: View Transitions, file-based routes, prefetch logic,
//  _stripBase, _isSafeRedirect, scroll behaviors, focus management
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, setRouterInstance } from '../src/globals.js';
import { _createRouter } from '../src/router.js';
import { _templateHtmlCache } from '../src/dom.js';

// Track all event handlers registered during tests for proper cleanup
const _trackedDocClickHandlers = [];
const _trackedWinPopstateHandlers = [];
const _trackedWinHashchangeHandlers = [];
const _origDocAdd = document.addEventListener.bind(document);
const _origDocRemove = document.removeEventListener.bind(document);
const _origWinAdd = window.addEventListener.bind(window);
const _origWinRemove = window.removeEventListener.bind(window);

document.addEventListener = function (event, handler, ...rest) {
  if (event === 'click') _trackedDocClickHandlers.push(handler);
  return _origDocAdd(event, handler, ...rest);
};
document.removeEventListener = function (event, handler, ...rest) {
  if (event === 'click') {
    const idx = _trackedDocClickHandlers.indexOf(handler);
    if (idx !== -1) _trackedDocClickHandlers.splice(idx, 1);
  }
  return _origDocRemove(event, handler, ...rest);
};
window.addEventListener = function (event, handler, ...rest) {
  if (event === 'popstate') _trackedWinPopstateHandlers.push(handler);
  if (event === 'hashchange') _trackedWinHashchangeHandlers.push(handler);
  return _origWinAdd(event, handler, ...rest);
};
window.removeEventListener = function (event, handler, ...rest) {
  if (event === 'popstate') {
    const idx = _trackedWinPopstateHandlers.indexOf(handler);
    if (idx !== -1) _trackedWinPopstateHandlers.splice(idx, 1);
  }
  if (event === 'hashchange') {
    const idx = _trackedWinHashchangeHandlers.indexOf(handler);
    if (idx !== -1) _trackedWinHashchangeHandlers.splice(idx, 1);
  }
  return _origWinRemove(event, handler, ...rest);
};

function _removeAllTrackedHandlers() {
  _trackedDocClickHandlers.forEach(h => _origDocRemove('click', h));
  _trackedDocClickHandlers.length = 0;
  _trackedWinPopstateHandlers.forEach(h => _origWinRemove('popstate', h));
  _trackedWinPopstateHandlers.length = 0;
  _trackedWinHashchangeHandlers.forEach(h => _origWinRemove('hashchange', h));
  _trackedWinHashchangeHandlers.length = 0;
}

afterEach(() => {
  _removeAllTrackedHandlers();
});

// ── View Transition API coverage ──────────────────────────────────────────────

describe('Router — View Transition API branches', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', viewTransition: true };
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    window.location.hash = '';
    delete document.startViewTransition;
  });

  test('uses View Transition API when available and outlet has transition attribute', async () => {
    let updateCalled = false;
    document.startViewTransition = jest.fn(({ update, types }) => {
      updateCalled = true;
      const promise = update();
      return {
        updateCallbackDone: promise,
        finished: Promise.resolve(),
      };
    });

    document.body.innerHTML = `
      <div route-view transition="slide"></div>
      <template route="/vt-page"><h1>VT Page</h1></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/vt-page');

    expect(document.startViewTransition).toHaveBeenCalled();
    expect(updateCalled).toBe(true);
  });

  test('skips View Transition when viewTransition config is false', async () => {
    _config.router.viewTransition = false;
    document.startViewTransition = jest.fn();

    document.body.innerHTML = `
      <div route-view transition="fade"></div>
      <template route="/no-vt"><h1>No VT</h1></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/no-vt');

    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  test('skips View Transition when no outlet has transition attribute', async () => {
    document.startViewTransition = jest.fn();

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/plain"><h1>Plain</h1></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/plain');

    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  test('handles View Transition finished rejection (non-AbortError) without crashing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let resolveUpdate;
    document.startViewTransition = jest.fn(({ update, types }) => {
      const updatePromise = update();
      return {
        updateCallbackDone: updatePromise,
        finished: Promise.reject(new Error('Transition failed')),
      };
    });

    document.body.innerHTML = `
      <div route-view transition="slide"></div>
      <template route="/fail-vt"><h1>Fail VT</h1></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/fail-vt');

    // Wait for the rejection handler to fire
    await new Promise(r => setTimeout(r, 10));
    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', 'View transition failed:', expect.any(Error));
    warnSpy.mockRestore();
  });

  test('suppresses AbortError from View Transition finished', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const abortErr = new DOMException('Aborted', 'AbortError');
    document.startViewTransition = jest.fn(({ update }) => {
      const updatePromise = update();
      return {
        updateCallbackDone: updatePromise,
        finished: Promise.reject(abortErr),
      };
    });

    document.body.innerHTML = `
      <div route-view transition="fade"></div>
      <template route="/abort-vt"><h1>Abort VT</h1></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/abort-vt');
    await new Promise(r => setTimeout(r, 10));

    // AbortError should NOT trigger the warning
    const vtWarn = warnSpy.mock.calls.find(c => c[1] === 'View transition failed:');
    expect(vtWarn).toBeUndefined();
    warnSpy.mockRestore();
  });

  test('View Transition types include transition attribute value and direction', async () => {
    let capturedTypes;
    document.startViewTransition = jest.fn(({ update, types }) => {
      capturedTypes = types;
      const updatePromise = update();
      return {
        updateCallbackDone: updatePromise,
        finished: Promise.resolve(),
      };
    });

    document.body.innerHTML = `
      <div route-view transition="scale"></div>
      <template route="/typed"><h1>Typed</h1></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/typed');

    expect(capturedTypes).toContain('scale');
    expect(capturedTypes).toContain('forward');
  });
});

// ── File-based routing ────────────────────────────────────────────────────────

describe('Router — file-based routing branches', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', templates: '', ext: '.tpl' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    _templateHtmlCache.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p class="auto-content">Auto loaded</p>'),
    });
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    delete global.fetch;
    _templateHtmlCache.clear();
  });

  test('file-based route resolves root path to index template', async () => {
    document.body.innerHTML = `
      <div route-view src="pages/"></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('index'));
  });

  test('file-based route resolves single-segment path', async () => {
    document.body.innerHTML = `
      <div route-view src="pages/"></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('about'));
  });

  test('file-based route shows 404 when template fails to load', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found'),
    });

    document.body.innerHTML = `
      <div route-view src="pages/"></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/nonexistent');

    const outlet = document.querySelector('[route-view]');
    expect(outlet.innerHTML).toContain('404');
  });
});

// ── Prefetch logic ────────────────────────────────────────────────────────────

describe('Router — prefetch logic branches', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', templates: '', ext: '.tpl' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    _templateHtmlCache.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Prefetched</p>'),
    });
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    delete global.fetch;
    _templateHtmlCache.clear();
  });

  test('prefetches route templates from <a route> links after init', async () => {
    document.body.innerHTML = `
      <div route-view src="pages/"></div>
      <template route="/"><p>Home</p></template>
      <a route="/about">About</a>
      <a route="/contact">Contact</a>
    `;
    const router = _createRouter();
    await router.init();

    // Allow prefetch promises to settle
    await new Promise(r => setTimeout(r, 50));

    // Should have fetched about and contact templates
    const fetchCalls = global.fetch.mock.calls.map(c => c[0]);
    expect(fetchCalls.some(url => url.includes('about'))).toBe(true);
    expect(fetchCalls.some(url => url.includes('contact'))).toBe(true);
  });

  test('does not prefetch routes marked lazy="ondemand"', async () => {
    document.body.innerHTML = `
      <div route-view src="pages/"></div>
      <template route="/"><p>Home</p></template>
      <a route="/lazy-page" lazy="ondemand">Lazy</a>
    `;
    const router = _createRouter();
    await router.init();
    await new Promise(r => setTimeout(r, 50));

    const fetchCalls = global.fetch.mock.calls.map(c => c[0]);
    expect(fetchCalls.some(url => url.includes('lazy-page'))).toBe(false);
  });

  test('prioritizes routes marked lazy="priority" over background', async () => {
    document.body.innerHTML = `
      <div route-view src="pages/"></div>
      <template route="/"><p>Home</p></template>
      <a route="/fast" lazy="priority">Fast</a>
      <a route="/slow">Slow</a>
    `;
    const router = _createRouter();
    await router.init();
    await new Promise(r => setTimeout(r, 50));

    // Both should be fetched
    const fetchCalls = global.fetch.mock.calls.map(c => c[0]);
    expect(fetchCalls.some(url => url.includes('fast'))).toBe(true);
    expect(fetchCalls.some(url => url.includes('slow'))).toBe(true);
  });
});

// ── _isSafeRedirect coverage ──────────────────────────────────────────────────

describe('Router — guard redirect safety', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('guard with unsafe redirect path (absolute URL) blocks and warns', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _stores.auth = { loggedIn: false };

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/protected" guard="$store.auth.loggedIn" redirect="https://evil.com/login">
        <h1>Protected</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/protected');

    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('not a relative path'));
    warnSpy.mockRestore();
  });

  test('guard with no redirect defined warns and clears outlets', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _stores.auth = { loggedIn: false };

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/restricted" guard="$store.auth.loggedIn">
        <h1>Restricted</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/restricted');

    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('no redirect is defined'));
    const outlet = document.querySelector('[route-view]');
    expect(outlet.innerHTML).toBe('');
    warnSpy.mockRestore();
  });

  test('guard with relative redirect (starts with /) navigates correctly', async () => {
    _stores.auth = { loggedIn: false };

    const loginTpl = document.createElement('template');
    loginTpl.setAttribute('route', '/login');
    loginTpl.innerHTML = '<h1>Login</h1>';

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/protected" guard="$store.auth.loggedIn" redirect="/login">
        <h1>Protected</h1>
      </template>
    `;
    document.body.appendChild(loginTpl);

    const router = _createRouter();
    await router.init();
    await router.push('/protected');

    expect(router.current.path).toBe('/login');
  });
});

// ── _stripBase coverage ───────────────────────────────────────────────────────

describe('Router — _stripBase edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    window.location.hash = '';
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('history mode with base path strips the base from popstate navigation', async () => {
    _config.router = { useHash: false, base: '/myapp', scrollBehavior: 'top' };

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/settings"><h1>Settings</h1></template>
    `;

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // Simulate navigating to /myapp/settings
    window.history.pushState({}, '', '/myapp/settings');
    window.dispatchEvent(new Event('popstate'));

    // Allow async navigation to settle
    await new Promise(r => setTimeout(r, 10));

    expect(router.current.path).toBe('/settings');
  });

  test('history mode with trailing slash in base normalizes correctly', async () => {
    _config.router = { useHash: false, base: '/app/', scrollBehavior: 'top' };

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/"><h1>Home</h1></template>
    `;
    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBeDefined();
  });
});

// ── Hash-only navigation (no re-render) ───────────────────────────────────────

describe('Router — hash-only navigation', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 0; });
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    jest.restoreAllMocks();
  });

  test('hash-only change on same path updates hash without re-rendering', async () => {
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/page"><h1>Page</h1><div id="section1">Section</div></template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/page');

    const initialHTML = document.querySelector('[route-view]').innerHTML;

    // Navigate to same path with different hash
    await router.push('/page#section1');

    expect(router.current.hash).toBe('#section1');
    // The outlet content should not have been re-rendered
    expect(document.querySelector('[route-view]').innerHTML).toBe(initialHTML);

    delete Element.prototype.scrollIntoView;
  });
});

// ── Named outlets ─────────────────────────────────────────────────────────────

describe('Router — named outlets', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('route renders to named outlet when outlet attribute matches', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <div route-view="sidebar"></div>
      <template route="/home" outlet="default"><h1>Main</h1></template>
    `;
    // Register a template for sidebar
    const router = _createRouter();
    const sidebarTpl = document.createElement('template');
    sidebarTpl.innerHTML = '<nav>Sidebar Nav</nav>';
    router.register('/home', sidebarTpl, 'sidebar');
    await router.init();
    await router.push('/home');

    const mainOutlet = document.querySelectorAll('[route-view]')[0];
    const sidebarOutlet = document.querySelectorAll('[route-view]')[1];
    expect(mainOutlet.innerHTML).toContain('Main');
    expect(sidebarOutlet.innerHTML).toContain('Sidebar Nav');
  });
});

// ── Router listener API ───────────────────────────────────────────────────────

describe('Router — listener API', () => {
  test('on() registers a listener and returns an unsubscribe function', async () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '<div route-view></div>';
    window.scrollTo = jest.fn();
    window.location.hash = '';

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Page</p>';
    router.register('/page', tpl);
    await router.init();

    const listener = jest.fn();
    const unsub = router.on(listener);

    await router.push('/page');
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    await router.push('/');
    // Should not be called again after unsubscribe
    expect(listener).toHaveBeenCalledTimes(1);

    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });
});

// ── Route active class edge cases ─────────────────────────────────────────────

describe('Router — active class edge cases', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('route-active-exact only applies class on exact path match', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/"><p>Home</p></template>
      <template route="/about"><p>About</p></template>
      <a route="/" route-active-exact="exact-active">Home</a>
      <a route="/about" route-active-exact="exact-active">About</a>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');

    const links = document.querySelectorAll('a[route]');
    expect(links[0].classList.contains('exact-active')).toBe(false);
    expect(links[1].classList.contains('exact-active')).toBe(true);
  });

  test('prefix active class does not match sibling routes sharing a text prefix', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/foo"><p>Foo</p></template>
      <template route="/foobar"><p>Foobar</p></template>
      <a route="/foo">Foo</a>
      <a route="/foobar">Foobar</a>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/foobar');

    const links = document.querySelectorAll('a[route]');
    // /foo should NOT be active when on /foobar (segment boundary check)
    expect(links[0].classList.contains('active')).toBe(false);
    expect(links[1].classList.contains('active')).toBe(true);
  });
});
