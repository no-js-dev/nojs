import NoJS from '../src/index.js';
import {
  _config,
  _stores,
  _filters,
  _validators,
  _interceptors,
  _eventBus,
  _refs,
  _routerInstance,
  setRouterInstance,
} from '../src/globals.js';
import { _i18n } from '../src/i18n.js';

beforeEach(() => {
  document.body.innerHTML = '';
  NoJS._initialized = false;
  _config.debug = false;
  _config.baseApiUrl = '';
  _config.headers = {};
  _config.csrf = { enabled: false, token: null, header: 'X-CSRF-Token' };
  _config.cache = { strategy: 'none', ttl: 300000, prefix: 'nojs_' };
  _config.router = { useHash: true, base: '/', scrollBehavior: 'top' };
  _config.sanitize = true;
  _config.i18n = { fallbackLocale: null };

  Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
  _interceptors.request = [];
  _interceptors.response = [];
  Object.keys(_refs).forEach((k) => delete _refs[k]);
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  setRouterInstance(null);
  _i18n.locale = 'en';
  _i18n.locales = {};

  window.scrollTo = jest.fn();
});

describe('NoJS Public API', () => {
  test('exposes version string', () => {
    expect(typeof NoJS.version).toBe('string');
    expect(NoJS.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('exposes config()', () => {
    expect(typeof NoJS.config).toBe('function');
  });

  test('exposes init()', () => {
    expect(typeof NoJS.init).toBe('function');
  });

  test('exposes directive()', () => {
    expect(typeof NoJS.directive).toBe('function');
  });

  test('exposes filter()', () => {
    expect(typeof NoJS.filter).toBe('function');
  });

  test('exposes validator()', () => {
    expect(typeof NoJS.validator).toBe('function');
  });

  test('exposes i18n()', () => {
    expect(typeof NoJS.i18n).toBe('function');
  });

  test('exposes on()', () => {
    expect(typeof NoJS.on).toBe('function');
  });

  test('exposes interceptor()', () => {
    expect(typeof NoJS.interceptor).toBe('function');
  });

  test('exposes store getter', () => {
    expect(NoJS.store).toBeDefined();
  });

  test('exposes router getter', () => {
    expect(NoJS.router).toBeNull();
  });

  test('exposes utility functions', () => {
    expect(typeof NoJS.createContext).toBe('function');
    expect(typeof NoJS.evaluate).toBe('function');
    expect(typeof NoJS.findContext).toBe('function');
    expect(typeof NoJS.processTree).toBe('function');
    expect(typeof NoJS.resolve).toBe('function');
  });
});

describe('NoJS.config()', () => {
  test('sets baseApiUrl', () => {
    NoJS.config({ baseApiUrl: 'https://api.example.com' });
    expect(_config.baseApiUrl).toBe('https://api.example.com');
  });

  test('sets debug', () => {
    NoJS.config({ debug: true });
    expect(_config.debug).toBe(true);
  });

  test('merges headers', () => {
    NoJS.config({ headers: { 'X-Custom': 'test' } });
    expect(_config.headers['X-Custom']).toBe('test');
  });

  test('merges csrf', () => {
    NoJS.config({ csrf: { enabled: true, token: 'abc123' } });
    expect(_config.csrf.enabled).toBe(true);
    expect(_config.csrf.token).toBe('abc123');
  });

  test('sets cache config', () => {
    NoJS.config({ cache: { strategy: 'memory', ttl: 60000 } });
    expect(_config.cache.strategy).toBe('memory');
    expect(_config.cache.ttl).toBe(60000);
  });

  test('sets router config', () => {
    NoJS.config({ router: { useHash: false } });
    expect(_config.router.useHash).toBe(false);
  });

  test('sets i18n and defaultLocale', () => {
    NoJS.config({ i18n: { defaultLocale: 'pt-BR' } });
    expect(_i18n.locale).toBe('pt-BR');
  });

  test('baseApiUrl getter/setter', () => {
    NoJS.baseApiUrl = 'https://api.test.com';
    expect(NoJS.baseApiUrl).toBe('https://api.test.com');
    expect(_config.baseApiUrl).toBe('https://api.test.com');
  });
});

describe('NoJS.directive()', () => {
  test('registers and applies a custom directive', async () => {
    NoJS.directive('highlight', {
      init(el, name, value) {
        el.style.backgroundColor = 'yellow';
        el.textContent = value;
      },
    });

    document.body.innerHTML = '<div highlight="hello world"></div>';
    await NoJS.init();

    const el = document.querySelector('[highlight]');
    expect(el.style.backgroundColor).toBe('yellow');
    expect(el.textContent).toBe('hello world');
  });
});

describe('NoJS.filter()', () => {
  test('registers and applies custom filter', async () => {
    NoJS.filter('double', (v) => v * 2);

    document.body.innerHTML = `
      <div state="{ num: 5 }">
        <span bind="num | double"></span>
      </div>
    `;
    await NoJS.init();

    const span = document.querySelector('span');
    expect(span.textContent).toBe('10');
  });
});

describe('NoJS.validator()', () => {
  test('registers custom validator', () => {
    const fn = (v) => v === 'ok';
    NoJS.validator('isOk', fn);
    expect(_validators.isOk).toBe(fn);
  });
});

describe('NoJS.i18n()', () => {
  test('sets locales and default locale', () => {
    NoJS.i18n({
      defaultLocale: 'pt-BR',
      locales: {
        en: { hello: 'Hello' },
        'pt-BR': { hello: 'Olá' },
      },
    });
    expect(_i18n.locale).toBe('pt-BR');
    expect(_i18n.locales['pt-BR'].hello).toBe('Olá');
  });

  test('sets fallback locale', () => {
    NoJS.i18n({
      defaultLocale: 'en',
      fallbackLocale: 'en',
      locales: { en: { hi: 'Hi' } },
    });
    expect(_config.i18n.fallbackLocale).toBe('en');
  });

  test('i18n translation renders via t directive', async () => {
    NoJS.i18n({
      defaultLocale: 'en',
      locales: { en: { greet: 'Hello {name}' } },
    });

    document.body.innerHTML = `<span t="greet" t-name="World"></span>`;
    await NoJS.init();

    const span = document.querySelector('span');
    expect(span.textContent).toBe('Hello World');
  });
});

describe('NoJS.on()', () => {
  test('subscribes and receives events', () => {
    const handler = jest.fn();
    NoJS.on('my-event', handler);

    _eventBus['my-event'].forEach((fn) => fn({ data: 123 }));
    expect(handler).toHaveBeenCalledWith({ data: 123 });
  });

  test('returns unsubscriber', () => {
    const handler = jest.fn();
    const unsub = NoJS.on('test-event', handler);

    _eventBus['test-event'].forEach((fn) => fn('a'));
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    if (_eventBus['test-event'] && _eventBus['test-event'].length) {
      _eventBus['test-event'].forEach((fn) => fn('b'));
    }
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Event bus listener limits', () => {
  const eventName = '__test-listener-limit__';

  afterEach(() => {
    delete _eventBus[eventName];
    _config.maxEventListeners = 100;
  });

  test('adding listeners up to the limit works without warnings', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    _config.maxEventListeners = 5;
    for (let i = 0; i < 5; i++) {
      NoJS.on(eventName, () => {});
    }
    expect(spy).not.toHaveBeenCalled();
    expect(_eventBus[eventName].length).toBe(5);
    spy.mockRestore();
  });

  test('adding listener beyond maxEventListeners logs a warning', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    _config.maxEventListeners = 3;
    for (let i = 0; i < 3; i++) {
      NoJS.on(eventName, () => {});
    }
    expect(spy).not.toHaveBeenCalled();

    // 4th listener exceeds the limit
    NoJS.on(eventName, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      '[No.JS]',
      'MaxListenersExceeded: event "' + eventName + '" has 3 listeners (max 3). Possible memory leak.'
    );

    // 5th listener also triggers a warning
    NoJS.on(eventName, () => {});
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  test('unsubscribing reduces the count', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    _config.maxEventListeners = 2;

    const unsub1 = NoJS.on(eventName, () => {});
    NoJS.on(eventName, () => {});
    expect(_eventBus[eventName].length).toBe(2);
    expect(spy).not.toHaveBeenCalled();

    // Unsubscribe one listener
    unsub1();
    expect(_eventBus[eventName].length).toBe(1);

    // Adding another should not warn (back under limit)
    NoJS.on(eventName, () => {});
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('custom maxEventListeners config is respected', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    _config.maxEventListeners = 1;

    NoJS.on(eventName, () => {});
    expect(spy).not.toHaveBeenCalled();

    NoJS.on(eventName, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toContain('max 1');
    spy.mockRestore();
  });
});

describe('NoJS.interceptor()', () => {
  test('adds request interceptor', () => {
    const fn = (cfg) => cfg;
    NoJS.interceptor('request', fn);
    expect(_interceptors.request).toContain(fn);
  });

  test('adds response interceptor', () => {
    const fn = (res) => res;
    NoJS.interceptor('response', fn);
    expect(_interceptors.response).toContain(fn);
  });

  test('ignores invalid type', () => {
    const fn = jest.fn();
    NoJS.interceptor('invalid', fn);
    expect(_interceptors.invalid).toBeUndefined();
    expect(_interceptors.request).not.toContain(fn);
    expect(_interceptors.response).not.toContain(fn);
  });
});

describe('NoJS.store', () => {
  test('returns stores object', () => {
    expect(NoJS.store).toBe(_stores);
  });

  test('store reflects declared stores after init', async () => {
    document.body.innerHTML = `
      <div store="cart" value="{ items: [] }"></div>
    `;
    await NoJS.init();
    expect(NoJS.store.cart).toBeDefined();
    expect(NoJS.store.cart.items).toEqual([]);
  });

  test('config stores are accessible via $store in bindings', async () => {
    NoJS.config({
      stores: {
        app: { title: 'My App', version: '1.0' },
      },
    });

    document.body.innerHTML = `
      <div state="{}">
        <span bind="$store.app.title" id="title"></span>
        <span bind="$store.app.version" id="version"></span>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('title').textContent).toBe('My App');
    expect(document.getElementById('version').textContent).toBe('1.0');
  });

  test('HTML store directive does not overwrite config store', async () => {
    NoJS.config({
      stores: { settings: { color: 'blue' } },
    });

    document.body.innerHTML = `
      <div store="settings" value="{ color: 'red' }"></div>
      <div state="{}">
        <span bind="$store.settings.color" id="color"></span>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('color').textContent).toBe('blue');
  });
});

describe('NoJS.notify()', () => {
  test('exposes notify as a function', () => {
    expect(typeof NoJS.notify).toBe('function');
  });

  test('is safe to call with no stores or watchers', () => {
    expect(() => NoJS.notify()).not.toThrow();
  });

  test('triggers store watchers', () => {
    const { _addStoreWatcher, _deleteStoreWatcher } = require('../src/globals.js');
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    _addStoreWatcher(fn1, 'test');
    _addStoreWatcher(fn2, 'test');

    NoJS.notify();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    _deleteStoreWatcher(fn1);
    _deleteStoreWatcher(fn2);
  });

  test('prunes disconnected element watchers', () => {
    const { _addStoreWatcher, _storeWatchers } = require('../src/globals.js');
    const fn = jest.fn();
    fn._el = { isConnected: false };
    _addStoreWatcher(fn, 'test');

    NoJS.notify();

    expect(fn).not.toHaveBeenCalled();
    expect(_storeWatchers.get('test')?.has(fn) ?? false).toBe(false);
  });

  test('multiple rapid calls do not break anything', () => {
    const { _addStoreWatcher, _deleteStoreWatcher } = require('../src/globals.js');
    const fn = jest.fn();
    _addStoreWatcher(fn, 'test');

    NoJS.notify();
    NoJS.notify();
    NoJS.notify();

    expect(fn).toHaveBeenCalledTimes(3);
    _deleteStoreWatcher(fn);
  });

  test('DOM updates after external store mutation + notify()', async () => {
    NoJS.config({
      stores: { counter: { value: 0 } },
    });

    document.body.innerHTML = `
      <div state="{}">
        <span id="count" bind="$store.counter.value"></span>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('count').textContent).toBe('0');

    // External mutation — bypasses expression engine
    NoJS.store.counter.value = 42;
    NoJS.notify();

    expect(document.getElementById('count').textContent).toBe('42');
  });
});

describe('Integration: state + bind', () => {
  test('binds state to text content', async () => {
    document.body.innerHTML = `
      <div state="{ message: 'Hello NoJS' }">
        <p bind="message"></p>
      </div>
    `;
    await NoJS.init();

    const p = document.querySelector('p');
    expect(p.textContent).toBe('Hello NoJS');
  });

  test('binds state with expression', async () => {
    document.body.innerHTML = `
      <div state="{ a: 10, b: 20 }">
        <span bind="a + b"></span>
      </div>
    `;
    await NoJS.init();
    expect(document.querySelector('span').textContent).toBe('30');
  });
});

describe('Integration: state + bind + filters', () => {
  test('applies filter in bind', async () => {
    document.body.innerHTML = `
      <div state="{ name: 'john doe' }">
        <span bind="name | capitalize"></span>
      </div>
    `;
    await NoJS.init();
    expect(document.querySelector('span').textContent).toBe('John Doe');
  });

  test('chains multiple filters', async () => {
    document.body.innerHTML = `
      <div state="{ text: '  hello world  ' }">
        <span bind="text | trim | uppercase"></span>
      </div>
    `;
    await NoJS.init();
    expect(document.querySelector('span').textContent).toBe('HELLO WORLD');
  });
});

describe('Integration: state + conditionals', () => {
  test('if shows/hides based on state', async () => {
    document.body.innerHTML = `
      <div state="{ visible: true }">
        <p if="visible">Shown</p>
        <p if="!visible">Hidden</p>
      </div>
    `;
    await NoJS.init();

    const ps = document.querySelectorAll('p');
    expect(document.querySelector('p').textContent).toBe('Shown');
  });

  test('show/hide toggle visibility', async () => {
    document.body.innerHTML = `
      <div state="{ active: true }">
        <p show="active" id="s">Visible</p>
        <p hide="active" id="h">Hidden</p>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('s').style.display).not.toBe('none');
    expect(document.getElementById('h').style.display).toBe('none');
  });
});

describe('Integration: state + each', () => {
  test('renders list from state', async () => {
    document.body.innerHTML = `
      <div state="{ fruits: ['Apple', 'Banana', 'Cherry'] }">
        <div each="fruit in fruits" template="fruit-tpl"></div>
      </div>
      <template id="fruit-tpl">
        <li bind="fruit"></li>
      </template>
    `;
    await NoJS.init();

    const items = document.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('Apple');
    expect(items[1].textContent).toBe('Banana');
    expect(items[2].textContent).toBe('Cherry');
  });

  test('renders objects in each loop', async () => {
    document.body.innerHTML = `
      <div state="{ users: [{ name: 'Alice' }, { name: 'Bob' }] }">
        <div each="user in users" template="user-tpl"></div>
      </div>
      <template id="user-tpl">
        <span bind="user.name" class="user-name"></span>
      </template>
    `;
    await NoJS.init();

    const spans = document.querySelectorAll('.user-name');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('Alice');
    expect(spans[1].textContent).toBe('Bob');
  });
});

describe('Integration: state + events', () => {
  test('on:click updates state and re-renders bind', async () => {
    document.body.innerHTML = `
      <div state="{ count: 0 }">
        <span bind="count" id="counter"></span>
        <button on:click="count++">Inc</button>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('counter').textContent).toBe('0');
    document.querySelector('button').click();
    expect(document.getElementById('counter').textContent).toBe('1');
  });

  test('on:click with method-like statement', async () => {
    document.body.innerHTML = `
      <div state="{ name: 'World' }">
        <span bind="name" id="name"></span>
        <button on:click="name = 'NoJS'">Change</button>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('name').textContent).toBe('World');
    document.querySelector('button').click();
    expect(document.getElementById('name').textContent).toBe('NoJS');
  });
});

describe('Integration: state + model (two-way binding)', () => {
  test('model syncs input to state and bind reflects', async () => {
    document.body.innerHTML = `
      <div state="{ username: '' }">
        <input model="username" id="inp" />
        <span bind="username" id="out"></span>
      </div>
    `;
    await NoJS.init();

    const input = document.getElementById('inp');
    const output = document.getElementById('out');

    input.value = 'testuser';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(output.textContent).toBe('testuser');
  });

  test('checkbox model binds boolean', async () => {
    document.body.innerHTML = `
      <div state="{ agreed: false }">
        <input type="checkbox" model="agreed" id="cb" />
        <span bind="agreed" id="val"></span>
      </div>
    `;
    await NoJS.init();

    const cb = document.getElementById('cb');
    expect(cb.checked).toBe(false);

    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('val').textContent).toBe('true');
  });
});

describe('Integration: state + class/style', () => {
  test('class-* toggles class based on state', async () => {
    document.body.innerHTML = `
      <div state="{ isError: true }">
        <p class-error="isError" id="el">Text</p>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('el').classList.contains('error')).toBe(
      true,
    );
  });

  test('style-* applies inline style', async () => {
    document.body.innerHTML = `
      <div state="{ size: 24 }">
        <p style-font-size="size + 'px'" id="el">Text</p>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('el').style.fontSize).toBe('24px');
  });
});

describe('Integration: nested contexts', () => {
  test('child inherits parent state', async () => {
    document.body.innerHTML = `
      <div state="{ color: 'red' }">
        <div state="{ size: 'large' }">
          <span bind="color" id="c"></span>
          <span bind="size" id="s"></span>
        </div>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('c').textContent).toBe('red');
    expect(document.getElementById('s').textContent).toBe('large');
  });

  test('child can override parent state', async () => {
    document.body.innerHTML = `
      <div state="{ msg: 'parent' }">
        <div state="{ msg: 'child' }">
          <span bind="msg" id="inner"></span>
        </div>
        <span bind="msg" id="outer"></span>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('inner').textContent).toBe('child');
    expect(document.getElementById('outer').textContent).toBe('parent');
  });
});

