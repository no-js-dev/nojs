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

// Global afterEach: ensure all event handlers are cleaned up between tests
afterEach(() => {
  _removeAllTrackedHandlers();
});

describe('Router', () => {
  let router;

  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';


    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('creates router with correct API', () => {
    router = _createRouter();
    expect(router.current).toBeDefined();
    expect(typeof router.push).toBe('function');
    expect(typeof router.replace).toBe('function');
    expect(typeof router.back).toBe('function');
    expect(typeof router.forward).toBe('function');
    expect(typeof router.on).toBe('function');
    expect(typeof router.register).toBe('function');
    expect(typeof router.init).toBe('function');
  });

  test('current starts with empty path', () => {
    router = _createRouter();
    expect(router.current.path).toBe('');
    expect(router.current.params).toEqual({});
    expect(router.current.query).toEqual({});
    expect(router.current.hash).toBe('');
  });

  test('push navigates to new route (hash mode)', () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Home Page</div>';
    router.register('/home', tpl);

    router.push('/home');
    expect(router.current.path).toBe('/home');
    expect(window.location.hash).toBe('#/home');
  });

  test('replace navigates without history entry', () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>About</div>';
    router.register('/about', tpl);

    router.replace('/about');
    expect(router.current.path).toBe('/about');
  });

  test('parses query parameters', () => {
    router = _createRouter();
    router.push('/search?q=hello&page=2');
    expect(router.current.query.q).toBe('hello');
    expect(router.current.query.page).toBe('2');
  });

  test('parses query parameters and hash together', () => {
    router = _createRouter();
    router.push('/search?q=hello&page=2#section');
    expect(router.current.path).toBe('/search');
    expect(router.current.query.q).toBe('hello');
    expect(router.current.query.page).toBe('2');
    expect(router.current.hash).toBe('#section');
  });

  test('parses hash without query', () => {
    router = _createRouter();
    router.push('/about#team');
    expect(router.current.path).toBe('/about');
    expect(router.current.query).toEqual({});
    expect(router.current.hash).toBe('#team');
  });

  test('hash-only navigation notifies route watchers via _routeWatchers', () => {
    // The fix (NOJS-95) calls _notifyRouteWatchers() on hash-only navigation.
    // Directives register into _routeWatchers via _watchExpr (globals.js) when
    // the expression contains "$route". We simulate the same path here by
    // registering through _addRouteWatcher — the function _watchExpr calls.
    const { _addRouteWatcher, _routeWatchers } = require('../src/globals.js');

    router = _createRouter();
    setRouterInstance(router);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Page</div>';
    router.register('/page', tpl);

    // Full navigation — establishes current.path = '/page'
    router.push('/page#one');
    expect(router.current.hash).toBe('#one');

    // Register a router-level on() listener
    const routerCalls = [];
    router.on((r) => routerCalls.push(r.hash));

    // Register a route watcher via _addRouteWatcher (same path directives use)
    const watchCalls = [];
    const watcher = () => watchCalls.push(router.current.hash);
    _addRouteWatcher(watcher);

    // Hash-only navigation to /page#two
    router.push('/page#two');
    expect(router.current.hash).toBe('#two');

    // Router on() listener IS notified
    expect(routerCalls).toEqual(['#two']);

    // _routeWatchers are also notified — this was the bug before NOJS-95
    expect(watchCalls).toEqual(['#two']);

    // Cleanup
    _routeWatchers.delete(watcher);
  });

  test('rapid consecutive hash changes notify watchers for each change', () => {
    const { _addRouteWatcher, _routeWatchers } = require('../src/globals.js');

    router = _createRouter();
    setRouterInstance(router);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Page</div>';
    router.register('/rapid', tpl);

    router.push('/rapid#a');
    expect(router.current.hash).toBe('#a');

    const watchCalls = [];
    const watcher = () => watchCalls.push(router.current.hash);
    _addRouteWatcher(watcher);

    // Rapid consecutive hash-only changes
    router.push('/rapid#b');
    router.push('/rapid#c');
    router.push('/rapid#d');

    expect(watchCalls).toEqual(['#b', '#c', '#d']);
    expect(router.current.hash).toBe('#d');

    _routeWatchers.delete(watcher);
  });

  test('hash-only navigation combined with query params preserves query', () => {
    router = _createRouter();
    setRouterInstance(router);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Search</div>';
    router.register('/search', tpl);

    // Full navigation with query + hash
    router.push('/search?q=hello#results');
    expect(router.current.path).toBe('/search');
    expect(router.current.query.q).toBe('hello');
    expect(router.current.hash).toBe('#results');
  });

  test('hash removal navigates from hash to no hash', () => {
    router = _createRouter();
    setRouterInstance(router);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Page</div>';
    router.register('/page', tpl);

    // Navigate with hash
    router.push('/page#section');
    expect(router.current.hash).toBe('#section');

    // Navigate to same path without hash — this is a full navigation (no hash)
    router.push('/page');
    expect(router.current.path).toBe('/page');
    expect(router.current.hash).toBe('');
  });

  test('matches route params', () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>User</div>';
    router.register('/users/:id', tpl);

    router.push('/users/42');
    expect(router.current.params.id).toBe('42');
  });

  test('matches route with multiple params', () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Post</div>';
    router.register('/users/:userId/posts/:postId', tpl);

    router.push('/users/1/posts/99');
    expect(router.current.params.userId).toBe('1');
    expect(router.current.params.postId).toBe('99');
  });

  test('on() listener receives navigation events', async () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Page</div>';
    router.register('/page', tpl);

    const listener = jest.fn();
    router.on(listener);
    await router.push('/page');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/page' }),
    );
  });

  test('on() returns unsubscriber', async () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Page</div>';
    router.register('/page', tpl);
    router.register('/other', tpl);

    const listener = jest.fn();
    const unsub = router.on(listener);
    await router.push('/page');
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    await router.push('/other');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('renders into route-view outlet', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p class="routed">Route Content</p>';
    router.register('/page', tpl);

    await router.push('/page');
    expect(outlet.querySelector('.routed')).not.toBeNull();
    expect(outlet.querySelector('.routed').textContent).toBe('Route Content');
  });

  test('clears outlet when navigating to unmatched route', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Content</p>';
    router.register('/valid', tpl);

    await router.push('/valid');
    expect(outlet.querySelector('p')).not.toBeNull();

    await router.push('/unknown');
    // Previous route content is cleared; built-in 404 renders instead
    expect(outlet.querySelector('.routed')).toBeNull();
    expect(outlet.innerHTML).toContain('404');
  });

  test('init collects route templates from DOM', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/dashboard');
    tpl.innerHTML = '<p class="dash">Dashboard</p>';
    document.body.appendChild(tpl);

    router = _createRouter();
    setRouterInstance(router);
    window.location.hash = '#/dashboard';
    await router.init();

    expect(outlet.querySelector('.dash')).not.toBeNull();
  });

  test('scrolls to top on navigation', () => {
    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Content</div>';
    router.register('/scroll-test', tpl);

    router.push('/scroll-test');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test('route guard blocks navigation and redirects', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    router = _createRouter();

    const protectedTpl = document.createElement('template');
    protectedTpl.setAttribute('guard', 'false');
    protectedTpl.setAttribute('redirect', '/login');
    protectedTpl.innerHTML = '<p>Protected</p>';
    router.register('/admin', protectedTpl);

    const loginTpl = document.createElement('template');
    loginTpl.innerHTML = '<p class="login">Login</p>';
    router.register('/login', loginTpl);

    await router.push('/admin');

    expect(router.current.path).toBe('/login');
    expect(outlet.querySelector('.login')).not.toBeNull();
  });

  test('route guard without redirect clears outlet and emits warning', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    router = _createRouter();

    const protectedTpl = document.createElement('template');
    protectedTpl.setAttribute('guard', 'false');
    // No redirect attribute
    protectedTpl.innerHTML = '<p class="secret">Secret</p>';
    router.register('/secret', protectedTpl);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await router.push('/secret');

    expect(outlet.querySelector('.secret')).toBeNull();
    expect(outlet.innerHTML).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('guard failed')
    );

    warnSpy.mockRestore();
  });

  test('active class on route links', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const link = document.createElement('a');
    link.setAttribute('route', '/page');
    link.textContent = 'Go';
    document.body.appendChild(link);

    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Page</p>';
    router.register('/page', tpl);

    await router.push('/page');
    expect(link.classList.contains('active')).toBe(true);
  });

  test('nested templates in route content are loaded after outlet insertion', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    global.fetch = jest.fn((url) => {
      if (url === '/nested-page.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<div id="section-wrap"><template src="./section.tpl"></template></div>'),
        });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p class="section-loaded">Done</p>') });
    });

    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/nested-test');
    tpl.setAttribute('src', '/nested-page.tpl');
    document.body.appendChild(tpl);
    router.register('/nested-test', tpl);

    await router.push('/nested-test');

    expect(outlet.querySelector('.section-loaded')).not.toBeNull();
    expect(outlet.querySelector('.section-loaded').textContent).toBe('Done');
  });

  test('__srcBase from route template is preserved to wrapper so ./ nested paths resolve correctly', async () => {



    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    global.fetch = jest.fn((url) => {
      if (url === 'templates/page.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<template src="./section.tpl"></template>'),
        });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p class="ok">ok</p>') });
    });

    router = _createRouter();
    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/srcbase-test');
    tpl.setAttribute('src', 'templates/page.tpl');
    document.body.appendChild(tpl);
    router.register('/srcbase-test', tpl);

    await router.push('/srcbase-test');


    expect(global.fetch).toHaveBeenCalledWith('templates/section.tpl');
    expect(outlet.querySelector('.ok')).not.toBeNull();
  });
});

