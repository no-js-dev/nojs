/**
 * persist / persist-fields compatibility with v1.21.1.
 *
 * #357 turned an empty persist-fields into "persist nothing" and dropped every
 * `$` key on restore, breaking apps built on v1.21.1. These tests pin the
 * v1.21.1 storage contents and restore behavior.
 */
import { processTree, _disposeTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';

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

  test('undeclared $ keys stay blocked ($form, $sse, $store)', () => {
    localStorage.setItem('nojs_state_d4', JSON.stringify({
      a: 5,
      $form: { valid: true },
      $sse: { x: 1 },
      $store: { auth: { role: 'admin' } },
    }));
    const el = mount({ 'persist-key': 'd4' });
    expect(el.__ctx.a).toBe(5);
    const raw = Object.keys(el.__ctx.__raw);
    expect(raw).not.toContain('$form');
    expect(raw).not.toContain('$sse');
    expect(raw).not.toContain('$store');
  });

  test('a primitive state value does not abort restore', () => {
    localStorage.setItem('nojs_state_d5', JSON.stringify({ $x: 1, a: 5 }));
    const el = mount({ 'persist-key': 'd5' }, '5');
    expect(el.__ctx.a).toBe(5);
  });
});
