/**
 * Regression tests for the post-merge review of the v1.19 reactive-core
 * perf overhaul (PR #264). Each describe block pins one reviewed defect:
 *
 *  1. event delegation reverted — per-element listeners survive an ancestor
 *     calling stopPropagation(), and no document-level dispatcher leaks
 *  2. statement write-back notifies aliased parent collections
 *     (item.done toggle must wake watchers keyed on items)
 *  3. loop process plans rebuild after registerDirective()
 *  4. external-template masters pick up in-place template content changes
 *  5. plan replay never applies a planned descriptor to a node created
 *     mid-run by an earlier init (bind-html innerHTML swap)
 *  6. bind-*, class-*, style-* memos resync DOM state changed externally
 *  8. $notify(nonString) fires every listener instead of key-matching
 */
import { _stores } from '../src/globals.js';
import { registerDirective, processTree } from '../src/registry.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/styling.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';

afterEach(() => {
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
});

describe('events: per-element listeners (delegation revert)', () => {
  test('handler fires even when an ancestor stops propagation', () => {
    document.body.innerHTML = `
      <div state="{ count: 0 }">
        <div id="wrap">
          <button id="btn" on:click="count = count + 1">go</button>
        </div>
        <span id="out" bind="count"></span>
      </div>`;
    processTree(document.body);
    // Third-party code between the target and the document — under
    // document-level delegation this silently killed the handler.
    document.getElementById('wrap').addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('out').textContent).toBe('1');
  });

  test('processing on:click installs no document-level dispatcher', () => {
    const spy = jest.spyOn(document, 'addEventListener');
    document.body.innerHTML = `
      <div state="{ n: 0 }">
        <button on:click="n = n + 1">go</button>
        <input on:input="n = n + 1">
      </div>`;
    processTree(document.body);
    const docEvents = spy.mock.calls.map((c) => c[0]);
    expect(docEvents).not.toContain('click');
    expect(docEvents).not.toContain('input');
    spy.mockRestore();
  });

  test('mixing plain and modifier handlers preserves registration order', () => {
    document.body.innerHTML = `
      <div state="{ log: '' }">
        <button id="btn" on:click="log = log + 'a'" on:click.once="log = log + 'b'">go</button>
        <span id="out" bind="log"></span>
      </div>`;
    processTree(document.body);
    const btn = document.getElementById('btn');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('out').textContent).toBe('ab');
  });
});

describe('statement write-back: aliased object mutation', () => {
  test('item.done toggle wakes watcher keyed on the parent items array', () => {
    document.body.innerHTML = `
      <div state="{ items: [{ done: false }, { done: true }] }">
        <ul>
          <li each="item in items">
            <button class="toggle" on:click="item.done = !item.done">t</button>
          </li>
        </ul>
        <span id="done-count" bind="items.filter(i => i.done).length"></span>
      </div>`;
    processTree(document.body);
    expect(document.getElementById('done-count').textContent).toBe('1');

    document.querySelectorAll('.toggle')[0]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('done-count').textContent).toBe('2');

    document.querySelectorAll('.toggle')[1]
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('done-count').textContent).toBe('1');
  });

  test('primitive-only statements still skip unrelated object keys', () => {
    // count++ must not wake watchers keyed on obj (the narrow filter that
    // makes the safety net cheap) — but the reassignment path still works.
    document.body.innerHTML = `
      <div id="root" state="{ count: 0, obj: { x: 1 } }">
        <button id="btn" on:click="count = count + 1">go</button>
        <span id="out" bind="count"></span>
      </div>`;
    processTree(document.body);
    const objWatcherRuns = jest.fn();
    objWatcherRuns._keys = new Set(['obj']);
    document.getElementById('root').__ctx.$watch(objWatcherRuns);

    document.getElementById('btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('out').textContent).toBe('1');
    expect(objWatcherRuns).not.toHaveBeenCalled();
  });
});

describe('loop plans: registry-change invalidation', () => {
  test('directive registered after first render applies to later clones', () => {
    document.body.innerHTML = `
      <div id="root" state="{ items: ['a'] }">
        <ul><li each="item in items"><span hl bind="item"></span></li></ul>
      </div>`;
    processTree(document.body);
    expect(document.querySelector('span[hl]')).not.toBeNull();

    registerDirective('hl', {
      priority: 20,
      init(el) { el.setAttribute('data-hl', '1'); },
    });

    document.getElementById('root').__ctx.items = ['a', 'b'];
    const spans = document.querySelectorAll('span[hl]');
    expect(spans.length).toBe(2);
    // The clone created after registration must match the new directive.
    expect(spans[1].getAttribute('data-hl')).toBe('1');
  });
});

