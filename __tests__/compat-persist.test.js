/**
 * persist / persist-fields compatibility with v1.21.1.
 *
 * #357 turned an empty persist-fields into "persist nothing" and dropped every
 * `$` key on restore, breaking apps built on v1.21.1. These tests pin the
 * v1.21.1 storage contents and restore behavior. Skipping reserved `$` keys
 * is opt-in through `strictPersist`.
 */
import { _config, _globals } from '../src/globals.js';
import { processTree, _disposeTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/http.js';

function mount(attrs, state = '{ a: 1, b: 2 }', storage = 'localStorage') {
  const el = document.createElement('div');
  el.setAttribute('state', state);
  el.setAttribute('persist', storage);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) el.toggleAttribute(k, true);
    else el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  processTree(el);
  return el;
}

function unmount(el) {
  _disposeTree(el);
  el.remove();
}

const read = (key, store = localStorage) => JSON.parse(store.getItem('nojs_state_' + key));

let warnSpy;
const emptyWarnings = () =>
  warnSpy.mock.calls.filter((c) => String(c[1]).startsWith('persist-fields is empty'));

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warnSpy.mockRestore());

describe('empty persist-fields persists all fields (v1.21.1)', () => {
  test.each([
    ['persist-fields=""', ''],
    ['bare persist-fields', true],
  ])('%s stores {"a":5,"b":2} in localStorage', (_label, attr) => {
    const el = mount({ 'persist-key': 'e1', 'persist-fields': attr });
    el.__ctx.a = 5;
    expect(localStorage.getItem('nojs_state_e1')).toBe('{"a":5,"b":2}');
    expect(emptyWarnings()).toHaveLength(1);
    expect(emptyWarnings()[0][1]).toBe(
      'persist-fields is empty: all fields will be persisted. List the fields to persist or remove the attribute.'
    );
  });

  test('empty persist-fields works with sessionStorage', () => {
    const el = mount({ 'persist-key': 'e2', 'persist-fields': '' }, '{ a: 1, b: 2 }', 'sessionStorage');
    el.__ctx.a = 5;
    expect(sessionStorage.getItem('nojs_state_e2')).toBe('{"a":5,"b":2}');
  });

  test('empty persist-fields restores all fields after re-init', () => {
    const first = mount({ 'persist-key': 'e3', 'persist-fields': '' });
    first.__ctx.a = 5;
    first.__ctx.b = 7;
    unmount(first);
    const second = mount({ 'persist-key': 'e3', 'persist-fields': '' });
    expect(second.__ctx.a).toBe(5);
    expect(second.__ctx.b).toBe(7);
  });

  test('warns once per element even when re-processed', () => {
    const el = mount({ 'persist-key': 'e4', 'persist-fields': '' });
    el.__declared = false;
    processTree(el);
    expect(emptyWarnings()).toHaveLength(1);
  });

  test('omitted persist-fields does not warn', () => {
    const el = mount({ 'persist-key': 'e5' });
    el.__ctx.a = 5;
    expect(read('e5')).toEqual({ a: 5, b: 2 });
    expect(emptyWarnings()).toHaveLength(0);
  });
});

describe('explicit persist-fields', () => {
  test('persists only the listed fields', () => {
    const el = mount({ 'persist-key': 'x1', 'persist-fields': 'a' });
    el.__ctx.a = 5;
    el.__ctx.b = 9;
    expect(localStorage.getItem('nojs_state_x1')).toBe('{"a":5}');
    expect(emptyWarnings()).toHaveLength(0);
  });

  test('restores only the listed fields', () => {
    localStorage.setItem('nojs_state_x2', JSON.stringify({ a: 5, b: 9 }));
    const el = mount({ 'persist-key': 'x2', 'persist-fields': 'a' });
    expect(el.__ctx.a).toBe(5);
    expect(el.__ctx.b).toBe(2);
  });

  test('whitespace around names is trimmed', () => {
    const el = mount({ 'persist-key': 'x3', 'persist-fields': ' a , b ' });
    el.__ctx.a = 5;
    expect(read('x3')).toEqual({ a: 5, b: 2 });
  });
});

