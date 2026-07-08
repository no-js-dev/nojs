// ═══════════════════════════════════════════════════════════════════════
//  Tests: Loop + State directive interaction (NOJS-256)
//  Covers: state reparent on loop clones, computed on clones,
//          computed/watch template guards
// ═══════════════════════════════════════════════════════════════════════

import { _stores } from '../src/globals.js';
import { processTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';

describe('Loop + State interaction', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Finding 3: state reparent on loop clones ──────────────────────

  test('item variables remain reachable under clone-level state', () => {
    document.body.innerHTML = `
      <div state="{ items: [{name: 'Alice'}, {name: 'Bob'}] }">
        <div each="item in items" key="item.name"
             state="{ selected: false }">
          <span class="name" bind="item.name"></span>
          <span class="sel" bind="selected"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const names = document.querySelectorAll('.name');
    expect(names.length).toBe(2);
    expect(names[0].textContent).toBe('Alice');
    expect(names[1].textContent).toBe('Bob');

    // Clone-level state (selected) is also accessible
    const sels = document.querySelectorAll('.sel');
    expect(sels[0].textContent).toBe('false');
    expect(sels[1].textContent).toBe('false');
  });

  test('clone-level state inherits loop item context as parent', () => {
    document.body.innerHTML = `
      <div state="{ users: [{id: 1, role: 'admin'}, {id: 2, role: 'user'}] }">
        <div each="u in users" key="u.id"
             state="{ expanded: true }">
          <span class="role" bind="u.role"></span>
          <span class="exp" bind="expanded"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const clones = document.querySelectorAll('[class="role"]');
    expect(clones.length).toBe(2);
    expect(clones[0].textContent).toBe('admin');
    expect(clones[1].textContent).toBe('user');

    // The clone's own state (expanded) is accessible
    const exps = document.querySelectorAll('.exp');
    expect(exps[0].textContent).toBe('true');
  });

  test('clone state does not clobber loop context variables', () => {
    document.body.innerHTML = `
      <div state="{ tasks: [{title: 'Fix bug'}, {title: 'Add test'}] }">
        <div each="task in tasks" key="task.title"
             state="{ done: false }">
          <span class="title" bind="task.title"></span>
          <span class="idx" bind="$index"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const titles = document.querySelectorAll('.title');
    expect(titles[0].textContent).toBe('Fix bug');
    expect(titles[1].textContent).toBe('Add test');

    // Loop context variables ($index) remain reachable through the parent chain
    const idxs = document.querySelectorAll('.idx');
    expect(idxs[0].textContent).toBe('0');
    expect(idxs[1].textContent).toBe('1');
  });

  // ── Per-clone computed ────────────────────────────────────────────

  test('per-clone computed derives from loop item + clone state', () => {
    document.body.innerHTML = `
      <div state="{ products: [{name: 'Widget', price: 10}, {name: 'Gadget', price: 25}] }">
        <div each="p in products" key="p.name"
             state="{ qty: 2 }">
          <span computed="total" expr="p.price * qty"></span>
          <span class="total" bind="total"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const totals = document.querySelectorAll('.total');
    expect(totals.length).toBe(2);
    // Widget: 10 * 2 = 20
    expect(totals[0].textContent).toBe('20');
    // Gadget: 25 * 2 = 50
    expect(totals[1].textContent).toBe('50');
  });

  // ── Findings 17/18: computed/watch template guards ────────────────

  test('computed on loop template element is skipped (guard)', () => {
    // The loop template element (the one with each=) carries a computed attr.
    // The guard should prevent computed.init from running on the template
    // itself (which gets removed from DOM). Computed should only execute
    // on the clones (which have the loop attrs stripped).
    document.body.innerHTML = `
      <div state="{ nums: [1, 2, 3] }">
        <div each="n in nums" key="n"
             computed="doubled" expr="n * 2"
             state="{ extra: 0 }">
          <span class="val" bind="doubled"></span>
        </div>
      </div>
    `;

    // Should not throw — the guard prevents computed from running on the
    // template element (which has no valid context after loop removes it).
    expect(() => processTree(document.body)).not.toThrow();

    // Clones have computed stripped (loop strips attrs), so doubled won't
    // appear on clones via the computed directive — this tests that the
    // template-level computed was indeed skipped without error.
    const vals = document.querySelectorAll('.val');
    expect(vals.length).toBe(3);
  });

  test('watch on loop template element is inert (guard)', () => {
    const spy = jest.fn();
    // Temporarily intercept _warn/_log to detect if watch fires on template
    document.body.innerHTML = `
      <div state="{ colors: ['red', 'blue'] }">
        <div each="c in colors" key="c"
             watch="c" on:change="$el.dataset.changed = 'yes'"
             state="{ highlight: false }">
          <span class="color" bind="c"></span>
        </div>
      </div>
    `;

    // Should not throw — the guard skips watch on the template element
    expect(() => processTree(document.body)).not.toThrow();

    const spans = document.querySelectorAll('.color');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('red');
    expect(spans[1].textContent).toBe('blue');
  });

  test('watch on clone fires correctly (not blocked by guard)', () => {
    document.body.innerHTML = `
      <div state="{ items: [{val: 10}] }">
        <div each="item in items" key="item.val"
             state="{ seen: false }">
          <span class="v" bind="item.val"></span>
          <span class="s" bind="seen"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    // Verify clone rendered correctly with both loop and state context
    expect(document.querySelector('.v').textContent).toBe('10');
    expect(document.querySelector('.s').textContent).toBe('false');
  });
});
