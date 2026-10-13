/**
 * persist restore validation / fail-closed persist-fields allow-list.
 *
 * Keys read back from storage were passed to ctx.$set() unchecked (dotted
 * keys walk into $refs/$store, `$` keys shadow built-ins), and an empty
 * persist-fields attribute persisted every field.
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

  // NOJS-STATE-001 — flipped to test() by the fix commit
  test.failing('dotted keys from storage do not reach $refs members', () => {
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

  // NOJS-STATE-001 — flipped to test() by the fix commit
  test.failing('$-prefixed keys from storage do not shadow built-ins', () => {
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

describe('persist-fields allow-list fails closed', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  // NOJS-STATE-004 — flipped to test() by the fix commit
  test.failing('persist-fields="" persists nothing', () => {
    const el = mount({ 'persist-key': 'pf1', 'persist-fields': '' });
    el.__ctx.theme = 'light';
    const saved = JSON.parse(localStorage.getItem('nojs_state_pf1') || '{}');
    expect(saved).toEqual({});
  });

  // NOJS-STATE-004 — flipped to test() by the fix commit
  test.failing('bare persist-fields attribute persists nothing', () => {
    const el = document.createElement('div');
    el.setAttribute('state', '{ theme: "dark", token: "secret-123" }');
    el.setAttribute('persist', 'localStorage');
    el.setAttribute('persist-key', 'pf2');
    el.toggleAttribute('persist-fields', true);
    document.body.appendChild(el);
    processTree(el);
    el.__ctx.theme = 'light';
    const saved = JSON.parse(localStorage.getItem('nojs_state_pf2') || '{}');
    expect(saved).toEqual({});
  });

  test('non-empty persist-fields still persists listed fields only', () => {
    const el = mount({ 'persist-key': 'pf3', 'persist-fields': 'theme' });
    el.__ctx.theme = 'light';
    expect(JSON.parse(localStorage.getItem('nojs_state_pf3'))).toEqual({ theme: 'light' });
  });
});