describe('declared $ keys are restored (v1.21.1)', () => {
  test('a declared $tab survives re-init', () => {
    const first = mount({ 'persist-key': 'd1' }, '{ $tab: 0, name: "x" }');
    first.__ctx.$tab = 2;
    expect(read('d1')).toEqual({ $tab: 2, name: 'x' });
    unmount(first);
    const second = mount({ 'persist-key': 'd1' }, '{ $tab: 0, name: "x" }');
    expect(second.__ctx.$tab).toBe(2);
  });

  test('a declared $ key listed in persist-fields is restored', () => {
    localStorage.setItem('nojs_state_d2', JSON.stringify({ $tab: 3 }));
    const el = mount({ 'persist-key': 'd2', 'persist-fields': '$tab' }, '{ $tab: 0 }');
    expect(el.__ctx.$tab).toBe(3);
  });

  test('a declared $ key passes persist-schema', () => {
    localStorage.setItem('nojs_state_d3', JSON.stringify({ $tab: 3 }));
    const el = mount({ 'persist-key': 'd3', 'persist-schema': true }, '{ $tab: 0 }');
    expect(el.__ctx.$tab).toBe(3);
  });

  test('undeclared $ keys are restored by default, reserved names included', () => {
    localStorage.setItem('nojs_state_d4', JSON.stringify({
      a: 5,
      $items: [1, 2],
      $form: { valid: true },
      $store: { auth: { role: 'admin' } },
    }));
    const el = mount({ 'persist-key': 'd4' });
    expect(el.__ctx.a).toBe(5);
    expect(el.__ctx.__raw.$items).toEqual([1, 2]);
    expect(el.__ctx.__raw.$form).toEqual({ valid: true });
    expect(el.__ctx.__raw.$store).toEqual({ auth: { role: 'admin' } });
  });

  test('dotted keys are skipped by default', () => {
    localStorage.setItem('nojs_state_d6', JSON.stringify({ a: 5, 'o.p': 9 }));
    const el = mount({ 'persist-key': 'd6' }, '{ a: 1, o: { p: 0 } }');
    expect(el.__ctx.a).toBe(5);
    expect(el.__ctx.o.p).toBe(0);
  });
});

describe('app-named undeclared $ keys restore as in v1.21.1', () => {
  let originalFetch;
  const flush = (ms = 20) => new Promise((r) => setTimeout(r, ms));

  beforeEach(() => {
    originalFetch = global.fetch;
    _config.retries = 0;
    _config.baseApiUrl = '';
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mountItems() {
    const el = document.createElement('div');
    el.setAttribute('state', '{ page: 1 }');
    el.setAttribute('persist', 'localStorage');
    el.setAttribute('persist-key', 'items');
    el.setAttribute('get', '/api/items');
    el.setAttribute('as', '$items');
    const out = document.createElement('span');
    out.setAttribute('bind', "$items ? $items.length : 'none'");
    el.appendChild(out);
    document.body.appendChild(el);
    processTree(el);
    return { el, out };
  }

  test('as="$items" shows the persisted list while the fetch is pending', async () => {
    localStorage.setItem('nojs_state_items', JSON.stringify({ page: 1, $items: [1, 2, 3] }));
    global.fetch = jest.fn(() => new Promise(() => {}));
    const { el, out } = mountItems();
    await flush();
    expect(el.__ctx.$items).toEqual([1, 2, 3]);
    expect(out.textContent).toBe('3');
  });

  test('as="$items" keeps the persisted list when the fetch fails', async () => {
    localStorage.setItem('nojs_state_items', JSON.stringify({ page: 1, $items: [1, 2, 3] }));
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const { out } = mountItems();
    await flush(50);
    expect(out.textContent).toBe('3');
  });

  test('as="$items" persists the fetched list and restores it after re-init', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('[1,2,3,4]'),
      json: () => Promise.resolve([1, 2, 3, 4]),
    });
    const first = mountItems();
    await flush(50);
    expect(read('items')).toEqual({ page: 1, $items: [1, 2, 3, 4] });
    unmount(first.el);

    global.fetch = jest.fn(() => new Promise(() => {}));
    const second = mountItems();
    await flush();
    expect(second.out.textContent).toBe('4');
  });

  test('persist-fields="n, $tab" restores an undeclared $tab set from JS', () => {
    const first = mount({ 'persist-key': 'tab', 'persist-fields': 'n, $tab' }, '{ n: 1 }');
    first.__ctx.$tab = 'billing';
    expect(read('tab')).toEqual({ n: 1, $tab: 'billing' });
    unmount(first);
    const second = mount({ 'persist-key': 'tab', 'persist-fields': 'n, $tab' }, '{ n: 1 }');
    expect(second.__ctx.$tab).toBe('billing');
    expect(second.__ctx.n).toBe(1);
  });
});

