/**
 * Expressions that write or read more than one store.
 *
 * Store watchers are partitioned by store name (perf, v1.13.0). Until this
 * fix only the FIRST `$store.<name>` of an expression was used: a statement
 * writing two stores woke one partition, and a binding reading two stores
 * joined one partition, so the other store's DOM stayed stale until
 * NoJS.notify(). Every named store now counts, and a store that cannot be
 * named statically (`$store[key]`) keeps falling back to all partitions.
 */

import {
  _stores,
  _config,
  _eventBus,
  _interceptors,
  _cache,
  _storeWatchers,
  _extractStoreName,
  _extractStoreNames,
  _addStoreWatcher,
  _deleteStoreWatcher,
  _notifyStoreWatchers,
  _watchExpr,
  _setCurrentEl,
  setRouterInstance,
} from '../src/globals.js';
import { createContext } from '../src/context.js';
import { _execStatement } from '../src/evaluate.js';
import { processTree, _disposeTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/http.js';
import '../src/directives/events.js';
import '../src/directives/conditionals.js';
import '../src/directives/styling.js';

function flush(ms = 10) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockJsonResponse(data) {
  return {
    ok: true,
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

let warnSpy;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  document.body.innerHTML = '';
  _config.baseApiUrl = '';
  _config.retries = 0;
  _config.timeout = 10000;
  _config.cache = { strategy: 'none', ttl: 300000, prefix: 'nojs_' };
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  Object.keys(_eventBus).forEach((k) => delete _eventBus[k]);
  Object.keys(_cache).forEach((k) => delete _cache[k]);
  _interceptors.request = [];
  _interceptors.response = [];
  setRouterInstance(null);
  _storeWatchers.clear();
  global.fetch = jest.fn();
});
afterEach(() => {
  warnSpy.mockRestore();
  document.body.innerHTML = '';
  _storeWatchers.clear();
  delete global.fetch;
});

// The page from the bug report: two stores, every binding kind on `ui`, and
// a mixed binding reading both stores.
function mountStores(trigger) {
  document.body.innerHTML = `
    <div store="auth" value="{ user: null }"></div>
    <div store="ui" value="{ mode: 'view' }"></div>
    <main state="{}">
      ${trigger}
      <span id="user" bind="$store.auth.user"></span>
      <span id="mode" bind="$store.ui.mode"></span>
      <span id="label" bind="$store.ui.mode === 'editing' ? 'Editing' : 'Viewing'"></span>
      <span id="cls" class-editing="$store.ui.mode === 'editing'"></span>
      <span id="shown" show="$store.ui.mode === 'editing'">shown</span>
      <span id="mixed" bind="$store.auth.user + '|' + $store.ui.mode"></span>
    </main>`;
  processTree(document.body);
}

const $ = (id) => document.getElementById(id);

function expectBothApplied() {
  expect($('user').textContent).toBe('Ana');
  expect($('mode').textContent).toBe('editing');
  expect($('label').textContent).toBe('Editing');
  expect($('cls').classList.contains('editing')).toBe(true);
  expect($('shown').style.display).not.toBe('none');
  expect($('mixed').textContent).toBe('Ana|editing');
}

describe('_extractStoreNames', () => {
  test('returns every distinct store name in order', () => {
    expect(_extractStoreNames("$store.auth.user = 'x'; $store.ui.mode = 'y'")).toEqual(['auth', 'ui']);
    expect(_extractStoreNames('$store.ui.mode + $store.auth.user + $store.ui.x')).toEqual(['ui', 'auth']);
    expect(_extractStoreNames('$store.cart.items.length')).toEqual(['cart']);
  });

  test('returns null when a store cannot be named statically', () => {
    expect(_extractStoreNames("$store['ui'].mode")).toBeNull();
    expect(_extractStoreNames("$store.auth.user = 1; $store['ui'].mode = 2")).toBeNull();
    expect(_extractStoreNames('$store?.ui.mode')).toBeNull();
    expect(_extractStoreNames('count + 1')).toBeNull();
    expect(_extractStoreNames(null)).toBeNull();
  });

  test('is repeatable (global regex state is reset)', () => {
    expect(_extractStoreNames("$store['a'].x")).toBeNull();
    expect(_extractStoreNames('$store.a.x')).toEqual(['a']);
    expect(_extractStoreNames('$store.a.x')).toEqual(['a']);
  });

  test('_extractStoreName keeps returning the first name only', () => {
    expect(_extractStoreName('$store.auth.user + $store.ui.mode')).toBe('auth');
  });
});

describe('partition bookkeeping', () => {
  test('a watcher reading two stores joins both partitions and runs once per notify', () => {
    const fn = jest.fn();
    _addStoreWatcher(fn, ['auth', 'ui']);
    expect(_storeWatchers.get('auth').has(fn)).toBe(true);
    expect(_storeWatchers.get('ui').has(fn)).toBe(true);
    expect(_storeWatchers.has('*')).toBe(false);

    _notifyStoreWatchers('ui');
    expect(fn).toHaveBeenCalledTimes(1);
    _notifyStoreWatchers(['auth', 'ui']);
    expect(fn).toHaveBeenCalledTimes(2);
    _notifyStoreWatchers();
    expect(fn).toHaveBeenCalledTimes(3);

    _deleteStoreWatcher(fn);
    expect(_storeWatchers.size).toBe(0);
  });

  test('single-name arrays and empty arrays normalize', () => {
    const one = jest.fn();
    const none = jest.fn();
    _addStoreWatcher(one, ['auth']);
    _addStoreWatcher(none, []);
    expect(one._storePartition).toBe('auth');
    expect(none._storePartition).toBe('*');
    _notifyStoreWatchers(['auth']);
    expect(one).toHaveBeenCalledTimes(1);
    expect(none).toHaveBeenCalledTimes(1);
    _notifyStoreWatchers([]);
    expect(one).toHaveBeenCalledTimes(2);
    expect(none).toHaveBeenCalledTimes(2);
  });

  test('a multi-store notify skips unrelated partitions and runs the wildcard once', () => {
    const a = jest.fn();
    const b = jest.fn();
    const c = jest.fn();
    const wild = jest.fn();
    _addStoreWatcher(a, 'a');
    _addStoreWatcher(b, 'b');
    _addStoreWatcher(c, 'c');
    _addStoreWatcher(wild, '*');
    _notifyStoreWatchers(['a', 'b']);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).not.toHaveBeenCalled();
    expect(wild).toHaveBeenCalledTimes(1);
  });

  test('multi-store notify drops disconnected watchers', () => {
    const el = document.createElement('div');
    const fn = jest.fn();
    fn._el = el; // never connected
    _addStoreWatcher(fn, ['a', 'b']);
    _notifyStoreWatchers(['a', 'b']);
    expect(fn).not.toHaveBeenCalled();
  });

  test('_watchExpr registers a two-store binding in both partitions and disposal removes it', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const fn = jest.fn();
    _setCurrentEl(el);
    _watchExpr('$store.auth.user + $store.ui.mode', createContext({}), fn);
    _setCurrentEl(null);
    expect(fn._storePartition).toEqual(['auth', 'ui']);

    _notifyStoreWatchers('ui');
    expect(fn).toHaveBeenCalledTimes(1);

    _disposeTree(el);
    expect(_storeWatchers.has('auth')).toBe(false);
    expect(_storeWatchers.has('ui')).toBe(false);
  });

  test('_watchExpr keeps the wildcard for a bracketed store', () => {
    const fn = jest.fn();
    _watchExpr("$store.auth.user + $store['ui'].mode", createContext({}), fn);
    expect(fn._storePartition).toBe('*');
  });
});

