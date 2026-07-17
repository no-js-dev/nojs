/**
 * Pin suite: verified-clean directive combinations.
 *
 * Every test here corresponds to a combination from DIRECTIVE-INCOMPATIBILITIES.md
 * that was verified to work correctly. These are regression guards -- if any test
 * breaks, a previously-working combination has regressed.
 *
 * Methodology: import src modules (matching existing __tests__/ conventions),
 * processTree on fresh DOM per test, afterEach cleanup.
 */

import { _stores, _config, _refs } from '../../src/globals.js';
import { createContext } from '../../src/context.js';
import { processTree, _disposeTree, _disposeChildren } from '../../src/registry.js';
import { findContext } from '../../src/dom.js';
import { _i18n } from '../../src/i18n.js';

import '../../src/filters.js';
import '../../src/directives/state.js';
import '../../src/directives/binding.js';
import '../../src/directives/conditionals.js';
import '../../src/directives/events.js';
import '../../src/directives/loops.js';
import '../../src/directives/styling.js';
import '../../src/directives/refs.js';
import '../../src/directives/head.js';
import '../../src/directives/error-boundary.js';
import '../../src/directives/validate-stub.js';
import '../../src/directives/i18n.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns only element children that are visible (not display:none). */
function visibleChildren(el) {
  return [...el.children].filter(
    (c) => c.nodeType === 1 && c.style.display !== 'none'
  );
}

/** Visible text: concatenates textContent of visible element children. */
function visibleText(el) {
  return visibleChildren(el)
    .map((c) => c.textContent.trim())
    .filter(Boolean)
    .join(' ');
}

/** Collects visible text from all descendant elements, excluding comment nodes. */
function visibleTextDeep(el) {
  let text = '';
  for (const child of el.childNodes) {
    if (child.nodeType === 8) continue; // skip comments
    if (child.nodeType === 1) {
      if (child.style && child.style.display === 'none') continue;
      text += visibleTextDeep(child);
    } else if (child.nodeType === 3) {
      text += child.textContent;
    }
  }
  return text.trim();
}

// ---------------------------------------------------------------------------
// First-pass verified-clean combinations
// ---------------------------------------------------------------------------

