/**
 * persist restore validation / persist-fields allow-list.
 *
 * Keys read back from storage were passed to ctx.$set() unchecked (dotted
 * keys walk into $refs/$store, undeclared `$` keys shadow built-ins). An
 * empty persist-fields keeps the v1.21.1 behavior (persist every field)
 * and only warns.
 */
import { _refs, _stores } from '../src/globals.js';
import { processTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';

function mount(attrs, state = '{ theme: "dark", token: "secret-123" }') {
  const el = document.createElement('div');
  el.setAttribute('state', state);
  el.setAttribute('persist', 'localStorage');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  processTree(el);
  return el;
}

describe('persist restore validation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    Object.keys(_refs).forEach((k) => delete _refs[k]);
  });

  test('dotted keys from storage do not reach $refs members', () => {
    const toast = document.createElement('div');
    _refs.toast = toast;
    localStorage.setItem('nojs_state_pv1', JSON.stringify({
      theme: 'light',
      '$refs.toast.innerHTML': '<b id="pwn">x</b>',
    }));
    const el = mount({ 'persist-key': 'pv1' });
    expect(el.__ctx.theme).toBe('light');
    expect(toast.innerHTML).toBe('');
  });

  test('$-prefixed keys from storage do not shadow built-ins', () => {
    localStorage.setItem('nojs_state_pv2', JSON.stringify({
      theme: 'light',
      $store: { auth: { role: 'admin' } },
    }));
    const el = mount({ 'persist-key': 'pv2' });
    expect(Object.keys(el.__ctx.__raw)).not.toContain('$store');
  });

  test('undeclared plain keys are still restored (backwards compat)', () => {
    localStorage.setItem('nojs_state_pv3', JSON.stringify({ theme: 'light', extra: 1 }));
    const el = mount({ 'persist-key': 'pv3' });
    expect(el.__ctx.theme).toBe('light');
    expect(el.__ctx.extra).toBe(1);
  });

  test('known plain keys are still restored', () => {
    localStorage.setItem('nojs_state_pv4', JSON.stringify({ theme: 'light' }));
    const el = mount({ 'persist-key': 'pv4' });
    expect(el.__ctx.theme).toBe('light');
  });
});

describe('persist-fields empty allow-list (v1.21.1 compat)', () => {
  let warnSpy;
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warnSpy.mockRestore());

  const emptyWarnings = () =>
    warnSpy.mock.calls.filter((c) => String(c[1]).startsWith('persist-fields is empty'));

  test('persist-fields="" persists all fields and warns', () => {
    const el = mount({ 'persist-key': 'pf1', 'persist-fields': '' });
    el.__ctx.theme = 'light';
    const saved = JSON.parse(localStorage.getItem('nojs_state_pf1') || '{}');
    expect(saved).toEqual({ theme: 'light', token: 'secret-123' });
    expect(emptyWarnings()).toHaveLength(1);
  });

  test('bare persist-fields attribute persists all fields and warns', () => {
    const el = document.createElement('div');
    el.setAttribute('state', '{ theme: "dark", token: "secret-123" }');
    el.setAttribute('persist', 'localStorage');
    el.setAttribute('persist-key', 'pf2');
    el.toggleAttribute('persist-fields', true);
    document.body.appendChild(el);
    processTree(el);
    el.__ctx.theme = 'light';
    const saved = JSON.parse(localStorage.getItem('nojs_state_pf2') || '{}');
    expect(saved).toEqual({ theme: 'light', token: 'secret-123' });
    expect(emptyWarnings()).toHaveLength(1);
  });

  test('non-empty persist-fields still persists listed fields only', () => {
    const el = mount({ 'persist-key': 'pf3', 'persist-fields': 'theme' });
    el.__ctx.theme = 'light';
    expect(JSON.parse(localStorage.getItem('nojs_state_pf3'))).toEqual({ theme: 'light' });
  });
});