describe('statements writing two stores (on:click)', () => {
  test('auth then ui — every binding updates', () => {
    mountStores(`<button id="go" on:click="$store.auth.user = 'Ana'; $store.ui.mode = 'editing'"></button>`);
    $('go').click();
    expectBothApplied();
  });

  test('ui then auth — every binding updates', () => {
    mountStores(`<button id="go" on:click="$store.ui.mode = 'editing'; $store.auth.user = 'Ana'"></button>`);
    $('go').click();
    expectBothApplied();
  });

  test('a write to one store refreshes a binding that reads two', () => {
    mountStores(`<button id="go" on:click="$store.ui.mode = 'editing'"></button>`);
    _stores.auth.user = 'Ana';
    $('go').click();
    expect($('mixed').textContent).toBe('Ana|editing');
  });

  test('unrelated store partitions are not woken', () => {
    mountStores(`<button id="go" on:click="$store.auth.user = 'Ana'"></button>`);
    const other = jest.fn();
    _addStoreWatcher(other, 'cart');
    $('go').click();
    expect(other).not.toHaveBeenCalled();
    expect($('user').textContent).toBe('Ana');
  });
});

describe('then= writing two stores', () => {
  test('get … then="auth; ui"', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ name: 'Ana' }));
    mountStores(`<div get="/api/me" as="me" then="$store.auth.user = result.name; $store.ui.mode = 'editing'"></div>`);
    await flush();
    expectBothApplied();
  });

  test('get … then="ui; auth"', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ name: 'Ana' }));
    mountStores(`<div get="/api/me" as="me" then="$store.ui.mode = 'editing'; $store.auth.user = result.name"></div>`);
    await flush();
    expectBothApplied();
  });

  test('form post … then="auth; ui"', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ name: 'Ana' }));
    mountStores(`<form id="f" post="/api/login" as="me" then="$store.auth.user = result.name; $store.ui.mode = 'editing'"><button type="submit">Go</button></form>`);
    $('f').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    expectBothApplied();
  });
});