describe('Integration: computed', () => {
  test('computed derives from state', async () => {
    document.body.innerHTML = `
      <div state="{ price: 100, tax: 0.1 }">
        <div computed="total" expr="price * (1 + tax)"></div>
        <span bind="total" id="total"></span>
      </div>
    `;
    await NoJS.init();
    expect(parseFloat(document.getElementById('total').textContent)).toBeCloseTo(110);
  });
});

describe('Integration: ref', () => {
  test('ref registers element in $refs', async () => {
    document.body.innerHTML = `
      <div state="{}">
        <input ref="myInput" id="inp" />
      </div>
    `;
    await NoJS.init();

    expect(_refs.myInput).toBe(document.getElementById('inp'));
  });
});

describe('Integration: store across contexts', () => {
  test('store is accessible from sibling contexts', async () => {
    document.body.innerHTML = `
      <div store="app" value="{ title: 'My App' }"></div>
      <div state="{}">
        <span bind="$store.app.title" id="title"></span>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('title').textContent).toBe('My App');
  });
});

describe('Integration: switch', () => {
  test('renders matching case', async () => {
    document.body.innerHTML = `
      <div state="{ status: 'success' }">
        <div switch="status">
          <div case="'loading'"><p>Loading...</p></div>
          <div case="'success'" id="success-case"><p>Done!</p></div>
          <div case="'error'"><p>Error</p></div>
        </div>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('success-case').style.display).toBe('');
    expect(document.querySelector('[case="\'loading\'"').style.display).toBe('none');
    expect(document.querySelector('[case="\'error\'"').style.display).toBe('none');
  });
});

