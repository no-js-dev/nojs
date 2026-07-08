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
    // itself (which gets removed from DOM). Computed runs on the clones
    // because loop attrs (each/for/foreach) are stripped but computed/expr
    // are retained.
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

    // Clones retain computed/expr (not in _LOOP_ATTRS), so computed fires
    // on each clone and derives the correct value per iteration.
    const vals = document.querySelectorAll('.val');
    expect(vals.length).toBe(3);
    expect(vals[0].textContent).toBe('2');   // 1 * 2
    expect(vals[1].textContent).toBe('4');   // 2 * 2
    expect(vals[2].textContent).toBe('6');   // 3 * 2
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

  // ── Non-clone regressions (state/computed/watch without loop) ─────

  test('state without loop still works (non-clone fallback path)', () => {
    document.body.innerHTML = `
      <div state="{ greeting: 'hello' }">
        <span class="out" bind="greeting"></span>
      </div>
    `;
    processTree(document.body);

    expect(document.querySelector('.out').textContent).toBe('hello');
  });

  test('computed without loop still works (no guard interference)', () => {
    document.body.innerHTML = `
      <div state="{ a: 3, b: 4 }">
        <span computed="sum" expr="a + b"></span>
        <span class="out" bind="sum"></span>
      </div>
    `;
    processTree(document.body);

    expect(document.querySelector('.out').textContent).toBe('7');
  });

  test('watch without loop still works (no guard interference)', () => {
    document.body.innerHTML = `
      <div state="{ x: 1, changed: false }">
        <span watch="x" on:change="changed = true"></span>
        <span class="flag" bind="changed"></span>
        <button on:click="x = 2">go</button>
      </div>
    `;
    processTree(document.body);

    expect(document.querySelector('.flag').textContent).toBe('false');

    // Trigger the watcher by clicking the button which sets x = 2
    document.querySelector('button').click();
    expect(document.querySelector('.flag').textContent).toBe('true');
  });

  // ── Loop context variables through reparented state ───────────────

  test('$count, $first, $last, $even, $odd accessible through reparented state', () => {
    document.body.innerHTML = `
      <div state="{ letters: ['a', 'b', 'c'] }">
        <div each="l in letters" key="l"
             state="{ highlight: false }">
          <span class="letter" bind="l"></span>
          <span class="count" bind="$count"></span>
          <span class="first" bind="$first"></span>
          <span class="last" bind="$last"></span>
          <span class="even" bind="$even"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const counts = document.querySelectorAll('.count');
    expect(counts[0].textContent).toBe('3');
    expect(counts[1].textContent).toBe('3');
    expect(counts[2].textContent).toBe('3');

    const firsts = document.querySelectorAll('.first');
    expect(firsts[0].textContent).toBe('true');
    expect(firsts[1].textContent).toBe('false');

    const lasts = document.querySelectorAll('.last');
    expect(lasts[2].textContent).toBe('true');
    expect(lasts[0].textContent).toBe('false');

    const evens = document.querySelectorAll('.even');
    expect(evens[0].textContent).toBe('true');   // $index=0 is even
    expect(evens[1].textContent).toBe('false');   // $index=1 is odd
  });

  // ── Nested loops with state ───────────────────────────────────────

  test('nested loop with state on both levels preserves full chain', () => {
    document.body.innerHTML = `
      <div state="{ groups: [{name: 'A', items: [1, 2]}, {name: 'B', items: [3]}] }">
        <div each="g in groups" key="g.name"
             state="{ expanded: true }">
          <span class="gname" bind="g.name"></span>
          <span each="n in g.items" key="n"
                state="{ checked: false }">
            <span class="num" bind="n"></span>
            <span class="parent-name" bind="g.name"></span>
          </span>
        </div>
      </div>
    `;
    processTree(document.body);

    const gnames = document.querySelectorAll('.gname');
    expect(gnames.length).toBe(2);
    expect(gnames[0].textContent).toBe('A');
    expect(gnames[1].textContent).toBe('B');

    const nums = document.querySelectorAll('.num');
    expect(nums.length).toBe(3);
    expect(nums[0].textContent).toBe('1');
    expect(nums[1].textContent).toBe('2');
    expect(nums[2].textContent).toBe('3');

    // Inner clones can still reach outer loop variable g.name
    const parentNames = document.querySelectorAll('.parent-name');
    expect(parentNames[0].textContent).toBe('A');
    expect(parentNames[1].textContent).toBe('A');
    expect(parentNames[2].textContent).toBe('B');
  });

  // ── Loop without state (no regression) ────────────────────────────

  test('loop without state still works (no __ctx reparent needed)', () => {
    document.body.innerHTML = `
      <div state="{ fruits: ['apple', 'banana'] }">
        <span each="f in fruits" key="f" class="fruit" bind="f"></span>
      </div>
    `;
    processTree(document.body);

    const fruits = document.querySelectorAll('.fruit');
    expect(fruits.length).toBe(2);
    expect(fruits[0].textContent).toBe('apple');
    expect(fruits[1].textContent).toBe('banana');
  });

  // ── Event mutation on clone-level state ───────────────────────────

  test('click event mutates clone-level state independently per clone', () => {
    document.body.innerHTML = `
      <div state="{ items: [{id: 1}, {id: 2}] }">
        <div each="item in items" key="item.id"
             state="{ active: false }">
          <button class="toggle" on:click="active = !active">Toggle</button>
          <span class="status" bind="active"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const buttons = document.querySelectorAll('.toggle');
    const statuses = document.querySelectorAll('.status');

    expect(statuses[0].textContent).toBe('false');
    expect(statuses[1].textContent).toBe('false');

    // Click first clone's toggle
    buttons[0].click();
    expect(statuses[0].textContent).toBe('true');
    // Second clone is unaffected
    expect(statuses[1].textContent).toBe('false');
  });
});