describe('router.js — hash mode hashchange', () => {
  test('navigates on hashchange event in hash mode', () => {
    _config.router = { useHash: true, base: '' };

    const routeView = document.createElement('div');
    routeView.setAttribute('route-view', '');
    document.body.appendChild(routeView);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/about');
    tpl.innerHTML = '<p>About page</p>';
    document.body.appendChild(tpl);

    const router = _createRouter();
    setRouterInstance(router);
    router.init();

    window.location.hash = '#/about';
    window.dispatchEvent(new Event('hashchange'));

    expect(router.current.path).toBe('/about');
  });
});

describe('router.js — history mode popstate', () => {
  test('navigates on popstate event in history mode', () => {
    _config.router = { useHash: false, base: '' };

    const routeView = document.createElement('div');
    routeView.setAttribute('route-view', '');
    document.body.appendChild(routeView);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/contact');
    tpl.innerHTML = '<p>Contact page</p>';
    document.body.appendChild(tpl);

    const router = _createRouter();
    setRouterInstance(router);
    router.init();

    window.history.pushState({}, '', '/contact');
    window.dispatchEvent(new Event('popstate'));

    expect(router.current.path).toBe('/contact');
  });
});

describe('Router — history mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    setRouterInstance(null);
  });

  test('push uses history.pushState in history mode', () => {
    const pushSpy = jest.spyOn(window.history, 'pushState');
    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Page</p>';
    router.register('/page', tpl);

    router.push('/page');

    expect(pushSpy).toHaveBeenCalledWith({}, '', '/page');
    expect(router.current.path).toBe('/page');
    pushSpy.mockRestore();
  });

  test('replace uses history.replaceState in history mode', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Page</p>';
    router.register('/page', tpl);

    router.replace('/page');

    expect(replaceSpy).toHaveBeenCalledWith({}, '', '/page');
    replaceSpy.mockRestore();
  });
});

describe('Router — back and forward', () => {
  test('back calls history.back', () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    const backSpy = jest.spyOn(window.history, 'back');
    const router = _createRouter();
    router.back();
    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  test('forward calls history.forward', () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    const forwardSpy = jest.spyOn(window.history, 'forward');
    const router = _createRouter();
    router.forward();
    expect(forwardSpy).toHaveBeenCalled();
    forwardSpy.mockRestore();
  });
});

describe('Router — route-active-exact', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    setRouterInstance(null);
  });

  test('exact active class only on exact match', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const link = document.createElement('a');
    link.setAttribute('route', '/users');
    link.setAttribute('route-active-exact', 'exact-active');
    document.body.appendChild(link);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Users</p>';
    router.register('/users', tpl);
    router.register('/users/1', tpl);

    await router.push('/users');
    expect(link.classList.contains('exact-active')).toBe(true);

    await router.push('/users/1');
    expect(link.classList.contains('exact-active')).toBe(false);
  });
});

describe('Router — route link click delegation', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    window.location.hash = '';
    document.body.innerHTML = '';
    setRouterInstance(null);
  });

  test('clicking route link navigates', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p class="about-page">About</p>';
    router.register('/', tpl);
    router.register('/about', tpl);

    await router.init();


    await router.push('/about');

    expect(router.current.path).toBe('/about');
    expect(outlet.querySelector('.about-page')).not.toBeNull();
  });
});

describe('Router — transition on outlet', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    setRouterInstance(null);
  });

  test('applies transition class from route-view', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('transition', 'page');
    document.body.appendChild(outlet);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Page</p>';
    router.register('/animated', tpl);

    await router.push('/animated');

    const wrapper = outlet.firstElementChild;
    expect(wrapper).not.toBeNull();
  });
});

describe('Router — scroll behavior none', () => {
  test('does not scroll when scrollBehavior is not "top"', () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'none' };
    window.scrollTo = jest.fn();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>No scroll</p>';
    router.register('/no-scroll', tpl);

    router.push('/no-scroll');

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe('Router — init with history mode', () => {
  test('init reads pathname in history mode', () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/');
    tpl.innerHTML = '<p class="home">Home</p>';
    document.body.appendChild(tpl);

    router.init();

    expect(router.current).toBeDefined();
  });
});

describe('Router — guard with null templateEl', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('navigates without error when templateEl is null', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    router.register('/ghost', null);

    await router.push('/ghost');

    expect(router.current.path).toBe('/ghost');

    expect(outlet.innerHTML).toBe('');
  });
});

describe('Router — popstate handler with base stripping', () => {
  beforeEach(() => {
    _config.router = { useHash: false, base: '/app', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    document.body.innerHTML = '';
  });

  test('popstate handler strips base from pathname', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/settings');
    tpl.innerHTML = '<p class="settings">Settings</p>';
    document.body.appendChild(tpl);


    window.history.pushState({}, '', '/app/');


    let popstateHandler;
    const origAdd = window.addEventListener;
    window.addEventListener = function (event, handler, ...rest) {
      if (event === 'popstate') popstateHandler = handler;
      return origAdd.call(this, event, handler, ...rest);
    };

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();


    window.addEventListener = origAdd;


    window.history.pushState({}, '', '/app/settings');


    popstateHandler();

    expect(router.current.path).toBe('/settings');
  });
});

describe('Router — init collects routes and reads initial path', () => {
  afterEach(() => {
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('hash mode init reads current hash and renders matching route (L184/L193)', async () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/welcome');
    tpl.innerHTML = '<p class="welcome">Welcome</p>';
    document.body.appendChild(tpl);

    window.location.hash = '#/welcome';

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/welcome');
    expect(outlet.querySelector('.welcome')).not.toBeNull();
  });

  test('hash mode init defaults to / when hash is empty', async () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    window.location.hash = '';

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/');
  });

  test('history mode init reads pathname and strips base (L197)', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();


    window.history.pushState({}, '', '/');

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/');
    tpl.innerHTML = '<p class="root">Root</p>';
    document.body.appendChild(tpl);

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/');
    expect(outlet.querySelector('.root')).not.toBeNull();
  });
});