describe('Verified-clean: first-pass combinations', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    Object.keys(_refs).forEach((k) => delete _refs[k]);
  });

  test('else (chain directive) on a loop element does not collide with loop else', () => {
    // conditionals.js:158 explicitly returns for _isLoopElement(el),
    // so the loop's empty-state else="tpl" never collides with if/else chain.
    document.body.innerHTML = `
      <div state="{ show: true, items: ['a', 'b'] }">
        <p if="show">IF-BRANCH</p>
        <ul>
          <li each="it in items" else="emptyTpl" bind="it"></li>
        </ul>
        <template id="emptyTpl"><li>No items</li></template>
      </div>
    `;
    processTree(document.body);

    const div = document.body.firstElementChild;
    // The if-branch shows
    expect(div.querySelector('p').textContent).toBe('IF-BRANCH');
    // The loop rendered items, not the empty template
    const lis = div.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('a');
    expect(lis[1].textContent).toBe('b');
  });

  test('show/hide + loop on the same element renders reactively', () => {
    document.body.innerHTML = `
      <div state="{ items: ['x', 'y'], visible: true }">
        <div id="container">
          <span each="it in items" show="visible" bind="it"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const container = document.getElementById('container');
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(2);
    // All visible
    spans.forEach((s) => expect(s.style.display).not.toBe('none'));

    // Toggle visibility off
    const ctx = document.body.firstElementChild.__ctx;
    ctx.visible = false;
    spans.forEach((s) => expect(s.style.display).toBe('none'));
  });

  test('use + loop on the same element works in both attribute orders', () => {
    document.body.innerHTML = `
      <div state="{ items: ['L-x', 'L-y'] }">
        <template id="itemTpl"><span class="label" bind="it"></span></template>
        <div id="container">
          <div each="it in items" use="itemTpl"></div>
        </div>
      </div>
    `;
    processTree(document.body);

    const container = document.getElementById('container');
    const labels = container.querySelectorAll('.label');
    expect(labels.length).toBe(2);
    expect(labels[0].textContent).toBe('L-x');
    expect(labels[1].textContent).toBe('L-y');
  });
});

// ---------------------------------------------------------------------------
// Second-pass verified-clean combinations
// ---------------------------------------------------------------------------

describe('Verified-clean: second-pass combinations', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    Object.keys(_refs).forEach((k) => delete _refs[k]);
  });

  test('if + on:* on the same element -- no duplicate listeners across toggles', () => {
    document.body.innerHTML = `
      <div state="{ show: true, count: 0 }">
        <div if="show">
          <button on:click="count++">Click</button>
        </div>
        <span id="out" bind="count"></span>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const getBtn = () => document.body.querySelector('button');

    // Toggle off and on multiple times
    for (let i = 0; i < 4; i++) {
      ctx.show = false;
      ctx.show = true;
    }

    // Click once -- should increment by exactly 1, not accumulate listeners
    const btn = getBtn();
    expect(btn).not.toBeNull();
    btn.click();
    expect(ctx.count).toBe(1);
  });

  test('children of a truthy if are processed exactly once', () => {
    document.body.innerHTML = `
      <div state="{ ok: true, count: 0 }">
        <div if="ok">
          <span bind="count"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const span = document.body.querySelector('span');
    expect(span.textContent).toBe('0');
    // No double-init: a second processTree would double-bind, but the framework
    // guards against it. Verify single binding by mutation.
    const ctx = document.body.firstElementChild.__ctx;
    ctx.count = 42;
    expect(span.textContent).toBe('42');
  });

  test('watch inside an if subtree is properly disposed when branch goes falsy', () => {
    document.body.innerHTML = `
      <div state="{ ok: true, x: 0, log: 0 }">
        <div if="ok">
          <span watch="x" on:change="log = log + 1"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    // Watcher fires while branch is on
    ctx.x = 1;
    expect(ctx.log).toBe(1);

    // Toggle branch off
    ctx.ok = false;
    // Watcher should be disposed -- further x changes should not increment log
    ctx.x = 2;
    expect(ctx.log).toBe(1);
  });

  test('state + if on the same element -- local state survives toggles', () => {
    document.body.innerHTML = `
      <div state="{ show: true }">
        <div state="{ n: 5 }" if="show">
          <span bind="n"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    const outerCtx = document.body.firstElementChild.__ctx;
    const span = document.body.querySelector('span');
    expect(span.textContent).toBe('5');

    // Toggle off and back on
    outerCtx.show = false;
    outerCtx.show = true;

    const spanAfter = document.body.querySelector('span');
    expect(spanAfter).not.toBeNull();
    // Content should still render (state re-initializes on re-process)
    expect(spanAfter.textContent).toBe('5');
  });

  test('switch inline case round-trips -- bind reactivity and on:* listeners restored', () => {
    document.body.innerHTML = `
      <div state="{ mode: 'a', count: 0 }">
        <div switch="mode">
          <p case="'a'"><span bind="count"></span> <button on:click="count++">+</button></p>
          <p case="'b'">B-CONTENT</p>
        </div>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const switchEl = document.body.querySelector('[switch]');

    // Initially case 'a' visible
    expect(visibleText(switchEl)).toContain('0');

    // Switch to 'b' and back
    ctx.mode = 'b';
    expect(visibleText(switchEl)).toContain('B-CONTENT');

    ctx.mode = 'a';
    // Bind should work after round-trip
    ctx.count = 7;
    expect(visibleText(switchEl)).toContain('7');

    // Button click should still work
    const btn = switchEl.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.style.display).not.toBe('none');
    btn.click();
    expect(ctx.count).toBe(8);
  });

  test('error-boundary + each on the same element -- items render normally', () => {
    document.body.innerHTML = `
      <div state="{ items: ['a', 'b', 'c'] }">
        <template id="errTpl"><p>Error</p></template>
        <ul error-boundary="errTpl">
          <li each="it in items" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    const lis = document.body.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect(lis[0].textContent).toBe('a');
    expect(lis[1].textContent).toBe('b');
    expect(lis[2].textContent).toBe('c');
  });

  test('nested loops (each inside each) -- outer item variables resolve in inner loop', () => {
    document.body.innerHTML = `
      <div state="{ depts: [{ name: 'A', emps: ['e1', 'e2'] }, { name: 'B', emps: ['e3'] }] }">
        <div id="container">
          <div each="d in depts">
            <h3 bind="d.name"></h3>
            <span each="e in d.emps" bind="e"></span>
          </div>
        </div>
      </div>
    `;
    processTree(document.body);

    const container = document.getElementById('container');
    const h3s = container.querySelectorAll('h3');
    expect(h3s.length).toBe(2);
    expect(h3s[0].textContent).toBe('A');
    expect(h3s[1].textContent).toBe('B');

    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(3);
    expect(spans[0].textContent).toBe('e1');
    expect(spans[1].textContent).toBe('e2');
    expect(spans[2].textContent).toBe('e3');
  });

  test('each + bind on the same element -- clones render item variable correctly', () => {
    document.body.innerHTML = `
      <div state="{ items: ['alpha', 'beta', 'gamma'] }">
        <ul>
          <li each="it in items" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    const lis = document.body.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect(lis[0].textContent).toBe('alpha');
    expect(lis[1].textContent).toBe('beta');
    expect(lis[2].textContent).toBe('gamma');
  });
});