describe('Integration: bind-html', () => {
  test('renders HTML content', async () => {
    document.body.innerHTML = `
      <div state="{ content: '<strong>Bold</strong>' }">
        <div bind-html="content" id="html"></div>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('html').innerHTML).toBe(
      '<strong>Bold</strong>',
    );
  });
});

describe('Integration: bind-* attributes', () => {
  test('binds arbitrary attribute', async () => {
    document.body.innerHTML = `
      <div state="{ url: 'https://example.com' }">
        <a bind-href="url" id="link">Link</a>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('link').getAttribute('href')).toBe(
      'https://example.com',
    );
  });

  test('binds disabled attribute', async () => {
    document.body.innerHTML = `
      <div state="{ isDisabled: true }">
        <button bind-disabled="isDisabled" id="btn">Click</button>
      </div>
    `;
    await NoJS.init();

    expect(document.getElementById('btn').disabled).toBe(true);
  });
});

describe('Integration: foreach with filter', () => {
  test('filters items in foreach', async () => {
    document.body.innerHTML = `
      <div state="{ items: [{ name: 'A', active: true }, { name: 'B', active: false }, { name: 'C', active: true }] }">
        <div foreach="item" from="items" filter="item.active" template="item-tpl"></div>
      </div>
      <template id="item-tpl">
        <span bind="item.name" class="filtered"></span>
      </template>
    `;
    await NoJS.init();

    const spans = document.querySelectorAll('.filtered');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('A');
    expect(spans[1].textContent).toBe('C');
  });
});