describe('Router — prefetch routes from <a route> links', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test.skip('prefetches route templates from <a route> links on init (jsdom navigation not supported)', async () => {
    const fetchedUrls = [];
    global.fetch = jest.fn((url) => {
      fetchedUrls.push(url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p>Prefetched</p>') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('route-index', 'landing');
    document.body.appendChild(outlet);

    // Route links
    const link1 = document.createElement('a');
    link1.setAttribute('route', '/features');
    document.body.appendChild(link1);

    const link2 = document.createElement('a');
    link2.setAttribute('route', '/examples');
    document.body.appendChild(link2);

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // Wait for background prefetch to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchedUrls).toContain('templates/features.html');
    expect(fetchedUrls).toContain('templates/examples.html');
  });

  test('lazy="ondemand" links are not prefetched', async () => {
    const fetchedUrls = [];
    global.fetch = jest.fn((url) => {
      fetchedUrls.push(url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p>Page</p>') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('route-index', 'landing');
    document.body.appendChild(outlet);

    const link = document.createElement('a');
    link.setAttribute('route', '/playground');
    link.setAttribute('lazy', 'ondemand');
    document.body.appendChild(link);

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchedUrls).not.toContain('templates/playground.html');
  });

  test.skip('lazy="priority" links are prefetched before default links (jsdom navigation not supported)', async () => {
    const fetchOrder = [];
    global.fetch = jest.fn((url) => {
      fetchOrder.push(url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p>Page</p>') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('route-index', 'landing');
    document.body.appendChild(outlet);

    // Default link
    const bgLink = document.createElement('a');
    bgLink.setAttribute('route', '/features');
    document.body.appendChild(bgLink);

    // Priority link
    const prioLink = document.createElement('a');
    prioLink.setAttribute('route', '/docs');
    prioLink.setAttribute('lazy', 'priority');
    document.body.appendChild(prioLink);

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // Wait for all fetches
    await new Promise((r) => setTimeout(r, 50));

    const docsIdx = fetchOrder.indexOf('templates/docs.html');
    const featIdx = fetchOrder.indexOf('templates/features.html');
    expect(docsIdx).toBeGreaterThanOrEqual(0);
    expect(featIdx).toBeGreaterThanOrEqual(0);
    expect(docsIdx).toBeLessThan(featIdx);
  });

  test.skip('deduplicates links — priority wins over default (jsdom navigation not supported)', async () => {
    const fetchedUrls = [];
    global.fetch = jest.fn((url) => {
      fetchedUrls.push(url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p>Page</p>') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('route-index', 'landing');
    document.body.appendChild(outlet);

    // Same path, two links: one default, one priority
    const link1 = document.createElement('a');
    link1.setAttribute('route', '/docs');
    document.body.appendChild(link1);

    const link2 = document.createElement('a');
    link2.setAttribute('route', '/docs');
    link2.setAttribute('lazy', 'priority');
    document.body.appendChild(link2);

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    await new Promise((r) => setTimeout(r, 50));

    // Should only fetch once
    const docsFetches = fetchedUrls.filter((u) => u === 'templates/docs.html');
    expect(docsFetches.length).toBe(1);
  });

  test('current route is not prefetched', async () => {
    const fetchedUrls = [];
    global.fetch = jest.fn((url) => {
      fetchedUrls.push(url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p>Page</p>') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('route-index', 'landing');
    document.body.appendChild(outlet);

    // Link to current route (/ maps to landing)
    const link = document.createElement('a');
    link.setAttribute('route', '/');
    document.body.appendChild(link);

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    await new Promise((r) => setTimeout(r, 50));

    // landing.html is fetched for the initial route render, not for prefetch
    // The prefetch should skip "/" since it's the current path
    expect(fetchedUrls.filter((u) => u === 'templates/landing.html').length).toBeLessThanOrEqual(1);
  });
});

describe('Router — popstate handler in history mode (L173-177)', () => {
  beforeEach(() => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
  });

  test('popstate event triggers navigate in history mode', async () => {
    _config.router = { useHash: false, base: '', scrollBehavior: 'top' };

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tplHome = document.createElement('template');
    tplHome.setAttribute('route', '/');
    tplHome.innerHTML = '<p class="home">Home</p>';
    document.body.appendChild(tplHome);

    const tplAbout = document.createElement('template');
    tplAbout.setAttribute('route', '/about');
    tplAbout.innerHTML = '<p class="about">About</p>';
    document.body.appendChild(tplAbout);

    const router = _createRouter();
    setRouterInstance(router);

    router.init();


    window.history.pushState({}, '', '/about');
    window.dispatchEvent(new Event('popstate'));

    expect(router.current.path).toBe('/about');
  });

  test('popstate with non-empty base path strips base correctly', async () => {
    _config.router = { useHash: false, base: '/myapp', scrollBehavior: 'top' };

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tplRoot = document.createElement('template');
    tplRoot.setAttribute('route', '/');
    tplRoot.innerHTML = '<p class="root">Root</p>';
    document.body.appendChild(tplRoot);

    const tplSettings = document.createElement('template');
    tplSettings.setAttribute('route', '/settings');
    tplSettings.innerHTML = '<p class="settings">Settings</p>';
    document.body.appendChild(tplSettings);


    let popstateHandler;
    const origAdd = window.addEventListener;
    window.addEventListener = function (event, handler, ...rest) {
      if (event === 'popstate') popstateHandler = handler;
      return origAdd.call(this, event, handler, ...rest);
    };

    const router = _createRouter();
    setRouterInstance(router);

    router.init();

    window.addEventListener = origAdd;


    window.history.pushState({}, '', '/myapp/settings');
    popstateHandler();


    expect(router.current.path).toBe('/settings');
  });
});

describe('Router — scrollBehavior smooth', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'smooth' };
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('smooth scrollBehavior calls scrollTo with smooth behavior', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Smooth Page</p>';
    router.register('/smooth', tpl);

    await router.push('/smooth');

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});

describe('Router — scrollBehavior preserve', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'preserve' };
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('preserve scrollBehavior does NOT call scrollTo', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Preserve Page</p>';
    router.register('/preserve', tpl);

    await router.push('/preserve');

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe('on-demand template loading', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p class="about-content">About</p>'),
    });
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    delete global.fetch;
  });

  test('loads route template on-demand when navigating if not yet fetched', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/about');
    tpl.setAttribute('src', '/about.tpl');
    document.body.appendChild(tpl);

    const router = _createRouter();
    setRouterInstance(router);
    router.register('/about', tpl);

    await router.push('/about');

    expect(global.fetch).toHaveBeenCalledWith('/about.tpl');
  });

  test('does not re-fetch already loaded route template', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/about');
    tpl.setAttribute('src', '/about.tpl');
    tpl.__srcLoaded = true;
    tpl.innerHTML = '<p>About</p>';
    document.body.appendChild(tpl);

    const router = _createRouter();
    setRouterInstance(router);
    router.register('/about', tpl);

    await router.push('/about');

    expect(global.fetch).not.toHaveBeenCalled();
  });
});


// ═══════════════════════════════════════════════════════════════════════
//  FILE-BASED ROUTING
// ═══════════════════════════════════════════════════════════════════════

describe('File-based routing', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', templates: 'pages', ext: '.tpl' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p class="auto-content">Auto Loaded</p>'),
    });
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    delete global.fetch;
  });

  test('auto-resolves route from route-view[src] folder', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/analytics');

    expect(global.fetch).toHaveBeenCalledWith('pages/analytics.tpl');
    expect(outlet.querySelector('.auto-content')).not.toBeNull();
  });

  test('uses route-index for root path /', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    outlet.setAttribute('route-index', 'overview');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/');

    expect(global.fetch).toHaveBeenCalledWith('pages/overview.tpl');
  });

  test('defaults route-index to "index" when not specified', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/');

    expect(global.fetch).toHaveBeenCalledWith('pages/index.tpl');
  });

  test('supports custom extension via ext attribute', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './views/');
    outlet.setAttribute('ext', '.html');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/about');

    expect(global.fetch).toHaveBeenCalledWith('views/about.html');
  });

  test('uses config router.ext as default extension', async () => {
    _config.router.ext = '.jsx';
    _templateHtmlCache.clear();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './components/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/header');

    expect(global.fetch).toHaveBeenCalledWith('components/header.jsx');
    _config.router.ext = '.tpl'; // reset
  });

  test('outlet ext attribute overrides config router.ext', async () => {
    _config.router.ext = '.jsx';
    _templateHtmlCache.clear();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './components/');
    outlet.setAttribute('ext', '.vue');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/sidebar');

    expect(global.fetch).toHaveBeenCalledWith('components/sidebar.vue');
    expect(global.fetch).not.toHaveBeenCalledWith('components/sidebar.jsx');
    _config.router.ext = '.tpl'; // reset
  });

  test('caches auto-resolved templates on re-navigation', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/about');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Navigate away and back
    await router.push('/other');
    await router.push('/about');

    // Should not re-fetch (template element is cached + HTML cache)
    expect(global.fetch).toHaveBeenCalledTimes(2); // /other is a new fetch
  });

  test('explicit routes take priority over file-based routing', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    // Register an explicit route
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p class="explicit">Explicit Route</p>';

    const router = _createRouter();
    setRouterInstance(router);
    router.register('/about', tpl);

    await router.push('/about');

    // Explicit route should render, not file-based
    expect(outlet.querySelector('.explicit')).not.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('handles nested route paths', async () => {
    // With NOJS-21 hierarchical resolution, multi-segment paths first try
    // the first segment as a layout.  When the layout probe succeeds (the
    // generic mock returns ok:true for everything), the router loads
    // pages/settings.tpl as a layout and then resolves "profile" as a child.
    // When the layout probe fails, it falls back to flat pages/settings/profile.tpl.
    // Here the mock always returns ok:true, so the layout probe succeeds first.
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/settings/profile');

    // Hierarchical resolution tries pages/settings.tpl first (layout probe)
    expect(global.fetch).toHaveBeenCalledWith('pages/settings.tpl');
  });

  test('normalizes src path with trailing slash', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages');  // no trailing slash
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/features');

    expect(global.fetch).toHaveBeenCalledWith('pages/features.tpl');
  });

  test('sets i18n-ns on auto-resolved template when outlet has i18n-ns', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('i18n-ns', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/features');

    // The auto-created template should have i18n-ns="features"
    const autoTpl = document.querySelector('template[route="/features"]');
    expect(autoTpl).not.toBeNull();
    expect(autoTpl.getAttribute('i18n-ns')).toBe('features');
  });

  test('i18n-ns uses route-index name for root path', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', 'templates/');
    outlet.setAttribute('route-index', 'landing');
    outlet.setAttribute('i18n-ns', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/');

    const autoTpl = document.querySelector('template[route="/"]');
    expect(autoTpl).not.toBeNull();
    expect(autoTpl.getAttribute('i18n-ns')).toBe('landing');
  });

  test('preserves query params and hash with file-based routing', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/dashboard?tab=stats#summary');

    expect(global.fetch).toHaveBeenCalledWith('pages/dashboard.tpl');
    expect(router.current.path).toBe('/dashboard');
    expect(router.current.query.tab).toBe('stats');
    expect(router.current.hash).toBe('#summary');
    expect(outlet.querySelector('.auto-content')).not.toBeNull();
  });

  test('uses config router.templates default when outlet has no src attribute', async () => {
    // templates defaults to 'pages' — file-based routing works without src on outlet
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    // No src attribute — uses config default
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/anything');

    expect(global.fetch).toHaveBeenCalledWith('pages/anything.tpl');
    expect(outlet.querySelector('.auto-content')).not.toBeNull();
  });

  test('different auto-resolved routes fetch different files', async () => {
    _templateHtmlCache.clear();
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './sections/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/alpha');
    expect(global.fetch).toHaveBeenCalledWith('sections/alpha.tpl');

    await router.push('/bravo');
    expect(global.fetch).toHaveBeenCalledWith('sections/bravo.tpl');

    await router.push('/charlie');
    expect(global.fetch).toHaveBeenCalledWith('sections/charlie.tpl');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('file-based routing works with history mode', async () => {
    _config.router.useHash = false;
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './views/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/contact');

    expect(global.fetch).toHaveBeenCalledWith('views/contact.tpl');
    expect(outlet.querySelector('.auto-content')).not.toBeNull();
  });

  test('renders content from fetched template in outlet', async () => {
    _templateHtmlCache.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<h1 class="page-title">Dashboard</h1><p class="page-body">Stats here</p>'),
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './render-test/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/my-dashboard');

    expect(outlet.querySelector('.page-title').textContent).toBe('Dashboard');
    expect(outlet.querySelector('.page-body').textContent).toBe('Stats here');
  });

  test('clears previous content when navigating to new file-based route', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      const html = callCount === 1
        ? '<p class="first-page">First</p>'
        : '<p class="second-page">Second</p>';
      return Promise.resolve({ ok: true, text: () => Promise.resolve(html) });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/first');
    expect(outlet.querySelector('.first-page')).not.toBeNull();

    await router.push('/second');
    expect(outlet.querySelector('.second-page')).not.toBeNull();
    expect(outlet.querySelector('.first-page')).toBeNull(); // previous content cleared
  });

  test('uses config router.templates as fallback when outlet has no src', async () => {
    _config.router.templates = './views/';
    _templateHtmlCache.clear();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    // No src attribute on outlet — should fall back to config
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/products');

    expect(global.fetch).toHaveBeenCalledWith('views/products.tpl');
    expect(outlet.querySelector('.auto-content')).not.toBeNull();
  });

  test('outlet src attribute overrides config router.templates', async () => {
    _config.router.templates = './default-views/';
    _templateHtmlCache.clear();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './custom/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/orders');

    expect(global.fetch).toHaveBeenCalledWith('custom/orders.tpl');
    expect(global.fetch).not.toHaveBeenCalledWith('default-views/orders.tpl');
  });

  test('config router.templates uses route-index for root path', async () => {
    _config.router.templates = './pages/';
    _templateHtmlCache.clear();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('route-index', 'home');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/');

    expect(global.fetch).toHaveBeenCalledWith('pages/home.tpl');
  });

  test('no file-based routing when both outlet src and config templates are empty', async () => {
    _config.router.templates = '';
    _templateHtmlCache.clear();

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/nowhere');

    expect(global.fetch).not.toHaveBeenCalled();
    // No file-based routing but built-in 404 still renders for unmatched routes
    expect(outlet.innerHTML).toContain('404');
  });
});

