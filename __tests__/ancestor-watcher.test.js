// ═══════════════════════════════════════════════════════════════════════
//  Ancestor-chain watcher registration in _watchExpr (NOJS-246)
//
//  Verifies that _watchExpr registers fn on every ancestor context so
//  changes to inherited variables propagate through nested state scopes.
// ═══════════════════════════════════════════════════════════════════════

import { _stores, _setCurrentEl, _watchExpr } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree, _disposeTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';
import '../src/directives/styling.js';

describe('Ancestor-chain watcher registration (NOJS-246)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Finding 1 repro: nested-state counter from OUTER button ───────────
  test('nested-state counter updates from outer button', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ count: 0 }">
        <button data-outer on:click="count++">Inc</button>
        <span data-outer-display bind="count"></span>
        <div state="{ open: true }">
          <span data-inner-display bind="count"></span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const outerBtn = root.querySelector('[data-outer]');
    const outerDisplay = root.querySelector('[data-outer-display]');
    const innerDisplay = root.querySelector('[data-inner-display]');

    expect(outerDisplay.textContent).toBe('0');
    expect(innerDisplay.textContent).toBe('0');

    // Click the OUTER button — both displays must update in lockstep
    outerBtn.click();
    expect(outerDisplay.textContent).toBe('1');
    expect(innerDisplay.textContent).toBe('1');

    outerBtn.click();
    expect(outerDisplay.textContent).toBe('2');
    expect(innerDisplay.textContent).toBe('2');
  });

  // ── Finding 1 repro: nested-state counter from INNER button ───────────
  test('nested-state counter updates from inner button (no one-behind)', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ count: 0 }">
        <span data-outer-display bind="count"></span>
        <div state="{ open: true }">
          <button data-inner on:click="count++">Inc</button>
          <span data-inner-display bind="count"></span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const innerBtn = root.querySelector('[data-inner]');
    const outerDisplay = root.querySelector('[data-outer-display]');
    const innerDisplay = root.querySelector('[data-inner-display]');

    expect(outerDisplay.textContent).toBe('0');
    expect(innerDisplay.textContent).toBe('0');

    // Click the INNER button — inner span must NOT lag behind
    innerBtn.click();
    expect(outerDisplay.textContent).toBe('1');
    expect(innerDisplay.textContent).toBe('1');

    innerBtn.click();
    expect(outerDisplay.textContent).toBe('2');
    expect(innerDisplay.textContent).toBe('2');
  });

  // ── Grandparent-depth computed ────────────────────────────────────────
  test('grandparent-depth computed reacts to ancestor state changes', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ base: 10 }">
        <button data-inc on:click="base++">Inc</button>
        <div state="{ mid: true }">
          <div state="{ deep: true }">
            <span computed="doubled" expr="base * 2"></span>
            <span data-result bind="doubled"></span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const btn = root.querySelector('[data-inc]');
    const result = root.querySelector('[data-result]');

    expect(result.textContent).toBe('20');

    btn.click();
    expect(result.textContent).toBe('22');

    btn.click();
    expect(result.textContent).toBe('24');
  });

  // ── show directive across nested state boundary ───────────────────────
  test('show directive reacts to ancestor state changes', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ visible: true }">
        <button data-toggle on:click="visible = !visible">Toggle</button>
        <div state="{ local: 1 }">
          <span data-target show="visible">Visible</span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const btn = root.querySelector('[data-toggle]');
    const target = root.querySelector('[data-target]');

    expect(target.style.display).not.toBe('none');

    btn.click();
    expect(target.style.display).toBe('none');

    btn.click();
    expect(target.style.display).not.toBe('none');
  });

  // ── class-* directive across nested state boundary ────────────────────
  test('class-* directive reacts to ancestor state changes', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ active: false }">
        <button data-toggle on:click="active = !active">Toggle</button>
        <div state="{ local: 1 }">
          <span data-target class-active="active">Item</span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const btn = root.querySelector('[data-toggle]');
    const target = root.querySelector('[data-target]');

    expect(target.classList.contains('active')).toBe(false);

    btn.click();
    expect(target.classList.contains('active')).toBe(true);

    btn.click();
    expect(target.classList.contains('active')).toBe(false);
  });

  // ── Listener-count regression cap (unit-level) ─────────────────────────
  test('deep tree: _watchExpr adds exactly depth listeners (one per context)', () => {
    // Build a chain of DEPTH raw contexts.  A single _watchExpr call should
    // register fn on every context in the chain — exactly DEPTH listeners.
    const DEPTH = 5;
    const contexts = [];
    for (let i = 0; i < DEPTH; i++) {
      const parent = i > 0 ? contexts[i - 1] : null;
      contexts.push(createContext({ [`level${i}`]: i }, parent));
    }

    const el = document.createElement('div');
    document.body.appendChild(el);
    _setCurrentEl(el);

    const fn = jest.fn();
    const leaf = contexts[DEPTH - 1];

    // Snapshot listener counts before
    const before = contexts.map(c => c.__listeners.size);

    _watchExpr('level0', leaf, fn);
    _setCurrentEl(null);

    // After: each context should have gained exactly 1 listener
    for (let i = 0; i < DEPTH; i++) {
      expect(contexts[i].__listeners.size).toBe(before[i] + 1);
      expect(contexts[i].__listeners.has(fn)).toBe(true);
    }

    // Total new listeners = DEPTH (linear, not quadratic)
    const totalNew = contexts.reduce((sum, c, i) => sum + (c.__listeners.size - before[i]), 0);
    expect(totalNew).toBe(DEPTH);

    // Cleanup
    _disposeTree(el);
  });

  // ── Disposal cleans up ancestor watchers ──────────────────────────────
  test('disposing an element removes watchers from all ancestor contexts', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ count: 0 }">
        <div state="{ inner: true }">
          <span data-target bind="count"></span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const outerCtx = root.querySelector('[state]').__ctx;
    const innerDiv = root.querySelectorAll('[state]')[1];
    const innerCtx = innerDiv.__ctx;

    const outerListenersBefore = outerCtx.__listeners.size;
    const innerListenersBefore = innerCtx.__listeners.size;

    expect(outerListenersBefore).toBeGreaterThan(0);
    expect(innerListenersBefore).toBeGreaterThan(0);

    // Dispose the inner subtree
    _disposeTree(innerDiv);

    // After disposal, the ancestor watcher must be cleaned up.
    // Listeners are removed lazily (isConnected check) or eagerly via _onDispose.
    // Trigger a notify to flush disconnected listeners.
    outerCtx.count = 99;

    expect(outerCtx.__listeners.size).toBeLessThan(outerListenersBefore);
  });

  // ── Unit-level: _watchExpr registers on ancestors ─────────────────────
  test('_watchExpr registers fn on parent and grandparent contexts', () => {
    const grandparent = createContext({ x: 1 });
    const parent = createContext({ y: 2 }, grandparent);
    const child = createContext({ z: 3 }, parent);

    const el = document.createElement('div');
    document.body.appendChild(el);
    _setCurrentEl(el);

    const fn = jest.fn();
    _watchExpr('x', child, fn);
    _setCurrentEl(null);

    // Mutating grandparent should fire fn
    fn.mockClear();
    grandparent.x = 10;
    expect(fn).toHaveBeenCalled();

    // Mutating parent should also fire fn
    fn.mockClear();
    parent.y = 20;
    expect(fn).toHaveBeenCalled();

    // Mutating child should also fire fn
    fn.mockClear();
    child.z = 30;
    expect(fn).toHaveBeenCalled();
  });

  // ── Unit-level: disposal removes from all ancestors ───────────────────
  test('_watchExpr disposal removes fn from all ancestor listener sets', () => {
    const grandparent = createContext({ x: 1 });
    const parent = createContext({ y: 2 }, grandparent);
    const child = createContext({ z: 3 }, parent);

    const el = document.createElement('div');
    document.body.appendChild(el);
    _setCurrentEl(el);

    const fn = jest.fn();
    _watchExpr('x', child, fn);
    _setCurrentEl(null);

    // Confirm fn is in all three listener sets
    expect(grandparent.__listeners.has(fn)).toBe(true);
    expect(parent.__listeners.has(fn)).toBe(true);
    expect(child.__listeners.has(fn)).toBe(true);

    // Dispose
    _disposeTree(el);

    // fn should be removed from all listener sets
    expect(child.__listeners.has(fn)).toBe(false);
    expect(parent.__listeners.has(fn)).toBe(false);
    expect(grandparent.__listeners.has(fn)).toBe(false);
  });

  // ── No regression: single-context (no parent) works as before ─────────
  test('single-context with no parent still works', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div state="{ count: 0 }">
        <button data-btn on:click="count++">Inc</button>
        <span data-display bind="count"></span>
      </div>
    `;
    document.body.appendChild(root);
    processTree(root);

    const btn = root.querySelector('[data-btn]');
    const display = root.querySelector('[data-display]');

    expect(display.textContent).toBe('0');

    btn.click();
    expect(display.textContent).toBe('1');

    btn.click();
    expect(display.textContent).toBe('2');
  });
});