describe('strictPersist: true', () => {
  const RESERVED = [
    '$store', '$route', '$router', '$refs', '$parent', '$i18n',
    '$watch', '$set', '$notify', '$form', '$sse',
  ];

  beforeEach(() => { _config.strictPersist = true; });
  afterEach(() => { _config.strictPersist = false; });

  test.each(RESERVED)('skips an undeclared, unlisted reserved key %s', (key) => {
    localStorage.setItem('nojs_state_s1', JSON.stringify({ a: 5, [key]: { injected: true } }));
    const el = mount({ 'persist-key': 's1' });
    expect(el.__ctx.a).toBe(5);
    expect(Object.keys(el.__ctx.__raw)).not.toContain(key);
  });

  test('skips an undeclared plugin global name', () => {
    _globals.auth = { user: 'real' };
    try {
      localStorage.setItem('nojs_state_s2', JSON.stringify({ a: 5, $auth: { user: 'evil' } }));
      const el = mount({ 'persist-key': 's2' });
      expect(el.__ctx.a).toBe(5);
      expect(Object.keys(el.__ctx.__raw)).not.toContain('$auth');
    } finally {
      delete _globals.auth;
    }
  });

  test('restores a reserved key declared in the state', () => {
    localStorage.setItem('nojs_state_s3', JSON.stringify({ $form: { step: 2 } }));
    const el = mount({ 'persist-key': 's3' }, '{ $form: null }');
    expect(el.__ctx.__raw.$form).toEqual({ step: 2 });
  });

  test('restores a reserved key listed in persist-fields', () => {
    localStorage.setItem('nojs_state_s4', JSON.stringify({ a: 5, $sse: { last: 'x' } }));
    const el = mount({ 'persist-key': 's4', 'persist-fields': 'a, $sse' });
    expect(el.__ctx.__raw.$sse).toEqual({ last: 'x' });
  });

  test('restores undeclared non-reserved $ keys ($items, $tab)', () => {
    localStorage.setItem('nojs_state_s5', JSON.stringify({ a: 5, $items: [1], $tab: 'billing' }));
    const el = mount({ 'persist-key': 's5' });
    expect(el.__ctx.__raw.$items).toEqual([1]);
    expect(el.__ctx.__raw.$tab).toBe('billing');
  });

  test('still skips dotted keys', () => {
    localStorage.setItem('nojs_state_s6', JSON.stringify({ a: 5, 'o.p': 9 }));
    const el = mount({ 'persist-key': 's6' }, '{ a: 1, o: { p: 0 } }');
    expect(el.__ctx.o.p).toBe(0);
  });

  test('a primitive state value does not abort restore', () => {
    localStorage.setItem('nojs_state_s7', JSON.stringify({ $store: 1, a: 5 }));
    const el = mount({ 'persist-key': 's7' }, '5');
    expect(el.__ctx.a).toBe(5);
    expect(Object.keys(el.__ctx.__raw)).not.toContain('$store');
  });
});