describe('get URL reading two stores', () => {
  test('re-fetches when the second store changes', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse([]));
    document.body.innerHTML = `
      <div store="a" value="{ id: 1 }"></div>
      <div store="b" value="{ page: 1 }"></div>
      <div state="{}">
        <div get="/api/{$store.a.id}/{$store.b.page}" as="rows"></div>
        <button id="next" on:click="$store.b.page = 2"></button>
      </div>`;
    processTree(document.body);
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    $('next').click();
    await flush(50);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain('/api/1/2');
  });
});

describe('notification after a throwing statement', () => {
  test('store writes before the throw reach the DOM', () => {
    mountStores(`<button id="go" on:click="$store.auth.user = 'Ana'; $store.ui.mode = 'editing'; boom()"></button>`);
    $('go').click();
    expectBothApplied();
    expect(warnSpy.mock.calls.some((c) => c.join(' ').includes('boom is not defined'))).toBe(true);
  });

  test('in-place mutations before the throw reach the DOM', () => {
    document.body.innerHTML = `
      <div state="{ items: ['a'] }">
        <button id="go" on:click="items.push('b'); boom()"></button>
        <span id="n" bind="items.length"></span>
      </div>`;
    processTree(document.body);
    $('go').click();
    expect($('n').textContent).toBe('2');
  });

  test('reassignments before the throw still do not apply', () => {
    const ctx = createContext({ a: 0, list: [1] });
    _execStatement('a = 1; fresh = 2; list = [9]; boom()', ctx, {});
    expect(ctx.a).toBe(0);
    expect(ctx.list).toEqual([1]);
    expect('fresh' in ctx.__raw).toBe(false);
  });

  test('the error event still reaches error boundaries', () => {
    const el = document.createElement('button');
    const onError = jest.fn();
    el.addEventListener('nojs:error', onError);
    _execStatement('boom()', createContext({}), { $el: el });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