describe('Router — Named Outlets', () => {
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



  test('register() with 2 args registers to "default" outlet', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Main content</p>';

    const router = _createRouter();
    router.register('/page', tpl);
    await router.push('/page');

    expect(outlet.innerHTML).toContain('Main content');
  });

  test('register() with 3rd arg targets named outlet', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);

    const mainTpl = document.createElement('template');
    mainTpl.innerHTML = '<p>Main</p>';

    const sidebarTpl = document.createElement('template');
    sidebarTpl.innerHTML = '<nav>Sidebar</nav>';

    const router = _createRouter();
    router.register('/page', mainTpl);
    router.register('/page', sidebarTpl, 'sidebar');
    await router.push('/page');

    expect(mainOutlet.innerHTML).toContain('Main');
    expect(sidebarOutlet.innerHTML).toContain('Sidebar');
  });



  test('route-view with empty value treated as default outlet', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Default content</p>';

    const router = _createRouter();
    router.register('/test', tpl);
    await router.push('/test');

    expect(outlet.innerHTML).toContain('Default content');
  });



  test('template outlet attr registers to named outlet via init()', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);


    const mainTpl = document.createElement('template');
    mainTpl.setAttribute('route', '/dash');
    mainTpl.innerHTML = '<h1>Dashboard</h1>';
    document.body.appendChild(mainTpl);

    const sidebarTpl = document.createElement('template');
    sidebarTpl.setAttribute('route', '/dash');
    sidebarTpl.setAttribute('outlet', 'sidebar');
    sidebarTpl.innerHTML = '<nav>Dashboard nav</nav>';
    document.body.appendChild(sidebarTpl);

    window.location.hash = '#/dash';
    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(mainOutlet.innerHTML).toContain('Dashboard');
    expect(sidebarOutlet.innerHTML).toContain('Dashboard nav');
  });



  test('named outlet is cleared when route has no template for that outlet', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    sidebarOutlet.innerHTML = '<p>stale sidebar</p>';
    document.body.appendChild(sidebarOutlet);

    const mainTpl = document.createElement('template');
    mainTpl.innerHTML = '<p>About</p>';

    const router = _createRouter();
    router.register('/about', mainTpl);
    await router.push('/about');

    expect(mainOutlet.innerHTML).toContain('About');

    expect(sidebarOutlet.innerHTML).toBe('');
  });



  test('renders three different outlets for same route', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);

    const topbarOutlet = document.createElement('div');
    topbarOutlet.setAttribute('route-view', 'topbar');
    document.body.appendChild(topbarOutlet);

    const mainTpl = document.createElement('template');
    mainTpl.innerHTML = '<main>Main body</main>';

    const sidebarTpl = document.createElement('template');
    sidebarTpl.innerHTML = '<aside>Side panel</aside>';

    const topbarTpl = document.createElement('template');
    topbarTpl.innerHTML = '<header>Top bar</header>';

    const router = _createRouter();
    router.register('/app', mainTpl);
    router.register('/app', sidebarTpl, 'sidebar');
    router.register('/app', topbarTpl, 'topbar');
    await router.push('/app');

    expect(mainOutlet.innerHTML).toContain('Main body');
    expect(sidebarOutlet.innerHTML).toContain('Side panel');
    expect(topbarOutlet.innerHTML).toContain('Top bar');
  });



  test('navigating clears named outlet when new route has no template for it', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);

    const homeTpl = document.createElement('template');
    homeTpl.innerHTML = '<p>Home</p>';

    const homeSidebarTpl = document.createElement('template');
    homeSidebarTpl.innerHTML = '<nav>Home sidebar</nav>';

    const aboutTpl = document.createElement('template');
    aboutTpl.innerHTML = '<p>About</p>';


    const router = _createRouter();
    router.register('/home', homeTpl);
    router.register('/home', homeSidebarTpl, 'sidebar');
    router.register('/about', aboutTpl);


    await router.push('/home');
    expect(mainOutlet.innerHTML).toContain('Home');
    expect(sidebarOutlet.innerHTML).toContain('Home sidebar');


    await router.push('/about');
    expect(mainOutlet.innerHTML).toContain('About');
    expect(sidebarOutlet.innerHTML).toBe('');
  });



  test('guard check still works with named outlets', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const protectedTpl = document.createElement('template');
    protectedTpl.setAttribute('guard', 'false');
    protectedTpl.setAttribute('redirect', '/login');
    protectedTpl.innerHTML = '<p>Protected</p>';

    const loginTpl = document.createElement('template');
    loginTpl.innerHTML = '<p>Login page</p>';

    const router = _createRouter();
    router.register('/protected', protectedTpl);
    router.register('/login', loginTpl);
    await router.push('/protected');


    expect(router.current.path).toBe('/login');
    expect(outlet.innerHTML).toContain('Login page');
  });
});