describe('loop masters: external template freshness', () => {
  test('in-place template content mutation reaches later clones', () => {
    document.body.innerHTML = `
      <template id="row-tpl"><span class="cell" bind="item"></span></template>
      <div id="root" state="{ items: ['a'] }">
        <ul><li each="item in items" template="row-tpl"></li></ul>
      </div>`;
    processTree(document.body);
    expect(document.querySelectorAll('.cell').length).toBe(1);

    // Same <template> element, new content — identity checks can't see this
    // (remote template loads fill the same element in place).
    document.getElementById('row-tpl').innerHTML = '<b class="cell2" bind="item"></b>';

    document.getElementById('root').__ctx.items = ['a', 'b'];
    const rows = document.querySelectorAll('li');
    expect(rows.length).toBe(2);
    const newCell = rows[1].querySelector('.cell2');
    expect(newCell).not.toBeNull();
    expect(newCell.textContent).toBe('b');
  });
});

describe('plan replay: nodes created mid-run by an earlier init', () => {
  test('bind-html replacement children never receive planned descriptors', () => {
    document.body.innerHTML = `
      <div state="{ items: ['a'] }">
        <ul>
          <li each="item in items">
            <div bind-html="'<b>raw</b>'"><span bind="item"></span></div>
          </li>
        </ul>
      </div>`;
    processTree(document.body);
    // bind-html wiped the planned <span>; the <b> that took its child-index
    // path must NOT have been processed with the span's bind descriptor.
    const b = document.querySelector('li b');
    expect(b).not.toBeNull();
    expect(b.textContent).toBe('raw');
  });
});

describe('value memos: external DOM drift resync', () => {
  test('bind-checked rewrites a checkbox flipped by the user', () => {
    document.body.innerHTML = `
      <div id="root" state="{ flag: true }">
        <input id="cb" type="checkbox" bind-checked="flag">
      </div>`;
    processTree(document.body);
    const cb = document.getElementById('cb');
    expect(cb.checked).toBe(true);

    cb.checked = false; // user click / external script
    document.getElementById('root').__ctx.$notify();
    expect(cb.checked).toBe(true);
  });

  test('bind-* string attribute rewrites after external removal', () => {
    document.body.innerHTML = `
      <div id="root" state="{ title: 'hi' }">
        <span id="t" bind-title="title"></span>
      </div>`;
    processTree(document.body);
    const t = document.getElementById('t');
    expect(t.getAttribute('title')).toBe('hi');

    t.removeAttribute('title');
    document.getElementById('root').__ctx.$notify();
    expect(t.getAttribute('title')).toBe('hi');
  });

  test('class-{name} re-adds a class removed externally', () => {
    document.body.innerHTML = `
      <div id="root" state="{ on: true }">
        <span id="s" class-active="on"></span>
      </div>`;
    processTree(document.body);
    const s = document.getElementById('s');
    expect(s.classList.contains('active')).toBe(true);

    s.classList.remove('active');
    document.getElementById('root').__ctx.$notify();
    expect(s.classList.contains('active')).toBe(true);
  });

  test('style-{prop} rewrites an inline style overwritten externally', () => {
    document.body.innerHTML = `
      <div id="root" state="{ c: 'red' }">
        <span id="s" style-color="c"></span>
      </div>`;
    processTree(document.body);
    const s = document.getElementById('s');
    expect(s.style.color).toBe('red');

    s.style.color = 'blue';
    document.getElementById('root').__ctx.$notify();
    expect(s.style.color).toBe('red');
  });
});

describe('$notify: non-string arguments', () => {
  test('$notify(nonString) fires key-scoped listeners', () => {
    document.body.innerHTML = `
      <div id="root" state="{ items: [1] }">
        <span id="len" bind="items.length"></span>
      </div>`;
    processTree(document.body);
    expect(document.getElementById('len').textContent).toBe('1');

    const ctx = document.getElementById('root').__ctx;
    ctx.__raw.items.push(2); // silent in-place mutation
    ctx.$notify(0);          // legacy/userland call with a non-key argument
    expect(document.getElementById('len').textContent).toBe('2');

    ctx.__raw.items.push(3);
    ctx.$notify({ some: 'object' });
    expect(document.getElementById('len').textContent).toBe('3');
  });

  test('$notify("key") still narrows to key-scoped listeners', () => {
    document.body.innerHTML = `
      <div id="root" state="{ items: [1], other: 0 }">
        <span id="len" bind="items.length"></span>
      </div>`;
    processTree(document.body);
    const ctx = document.getElementById('root').__ctx;

    ctx.__raw.items.push(2);
    ctx.$notify('other'); // unrelated key — items watcher must stay quiet
    expect(document.getElementById('len').textContent).toBe('1');

    ctx.$notify('items');
    expect(document.getElementById('len').textContent).toBe('2');
  });
});

describe('statements referencing $event keep root precision', () => {
  test('$event in a statement does not break write-back', () => {
    document.body.innerHTML = `
      <div state="{ count: 0 }">
        <button id="btn" on:click="count = count + ($event ? 1 : 0)">go</button>
        <span id="out" bind="count"></span>
      </div>`;
    processTree(document.body);
    document.getElementById('btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('out').textContent).toBe('1');
  });
});