describe('Integration: on:init lifecycle', () => {
  test('on:init fires during initialization', async () => {
    document.body.innerHTML = `
      <div state="{ ready: false }" on:init="ready = true">
        <span bind="ready" id="ready"></span>
      </div>
    `;
    await NoJS.init();
    expect(document.getElementById('ready').textContent).toBe('true');
  });
});

describe('Integration: router setup', () => {
  test('creates router when route-view exists', async () => {
    document.body.innerHTML = `
      <div route-view></div>
      <template route="/home"><p>Home</p></template>
    `;

    window.location.hash = '#/home';
    await NoJS.init();

    expect(NoJS.router).not.toBeNull();
    expect(typeof NoJS.router.push).toBe('function');
  });
});

describe('Integration: NoJS.init() with custom root', () => {
  test('processes only subtree', async () => {
    document.body.innerHTML = `
      <div id="app">
        <div state="{ x: 42 }">
          <span bind="x" id="inside"></span>
        </div>
      </div>
      <div state="{ y: 99 }">
        <span bind="y" id="outside"></span>
      </div>
    `;

    const app = document.getElementById('app');
    await NoJS.init(app);

    expect(document.getElementById('inside').textContent).toBe('42');
    expect(document.getElementById('outside').textContent).toBe('');
  });
});