describe('Router — anchor links in hash mode', () => {
  let router;

  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('click on href="#id" scrolls to element and prevents route navigation', async () => {
    const section = document.createElement('div');
    section.id = 'my-section';
    section.scrollIntoView = jest.fn();
    document.body.appendChild(section);

    const link = document.createElement('a');
    link.setAttribute('href', '#my-section');
    document.body.appendChild(link);

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Home</p>';
    router = _createRouter();
    router.register('/', tpl);
    await router.init();

    expect(router.current.path).toBe('/');

    link.click();

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(router.current.path).toBe('/');
  });

  test('click on href="#id" adds active class to matching anchor links', async () => {
    const section1 = document.createElement('div');
    section1.id = 'section-a';
    section1.scrollIntoView = jest.fn();
    document.body.appendChild(section1);

    const section2 = document.createElement('div');
    section2.id = 'section-b';
    section2.scrollIntoView = jest.fn();
    document.body.appendChild(section2);

    const linkA = document.createElement('a');
    linkA.setAttribute('href', '#section-a');
    linkA.className = 'sidebar-link';
    document.body.appendChild(linkA);

    const linkB = document.createElement('a');
    linkB.setAttribute('href', '#section-b');
    linkB.className = 'sidebar-link';
    document.body.appendChild(linkB);

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Home</p>';
    router = _createRouter();
    router.register('/', tpl);
    await router.init();

    linkA.click();
    expect(linkA.classList.contains('active')).toBe(true);
    expect(linkB.classList.contains('active')).toBe(false);

    linkB.click();
    expect(linkA.classList.contains('active')).toBe(false);
    expect(linkB.classList.contains('active')).toBe(true);
  });

  test('click on href="#id" is ignored when target element does not exist', async () => {
    const link = document.createElement('a');
    link.setAttribute('href', '#nonexistent');
    document.body.appendChild(link);

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Home</p>';
    router = _createRouter();
    router.register('/', tpl);
    await router.init();

    link.click();
    expect(router.current.path).toBe('/');
  });

  test('anchor links with route attribute are handled as route navigation, not anchors', async () => {
    const link = document.createElement('a');
    link.setAttribute('route', '/about');
    link.setAttribute('href', '#about');
    document.body.appendChild(link);

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const homeTpl = document.createElement('template');
    homeTpl.innerHTML = '<p>Home</p>';
    const aboutTpl = document.createElement('template');
    aboutTpl.innerHTML = '<p>About</p>';

    router = _createRouter();
    router.register('/', homeTpl);
    router.register('/about', aboutTpl);
    await router.init();

    link.click();
    expect(router.current.path).toBe('/about');
  });

  test('href="#/route" starting with slash is not treated as anchor', async () => {
    const link = document.createElement('a');
    link.setAttribute('href', '#/docs');
    document.body.appendChild(link);

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Home</p>';
    router = _createRouter();
    router.register('/', tpl);
    await router.init();

    link.click();
    expect(router.current.path).toBe('/');
  });
});