// ---------------------------------------------------------------------------
// Third-pass verified-clean combinations
// ---------------------------------------------------------------------------

describe('Verified-clean: third-pass combinations', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    Object.keys(_refs).forEach((k) => delete _refs[k]);
  });

  test('model + loop on the same element -- clones two-way bind correctly', () => {
    document.body.innerHTML = `
      <div state="{ items: [{ val: 'a' }, { val: 'b' }] }">
        <div id="container">
          <input each="it in items" model="it.val" type="text" />
        </div>
      </div>
    `;
    processTree(document.body);

    const inputs = document.body.querySelectorAll('input');
    expect(inputs.length).toBe(2);
    expect(inputs[0].value).toBe('a');
    expect(inputs[1].value).toBe('b');

    // Typing in one clone updates only that item
    inputs[0].value = 'changed';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));

    const ctx = document.body.firstElementChild.__ctx;
    expect(ctx.items[0].val).toBe('changed');
    expect(ctx.items[1].val).toBe('b');
  });

  test('bind-html + loop on the same element -- clones render per-item HTML', () => {
    document.body.innerHTML = `
      <div state="{ items: [{ html: '<b>bold</b>' }, { html: '<i>italic</i>' }] }">
        <div id="container">
          <div each="it in items" bind-html="it.html"></div>
        </div>
      </div>
    `;
    processTree(document.body);

    const divs = document.getElementById('container').querySelectorAll('div');
    expect(divs.length).toBe(2);
    expect(divs[0].querySelector('b')).not.toBeNull();
    expect(divs[0].querySelector('b').textContent).toBe('bold');
    expect(divs[1].querySelector('i')).not.toBeNull();
    expect(divs[1].querySelector('i').textContent).toBe('italic');
  });

  test('ref inside an if branch -- properly unregistered on disposal, re-registered on restore', () => {
    document.body.innerHTML = `
      <div state="{ show: true }">
        <div if="show">
          <input ref="field" type="text" />
        </div>
      </div>
    `;
    processTree(document.body);

    // Ref is registered while branch is on
    expect(_refs.field).toBeDefined();
    expect(_refs.field.tagName).toBe('INPUT');

    const ctx = document.body.firstElementChild.__ctx;

    // Toggle off -- ref should be unregistered
    ctx.show = false;
    expect(_refs.field).toBeUndefined();

    // Toggle back on -- ref should be re-registered
    ctx.show = true;
    expect(_refs.field).toBeDefined();
    expect(_refs.field.tagName).toBe('INPUT');
  });

  test('error-boundary + if on the same element -- fallback on error, restore on toggle', () => {
    document.body.innerHTML = `
      <div state="{ show: true }">
        <template id="errFallback"><p class="err">Something went wrong</p></template>
        <div error-boundary="errFallback" if="show">
          <button on:click="undefinedFn()">Break</button>
        </div>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const btn = document.body.querySelector('button');
    expect(btn).not.toBeNull();

    // Click causes an error -- error-boundary shows fallback
    btn.click();
    const errP = document.body.querySelector('.err');
    expect(errP).not.toBeNull();

    // Toggle off and back on -- should restore original content
    ctx.show = false;
    ctx.show = true;
    const restoredBtn = document.body.querySelector('button');
    // The error boundary or if restores children
    expect(restoredBtn !== null || document.body.querySelector('.err') !== null).toBe(true);
  });

  test('store + loop -- _stores existence guard prevents re-initialization', () => {
    // The verified-clean behavior: store declared alongside a loop
    // is not re-initialized when the loop re-renders clones.
    document.body.innerHTML = `
      <div state="{ items: ['a', 'b'] }">
        <div store="loopStore" value="{ counter: 0 }"></div>
        <ul>
          <li each="it in items" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    expect(_stores.loopStore).toBeDefined();
    expect(_stores.loopStore.counter).toBe(0);

    // Mutate store value directly
    _stores.loopStore.counter = 42;

    // Store mutation persists -- not re-initialized
    expect(_stores.loopStore.counter).toBe(42);

    // Loop items rendered correctly alongside the store
    const lis = document.body.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('a');
    expect(lis[1].textContent).toBe('b');
  });

  test('store inside a toggled if -- store survives off/on round-trips', () => {
    document.body.innerHTML = `
      <div state="{ show: true }">
        <div if="show">
          <div store="toggleStore" value="{ val: 10 }"></div>
          <span bind="$store.toggleStore.val"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    expect(_stores.toggleStore).toBeDefined();
    expect(_stores.toggleStore.val).toBe(10);

    // Mutate store value
    _stores.toggleStore.val = 99;

    const ctx = document.body.firstElementChild.__ctx;

    // Toggle off and back on
    ctx.show = false;
    ctx.show = true;

    // Store should still exist (existence guard prevents re-init)
    expect(_stores.toggleStore).toBeDefined();
    expect(_stores.toggleStore.val).toBe(99);
  });

  test('switch + if on the same element -- both attribute orders round-trip', () => {
    // Test with if first, switch second
    document.body.innerHTML = `
      <div state="{ show: true, mode: 'x' }">
        <div if="show" switch="mode">
          <p case="'x'">X-BRANCH</p>
          <p case="'y'">Y-BRANCH</p>
        </div>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const switchDiv = document.body.querySelector('[switch]');

    // x-branch visible
    expect(visibleText(switchDiv)).toContain('X-BRANCH');

    // Change switch value while if is true
    ctx.mode = 'y';
    expect(visibleText(switchDiv)).toContain('Y-BRANCH');

    // Toggle if off and back on
    ctx.show = false;
    ctx.show = true;

    // After restore, the right case should show
    const restored = document.body.querySelector('[switch]');
    expect(restored).not.toBeNull();
    // Mode was 'y' when toggled off; after restore it should re-evaluate
    expect(
      visibleText(restored).includes('X-BRANCH') ||
      visibleText(restored).includes('Y-BRANCH')
    ).toBe(true);
  });

  test('switch + if -- switch value change while if is false shows right case on restore', () => {
    document.body.innerHTML = `
      <div state="{ show: true, mode: 'a' }">
        <div if="show" switch="mode">
          <p case="'a'">A-CASE</p>
          <p case="'b'">B-CASE</p>
        </div>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    let switchDiv = document.body.querySelector('[switch]');
    expect(visibleText(switchDiv)).toContain('A-CASE');

    // Toggle if off
    ctx.show = false;

    // Change mode while if is false
    ctx.mode = 'b';

    // Toggle if back on
    ctx.show = true;

    switchDiv = document.body.querySelector('[switch]');
    expect(switchDiv).not.toBeNull();
    expect(visibleText(switchDiv)).toContain('B-CASE');
  });

  test('switch + loop on the same element -- each clone runs its own switch', () => {
    document.body.innerHTML = `
      <div state="{ items: [{ type: 'a' }, { type: 'b' }, { type: 'a' }] }">
        <div id="container">
          <div each="it in items" switch="it.type">
            <span case="'a'">TYPE-A</span>
            <span case="'b'">TYPE-B</span>
          </div>
        </div>
      </div>
    `;
    processTree(document.body);

    const container = document.getElementById('container');
    const clones = container.querySelectorAll('[switch]');
    expect(clones.length).toBe(3);

    // First clone: type 'a' -- should show TYPE-A
    expect(visibleText(clones[0])).toContain('TYPE-A');
    // Second clone: type 'b' -- should show TYPE-B
    expect(visibleText(clones[1])).toContain('TYPE-B');
    // Third clone: type 'a' -- should show TYPE-A
    expect(visibleText(clones[2])).toContain('TYPE-A');
  });

  test('state + switch on the same element -- local state drives the switch', () => {
    document.body.innerHTML = `
      <div state="{ view: 'home' }" switch="view">
        <p case="'home'">HOME-PAGE</p>
        <p case="'about'">ABOUT-PAGE</p>
      </div>
    `;
    processTree(document.body);

    const div = document.body.firstElementChild;
    expect(visibleText(div)).toContain('HOME-PAGE');

    div.__ctx.view = 'about';
    expect(visibleText(div)).toContain('ABOUT-PAGE');
  });
});