describe('Router — wildcard 404 catch-all', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', templates: '', ext: '.tpl' };
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
    if (global.fetch) delete global.fetch;
  });

  test('wildcard route registration: route="*" templates do NOT appear in routes array', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.setAttribute('route', '*');
    wildcardTpl.innerHTML = '<p>404</p>';
    document.body.appendChild(wildcardTpl);

    const normalTpl = document.createElement('template');
    normalTpl.setAttribute('route', '/about');
    normalTpl.innerHTML = '<p>About</p>';
    document.body.appendChild(normalTpl);

    const router = _createRouter();
    setRouterInstance(router);
    window.location.hash = '#/about';
    await router.init();

    // register() exposes routes internally — wildcard should not be in routes
    // Verify the wildcard is NOT navigable as an explicit route
    const matched = router.push('/about');
    expect(router.current.path).toBe('/about');

    // If we navigate to "*" literally, it shouldn't match any explicit route
    await router.push('/*');
    expect(router.current.matched).toBe(false);
  });

  test('wildcard rendering — default outlet: navigate to /nonexistent renders wildcard content', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="custom-404">Custom Not Found</p>';

    const router = _createRouter();
    router.register('*', wildcardTpl);
    router.register('/home', document.createElement('template'));

    await router.push('/nonexistent');

    expect(outlet.querySelector('.custom-404')).not.toBeNull();
    expect(outlet.querySelector('.custom-404').textContent).toBe('Custom Not Found');
  });

  test('wildcard rendering — named outlet: renders in [route-view="sidebar"] when no route matches', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);

    const mainWildcard = document.createElement('template');
    mainWildcard.innerHTML = '<p class="main-404">Main 404</p>';

    const sidebarWildcard = document.createElement('template');
    sidebarWildcard.innerHTML = '<p class="sidebar-404">Sidebar 404</p>';

    const router = _createRouter();
    router.register('*', mainWildcard);
    router.register('*', sidebarWildcard, 'sidebar');

    await router.push('/nonexistent');

    expect(sidebarOutlet.querySelector('.sidebar-404')).not.toBeNull();
    expect(sidebarOutlet.querySelector('.sidebar-404').textContent).toBe('Sidebar 404');
  });

  test('fallback chain — local then global: named outlet with no local wildcard falls back to global', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);

    // Only define a global (default outlet) wildcard, no sidebar-specific one
    const globalWildcard = document.createElement('template');
    globalWildcard.innerHTML = '<p class="global-404">Global Not Found</p>';

    const router = _createRouter();
    router.register('*', globalWildcard);

    await router.push('/nonexistent');

    // Main outlet gets the global wildcard
    expect(mainOutlet.querySelector('.global-404')).not.toBeNull();

    // Sidebar should fall back to the global wildcard too
    expect(sidebarOutlet.querySelector('.global-404')).not.toBeNull();
  });

  test('fallback chain — built-in 404: no wildcard defined → outlet contains the built-in 404 HTML', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    // No wildcard, no routes — navigate to something

    await router.push('/nonexistent');

    expect(outlet.innerHTML).toContain('404');
    expect(outlet.querySelector('h1')).not.toBeNull();
    expect(outlet.querySelector('h1').textContent).toBe('404');
    expect(outlet.querySelector('p').textContent).toBe('Page not found');
  });

  test('developer wildcard overrides built-in: route="*" content renders instead of built-in', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<h1 class="dev-404">Custom 404</h1>';

    const router = _createRouter();
    router.register('*', wildcardTpl);

    await router.push('/nonexistent');

    expect(outlet.querySelector('.dev-404')).not.toBeNull();
    expect(outlet.querySelector('.dev-404').textContent).toBe('Custom 404');
    // Built-in 404 should NOT be present
    expect(outlet.innerHTML).not.toContain('Page not found');
  });

  test('$route.matched is false when navigating to unmatched path', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Home</p>';
    router.register('/', tpl);

    await router.push('/nonexistent');

    expect(router.current.matched).toBe(false);
  });

  test('$route.matched is true when navigating to a defined route', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    const tpl = document.createElement('template');
    tpl.innerHTML = '<p>Home</p>';
    router.register('/', tpl);

    await router.push('/');

    expect(router.current.matched).toBe(true);
  });

  test('$route.path available in wildcard: navigate to /nonexistent shows correct path', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="path-display">Not Found</p>';

    const router = _createRouter();
    router.register('*', wildcardTpl);

    await router.push('/nonexistent');

    // The $route context is created with the current path
    expect(router.current.path).toBe('/nonexistent');
    expect(outlet.querySelector('.path-display')).not.toBeNull();
  });

  test('wildcard with src: remote template loads via fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p class="remote-404">Remote 404 Page</p>'),
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.setAttribute('src', './404.tpl');

    const router = _createRouter();
    router.register('*', wildcardTpl);

    await router.push('/nonexistent');

    expect(global.fetch).toHaveBeenCalledWith('404.tpl');
    expect(outlet.querySelector('.remote-404')).not.toBeNull();
    expect(outlet.querySelector('.remote-404').textContent).toBe('Remote 404 Page');
  });

  test('wildcard with guard: guarded wildcard that blocks → redirect executes', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.setAttribute('guard', 'false');
    wildcardTpl.setAttribute('redirect', '/login');
    wildcardTpl.innerHTML = '<p>Guarded 404</p>';

    const loginTpl = document.createElement('template');
    loginTpl.innerHTML = '<p class="login">Login</p>';

    const router = _createRouter();
    router.register('*', wildcardTpl);
    router.register('/login', loginTpl);

    await router.push('/nonexistent');

    // Guard blocked the wildcard, redirect to /login
    expect(router.current.path).toBe('/login');
    expect(outlet.querySelector('.login')).not.toBeNull();
  });

  test('wildcard not returned by matchRoute: navigating to "*" literally returns matched=false', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="catch-all">Catch All</p>';

    const router = _createRouter();
    router.register('*', wildcardTpl);
    router.register('/home', document.createElement('template'));

    // Navigate to literal "*" — matchRoute should NOT match it
    await router.push('/*');

    expect(router.current.matched).toBe(false);
  });

  test('explicit routes always win: /about uses explicit route, not wildcard', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const aboutTpl = document.createElement('template');
    aboutTpl.innerHTML = '<p class="about-page">About Us</p>';

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="wildcard-page">404</p>';

    const router = _createRouter();
    router.register('/about', aboutTpl);
    router.register('*', wildcardTpl);

    await router.push('/about');

    expect(router.current.matched).toBe(true);
    expect(outlet.querySelector('.about-page')).not.toBeNull();
    expect(outlet.querySelector('.wildcard-page')).toBeNull();
  });

  test('file-based routing 404: fetch returns { ok: false } → wildcard fallback activates', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    });

    _config.router.templates = 'pages';

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="fallback-404">Wildcard Fallback</p>';

    const router = _createRouter();
    router.register('*', wildcardTpl);

    await router.push('/nonexistent');

    expect(outlet.querySelector('.fallback-404')).not.toBeNull();
    expect(outlet.querySelector('.fallback-404').textContent).toBe('Wildcard Fallback');
  });

  test('multiple outlets with different wildcards: each renders independently', async () => {
    const mainOutlet = document.createElement('div');
    mainOutlet.setAttribute('route-view', '');
    document.body.appendChild(mainOutlet);

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.setAttribute('route-view', 'sidebar');
    document.body.appendChild(sidebarOutlet);

    const mainWildcard = document.createElement('template');
    mainWildcard.innerHTML = '<p class="main-wc">Main Wildcard</p>';

    const sidebarWildcard = document.createElement('template');
    sidebarWildcard.innerHTML = '<p class="sidebar-wc">Sidebar Wildcard</p>';

    const router = _createRouter();
    router.register('*', mainWildcard);
    router.register('*', sidebarWildcard, 'sidebar');

    await router.push('/nonexistent');

    expect(mainOutlet.querySelector('.main-wc')).not.toBeNull();
    expect(mainOutlet.querySelector('.main-wc').textContent).toBe('Main Wildcard');
    expect(mainOutlet.querySelector('.sidebar-wc')).toBeNull();

    expect(sidebarOutlet.querySelector('.sidebar-wc')).not.toBeNull();
    expect(sidebarOutlet.querySelector('.sidebar-wc').textContent).toBe('Sidebar Wildcard');
    expect(sidebarOutlet.querySelector('.main-wc')).toBeNull();
  });

  test('register("*", tpl) programmatic API: stores in wildcards, not routes', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="api-404">API 404</p>';

    const normalTpl = document.createElement('template');
    normalTpl.innerHTML = '<p>Home</p>';

    const router = _createRouter();
    router.register('*', wildcardTpl);
    router.register('/home', normalTpl);

    // Navigate to /home — should use normal route, not wildcard
    await router.push('/home');
    expect(router.current.matched).toBe(true);
    expect(outlet.querySelector('.api-404')).toBeNull();

    // Navigate to unmatched — wildcard should render
    await router.push('/unknown');
    expect(router.current.matched).toBe(false);
    expect(outlet.querySelector('.api-404')).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NEW TESTS: History mode bug fixes
// ═══════════════════════════════════════════════════════════════════════

describe('Router — base stripping (_stripBase)', () => {
  afterEach(() => {
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('base "/" with pathname "/about" returns "/about" (not "about")', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/about');
    tpl.innerHTML = '<p>About</p>';
    document.body.appendChild(tpl);

    // Set pathname via pushState (works in jsdom)
    window.history.pushState({}, '', '/about');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/about');
    expect(router.current.matched).toBe(true);
  });

  test('base "/" with pathname "/users/42" returns "/users/42"', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/users/:id');
    tpl.innerHTML = '<p>User</p>';
    document.body.appendChild(tpl);

    window.history.pushState({}, '', '/users/42');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/users/42');
    expect(router.current.params.id).toBe('42');
    expect(router.current.matched).toBe(true);
  });

  test('base "/app" with pathname "/app/settings" returns "/settings"', async () => {
    _config.router = { useHash: false, base: '/app', scrollBehavior: 'top' };
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/settings');
    tpl.innerHTML = '<p>Settings</p>';
    document.body.appendChild(tpl);

    window.history.pushState({}, '', '/app/settings');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/settings');
    expect(router.current.matched).toBe(true);
  });

  test('base "/app" with pathname "/application" strips prefix (regex anchored to start)', async () => {
    _config.router = { useHash: false, base: '/app', scrollBehavior: 'top' };
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    window.history.pushState({}, '', '/application');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // /application starts with /app so regex ^\/app strips it to "lication"
    // This documents the behavior — base paths should be unique prefixes
    expect(router.current.path).toBe('lication');
  });

  test('base "/" with pathname "/" returns "/"', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    window.history.pushState({}, '', '/');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/');
  });
});

describe('Router — popstate same-path guard (history mode)', () => {
  afterEach(() => {
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('popstate with same path does NOT re-render route', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/docs');
    tpl.innerHTML = '<p>Docs</p>';
    document.body.appendChild(tpl);

    window.history.pushState({}, '', '/docs');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    const popstateHandler = _trackedWinPopstateHandlers[_trackedWinPopstateHandlers.length - 1];

    expect(router.current.path).toBe('/docs');
    const listener = jest.fn();
    router.on(listener);

    // Simulate popstate with same path (e.g., hash change only)
    popstateHandler();

    // Listener should NOT have been called (no re-navigation)
    expect(listener).not.toHaveBeenCalled();
  });

  test('popstate with different path DOES navigate', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl1 = document.createElement('template');
    tpl1.setAttribute('route', '/docs');
    tpl1.innerHTML = '<p>Docs</p>';
    document.body.appendChild(tpl1);

    const tpl2 = document.createElement('template');
    tpl2.setAttribute('route', '/about');
    tpl2.innerHTML = '<p>About</p>';
    document.body.appendChild(tpl2);

    window.history.pushState({}, '', '/docs');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    const popstateHandler = _trackedWinPopstateHandlers[_trackedWinPopstateHandlers.length - 1];

    expect(router.current.path).toBe('/docs');
    const listener = jest.fn();
    router.on(listener);

    // Change pathname and fire popstate
    window.history.pushState({}, '', '/about');
    popstateHandler();

    // Wait for async navigate to complete
    await new Promise(r => setTimeout(r, 50));

    expect(listener).toHaveBeenCalled();
    expect(router.current.path).toBe('/about');
  });
});

describe('Router — anchor links in history mode', () => {
  afterEach(() => {
    setRouterInstance(null);
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  test('click on href="#section" in history mode calls preventDefault', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    // Create target element first
    const section = document.createElement('div');
    section.id = 'section';
    section.scrollIntoView = jest.fn();
    document.body.appendChild(section);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/');
    tpl.innerHTML = '<p>Home</p>';
    document.body.appendChild(tpl);

    window.history.pushState({}, '', '/');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // Create anchor link targeting #section
    const anchor = document.createElement('a');
    anchor.setAttribute('href', '#section');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const prevented = !anchor.dispatchEvent(event);

    expect(prevented).toBe(true);
  });

  test('anchor link with route attr is handled as route nav, not anchor', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    window.scrollTo = jest.fn();
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const homeTpl = document.createElement('template');
    homeTpl.setAttribute('route', '/');
    homeTpl.innerHTML = '<p>Home</p>';
    document.body.appendChild(homeTpl);

    const aboutTpl = document.createElement('template');
    aboutTpl.setAttribute('route', '/about');
    aboutTpl.innerHTML = '<p>About</p>';
    document.body.appendChild(aboutTpl);

    window.history.pushState({}, '', '/');

    const router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/');

    const link = document.createElement('a');
    link.setAttribute('href', '#about');
    link.setAttribute('route', '/about');
    document.body.appendChild(link);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 50));

    expect(router.current.path).toBe('/about');
  });
});

describe('Router — mode→useHash backward compat', () => {
  test('config with mode:"hash" sets useHash:true', async () => {
    const { default: No } = await import('../src/index.js');
    No.config({ router: { mode: 'hash' } });
    expect(_config.router.useHash).toBe(true);
    expect(_config.router.mode).toBeUndefined();
    _config.router.useHash = false;
  });

  test('config with mode:"history" sets useHash:false', async () => {
    const { default: No } = await import('../src/index.js');
    No.config({ router: { mode: 'history' } });
    expect(_config.router.useHash).toBe(false);
    expect(_config.router.mode).toBeUndefined();
  });

  test('config with useHash:true takes precedence over mode', async () => {
    const { default: No } = await import('../src/index.js');
    No.config({ router: { mode: 'history', useHash: true } });
    expect(_config.router.useHash).toBe(true);
    _config.router.useHash = false;
  });

});

describe('Router — page-title attribute', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    window.location.hash = '';
    document.title = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '';
    document.title = '';
  });

  test('updates document.title from a static page-title expression', async () => {
    document.body.innerHTML = `
      <template route="/about" page-title="'About Us | My Site'">
        <h1>About</h1>
      </template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');
    expect(document.title).toBe('About Us | My Site');
  });

  test('updates document.title using $route.params', async () => {
    document.body.innerHTML = `
      <template route="/products/:id" page-title="'Product ' + $route.params.id + ' | Store'">
        <h1>Product</h1>
      </template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/products/42');
    expect(document.title).toBe('Product 42 | Store');
  });

  test('updates document.title on each navigation', async () => {
    document.body.innerHTML = `
      <template route="/home" page-title="'Home | Site'"><h1>Home</h1></template>
      <template route="/about" page-title="'About | Site'"><h1>About</h1></template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/home');
    expect(document.title).toBe('Home | Site');
    await router.push('/about');
    expect(document.title).toBe('About | Site');
  });

  test('does not update document.title when page-title is absent', async () => {
    document.title = 'Original Title';
    document.body.innerHTML = `
      <template route="/no-title"><h1>No title</h1></template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/no-title');
    expect(document.title).toBe('Original Title');
  });
});

// ─── Route head attributes (M8) ──────────────────────────────────────────────

describe('Router — route head attributes (page-title, page-description, page-canonical, page-jsonld)', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    document.title = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    document.title = '';
    window.location.hash = '';
  });

  test('page-title attribute sets document.title on navigation', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/about" page-title="'About Us | Site'">
        <h1>About</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');
    expect(document.title).toBe('About Us | Site');
  });

  test('page-title does not change title when attribute is absent', async () => {
    document.title = 'Original';
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/home">
        <h1>Home</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/home');
    expect(document.title).toBe('Original');
  });

  test('page-description creates <meta name="description"> in head', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/about" page-description="'Best site ever'">
        <h1>About</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta.content).toBe('Best site ever');
  });

  test('page-description updates existing <meta name="description"> without duplicating', async () => {
    const existing = document.createElement('meta');
    existing.name = 'description';
    existing.content = 'Old';
    document.head.appendChild(existing);

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/about" page-description="'New description'">
        <h1>About</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');
    const metas = document.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
    expect(metas[0].content).toBe('New description');
  });

  test('page-canonical creates <link rel="canonical"> in head', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/about" page-canonical="'/about'">
        <h1>About</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('/about');
  });

  test('page-canonical updates existing canonical link without duplicating', async () => {
    const existing = document.createElement('link');
    existing.rel = 'canonical';
    existing.href = '/old';
    document.head.appendChild(existing);

    document.body.innerHTML = `
      <div route-view></div>
      <template route="/new" page-canonical="'/new'">
        <h1>New</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/new');
    const links = document.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].href).toContain('/new');
  });

  test('page-jsonld creates <script type="application/ld+json" data-nojs> in head', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/about" page-jsonld='{"@type":"WebPage","name":"About Us"}'>
        <h1>About</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/about');
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('WebPage');
    expect(script.textContent).toContain('About Us');
  });

  test('page-jsonld updates existing managed script without duplicating', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/a" page-jsonld='{"@type":"WebPage","name":"A"}'>
        <h1>A</h1>
      </template>
      <template route="/b" page-jsonld='{"@type":"WebPage","name":"B"}'>
        <h1>B</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/a');
    await router.push('/b');
    const scripts = document.querySelectorAll('script[type="application/ld+json"][data-nojs]');
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).toContain('"B"');
  });

  test('all four attributes can be combined on a single template', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/product"
        page-title="'Sneaker X | Store'"
        page-description="'Best sneaker around'"
        page-canonical="'/product'"
        page-jsonld='{"@type":"Product","name":"Sneaker X"}'>
        <h1>Product</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/product');
    expect(document.title).toBe('Sneaker X | Store');
    expect(document.querySelector('meta[name="description"]').content).toBe('Best sneaker around');
    expect(document.querySelector('link[rel="canonical"]').href).toContain('/product');
    expect(document.querySelector('script[type="application/ld+json"][data-nojs]').textContent).toContain('Sneaker X');
  });

  test('head attributes are updated on each navigation', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/a" page-title="'Page A'" page-description="'Desc A'">
        <h1>A</h1>
      </template>
      <template route="/b" page-title="'Page B'" page-description="'Desc B'">
        <h1>B</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/a');
    expect(document.title).toBe('Page A');
    expect(document.querySelector('meta[name="description"]').content).toBe('Desc A');

    await router.push('/b');
    expect(document.title).toBe('Page B');
    expect(document.querySelector('meta[name="description"]').content).toBe('Desc B');
  });

  test('page-jsonld supports {placeholder} interpolation with $route.params', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/products/:id"
        page-jsonld='{"@type":"Product","productId":"{$route.params.id}"}'>
        <h1>Product</h1>
      </template>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/products/42');
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('"42"');
    expect(script.textContent).not.toContain('{$route.params.id}');
  });
});
describe('Router — useHash SEO warning', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  afterEach(() => {
    warnSpy.mockRestore();
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
  });

  test('emits a warning when useHash: true is set on router init', async () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
    const router = _createRouter();
    await router.init();
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('hash mode'),
    );
  });

  test('does not warn when useHash: false (default)', async () => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top' };
    const router = _createRouter();
    await router.init();
    const hashWarning = warnSpy.mock.calls.find(
      (call) => call[1] && call[1].includes('hash mode'),
    );
    expect(hashWarning).toBeUndefined();
  });

  test('does not warn when suppressHashWarning: true', async () => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', suppressHashWarning: true };
    const router = _createRouter();
    await router.init();
    const hashWarning = warnSpy.mock.calls.find(
      (call) => call[1] && call[1].includes('hash mode'),
    );
    expect(hashWarning).toBeUndefined();
  });
});

describe('Router — destroy() removes global listeners', () => {
  let router;

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

  test('should register global listeners after init()', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/');
    tpl.innerHTML = '<p>Home</p>';
    document.body.appendChild(tpl);

    router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // After init, click handler should be registered on document
    expect(_trackedDocClickHandlers.length).toBeGreaterThanOrEqual(1);
    // In hash mode, hashchange handler should be registered on window
    expect(_trackedWinHashchangeHandlers.length).toBeGreaterThanOrEqual(1);
  });

  test('should remove all global listeners after destroy()', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/');
    tpl.innerHTML = '<p>Home</p>';
    document.body.appendChild(tpl);

    router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // Verify listeners are registered
    const clickCountBefore = _trackedDocClickHandlers.length;
    const hashCountBefore = _trackedWinHashchangeHandlers.length;
    expect(clickCountBefore).toBeGreaterThanOrEqual(1);
    expect(hashCountBefore).toBeGreaterThanOrEqual(1);

    router.destroy();

    // After destroy, all router-registered listeners should be removed
    expect(_trackedDocClickHandlers.length).toBe(clickCountBefore - 1);
    expect(_trackedWinHashchangeHandlers.length).toBe(hashCountBefore - 1);
  });

  test('should not navigate when clicking a [route] link after destroy()', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const homeTpl = document.createElement('template');
    homeTpl.setAttribute('route', '/');
    homeTpl.innerHTML = '<p>Home</p>';
    document.body.appendChild(homeTpl);

    const aboutTpl = document.createElement('template');
    aboutTpl.setAttribute('route', '/about');
    aboutTpl.innerHTML = '<p>About</p>';
    document.body.appendChild(aboutTpl);

    router = _createRouter();
    setRouterInstance(router);
    await router.init();

    expect(router.current.path).toBe('/');

    // Destroy the router
    router.destroy();

    // Create and click a route link
    const link = document.createElement('a');
    link.setAttribute('route', '/about');
    link.textContent = 'About';
    document.body.appendChild(link);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 50));

    // Navigation should NOT have happened because destroy() removed the click handler
    expect(router.current.path).toBe('/');
  });

  test('should re-register listeners after destroy() then init()', async () => {
    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.setAttribute('route', '/');
    tpl.innerHTML = '<p>Home</p>';
    document.body.appendChild(tpl);

    const aboutTpl = document.createElement('template');
    aboutTpl.setAttribute('route', '/about');
    aboutTpl.innerHTML = '<p>About</p>';
    document.body.appendChild(aboutTpl);

    router = _createRouter();
    setRouterInstance(router);
    await router.init();

    // Destroy
    router.destroy();
    expect(_trackedDocClickHandlers.length).toBe(0);
    expect(_trackedWinHashchangeHandlers.length).toBe(0);

    // Re-init
    window.location.hash = '#/';
    await router.init();

    // Listeners should be registered again
    expect(_trackedDocClickHandlers.length).toBeGreaterThanOrEqual(1);
    expect(_trackedWinHashchangeHandlers.length).toBeGreaterThanOrEqual(1);

    // Navigation should work again
    await router.push('/about');
    expect(router.current.path).toBe('/about');
  });
});

describe('Router — focusBehavior (M2)', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', focusBehavior: 'none' };
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    // jsdom does not implement requestAnimationFrame by default — stub it
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 0; });
  });

  afterEach(() => {
    _config.router = { useHash: false, base: '/', scrollBehavior: 'top', focusBehavior: 'none' };
    document.body.innerHTML = '';
    window.location.hash = '';
    jest.restoreAllMocks();
  });

  test('does not move focus when focusBehavior is "none" (default)', async () => {
    document.body.innerHTML = `
      <template route="/page"><h1>Page</h1></template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/page');
    // Focus should NOT be on the h1
    const h1 = document.querySelector('h1');
    expect(document.activeElement).not.toBe(h1);
  });

  test('moves focus to first h1 in the outlet when focusBehavior is "auto"', async () => {
    _config.router.focusBehavior = 'auto';
    document.body.innerHTML = `
      <template route="/page"><h1>Page Heading</h1></template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/page');
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(h1);
  });

  test('prefers [autofocus] element over h1', async () => {
    _config.router.focusBehavior = 'auto';
    document.body.innerHTML = `
      <template route="/form">
        <h1>Form</h1>
        <input autofocus type="text">
      </template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/form');
    const input = document.querySelector('input[autofocus]');
    expect(document.activeElement).toBe(input);
  });

  test('falls back to the outlet element when no h1 or autofocus', async () => {
    _config.router.focusBehavior = 'auto';
    document.body.innerHTML = `
      <template route="/plain"><p>No headings</p></template>
      <div route-view></div>
    `;
    const router = _createRouter();
    await router.init();
    await router.push('/plain');
    const outlet = document.querySelector('[route-view]');
    expect(document.activeElement).toBe(outlet);
  });
});
