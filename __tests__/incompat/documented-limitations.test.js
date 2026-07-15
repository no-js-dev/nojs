/**
 * Pin suite: documented-limitation behavior (findings 5, 9, 10, 13, 19, 20).
 *
 * Each test asserts today's (documented) semantics for known incompatibilities.
 * These are NOT "should work" tests -- they pin the CURRENT behavior so that
 * any future fix is detected as a deliberate change, not a silent regression.
 *
 * If a fix lands for one of these findings, update the corresponding test
 * to assert the NEW correct behavior.
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

// ---------------------------------------------------------------------------
// Finding 5: switch x loop on a case child -- both branches render
// ---------------------------------------------------------------------------

describe('Finding 5: switch x loop on a case child', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('loop on a case child renders both branches -- switch goes inert', () => {
    // When a case child has a loop, the loop replaces the case-bearing child
    // with markers and inserts clones. The switch's bookkeeping breaks.
    document.body.innerHTML = `
      <div state="{ mode: 'x', items: ['i1', 'i2'] }">
        <div id="sw" switch="mode">
          <p case="'x'" each="n in items" bind="n"></p>
          <p case="'y'">Y-BRANCH</p>
        </div>
      </div>
    `;
    processTree(document.body);

    const sw = document.getElementById('sw');
    const allPs = sw.querySelectorAll('p');

    // Documented behavior: both branches render simultaneously.
    // The loop clones (carrying case) AND the Y-BRANCH p are all present.
    // The switch cannot hide the non-matching branch.
    expect(allPs.length).toBe(3);

    // Y-BRANCH is visible even though mode is 'x'
    const yBranch = [...allPs].find((p) => p.textContent.trim() === 'Y-BRANCH');
    // The Y-BRANCH p exists in the DOM (switch can't manage it properly)
    expect(yBranch).toBeDefined();
  });

  test('changing switch value after loop-on-case has no effect', () => {
    document.body.innerHTML = `
      <div state="{ mode: 'x', items: ['i1'] }">
        <div id="sw" switch="mode">
          <p case="'x'" each="n in items" bind="n"></p>
          <p case="'y'">Y-BRANCH</p>
        </div>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const sw = document.getElementById('sw');
    const beforeText = sw.textContent;

    // Change mode -- documented behavior: nothing changes
    ctx.mode = 'y';
    const afterText = sw.textContent;

    // The switch is inert; changing mode does not affect rendering
    expect(afterText).toBe(beforeText);
  });
});

// ---------------------------------------------------------------------------
// Finding 9: if + loop on the same element -- condition can't remove items
// ---------------------------------------------------------------------------

describe('Finding 9: if + loop on the same element', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('if with falsy condition on a loop element still renders loop items', () => {
    // if only manages the element's children. When a loop is on the same
    // element, the loop takes over DOM management and if cannot suppress it.
    document.body.innerHTML = `
      <div state="{ ok: false, items: ['a', 'b', 'c'] }">
        <ul>
          <li if="ok" each="it in items" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    const lis = document.body.querySelectorAll('li');
    // Documented behavior: items render despite if="ok" being false.
    // The condition cannot remove items -- it only gates children.
    // The loop clones are siblings inserted by the loop, not children of the if.
    expect(lis.length).toBe(3);
  });

  test('if condition renders empty shells when items have no inner content to gate', () => {
    // When the loop element has if with a falsy condition, the clones'
    // children are cleared but the clones themselves still appear.
    document.body.innerHTML = `
      <div state="{ ok: false, items: ['x', 'y'] }">
        <ul>
          <li if="ok" each="it in items"><span bind="it"></span></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    const lis = document.body.querySelectorAll('li');
    // Documented behavior: clones exist but their children are gated
    // (if clears children when falsy). The shells remain, emptied.
    expect(lis.length).toBe(2);
    for (const li of lis) {
      expect(li.querySelector('span')).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Finding 10: ref x loop -- last clone wins
// ---------------------------------------------------------------------------

describe('Finding 10: ref x loop -- last clone wins', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    Object.keys(_refs).forEach((k) => delete _refs[k]);
  });

  test('ref on a loop element points to the last rendered clone', () => {
    // ref is not in _LOOP_ATTRS, so every clone re-registers the same
    // name in _refs. The last clone wins.
    document.body.innerHTML = `
      <div state="{ items: ['a', 'b', 'c'] }">
        <ul>
          <li each="it in items" ref="myItem" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    // Documented behavior: $refs.myItem points at the last-rendered clone
    expect(_refs.myItem).toBeDefined();
    expect(_refs.myItem.textContent).toBe('c');
  });

  test('ref on a loop with single item points to that item', () => {
    document.body.innerHTML = `
      <div state="{ items: ['only'] }">
        <ul>
          <li each="it in items" ref="single" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    expect(_refs.single).toBeDefined();
    expect(_refs.single.textContent).toBe('only');
  });

  test('ref on a loop is deterministic -- always the last item', () => {
    document.body.innerHTML = `
      <div state="{ items: ['first', 'middle', 'last'] }">
        <ul>
          <li each="it in items" ref="ordered" bind="it"></li>
        </ul>
      </div>
    `;
    processTree(document.body);

    // Always the last-rendered item
    expect(_refs.ordered.textContent).toBe('last');
  });
});

// ---------------------------------------------------------------------------
// Finding 13: bind-value + model on the same input -- duplicate pipelines
// ---------------------------------------------------------------------------

describe('Finding 13: bind-value + model on the same input', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('both bind-value and model attach listeners on the same input', () => {
    // Both directives attach input listeners and both write back via
    // _execStatement. Every keystroke runs two statement executions.
    document.body.innerHTML = `
      <div state="{ val: 'initial' }">
        <input bind-value="val" model="val" type="text" />
        <span id="out" bind="val"></span>
      </div>
    `;
    processTree(document.body);

    const input = document.body.querySelector('input');
    const out = document.getElementById('out');
    const ctx = document.body.firstElementChild.__ctx;

    // Initial value is set
    expect(input.value).toBe('initial');
    expect(out.textContent).toBe('initial');

    // Simulate typing
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Documented behavior: both pipelines fire, but the value still
    // converges (both write the same value in this simple case)
    expect(ctx.val).toBe('typed');
  });

  test('bind-value + model on number input -- both coerce differently', () => {
    // bind-value skips NaN, model coerces Number(el.value).
    // Documented behavior: they can fight over the model during typing.
    document.body.innerHTML = `
      <div state="{ num: 5 }">
        <input bind-value="num" model="num" type="number" />
      </div>
    `;
    processTree(document.body);

    const input = document.body.querySelector('input');
    const ctx = document.body.firstElementChild.__ctx;

    // Set a valid number
    input.value = '10';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Both pipelines ran -- the exact type depends on execution order
    // (bind-value writes the string, model coerces to Number), but both
    // must converge on the typed value.
    expect(String(ctx.num)).toBe('10');
  });
});

// ---------------------------------------------------------------------------
// Finding 19: watch + form control -- on:change dual ownership
// ---------------------------------------------------------------------------

describe('Finding 19: watch + form control -- on:change dual ownership', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('watch and events directive both claim on:change on a form control', () => {
    // watch reads its handler from on:change, but the events directive
    // also independently binds a DOM listener for on:change.
    // On form controls that emit native change events, the watch statement
    // fires from BOTH the watcher AND the DOM event.
    document.body.innerHTML = `
      <div state="{ v: 'hello', x: 0, log: 0 }">
        <input model="v" watch="x" on:change="log = log + 1" />
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const input = document.body.querySelector('input');

    // Trigger via watcher (x changes)
    ctx.x = 1;
    const logAfterWatch = ctx.log;
    // Watch fires the on:change statement
    expect(logAfterWatch).toBe(1);

    // Trigger via DOM change event (the events directive also fires on:change)
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const logAfterDomEvent = ctx.log;

    // Documented behavior: BOTH triggers fire the same statement.
    // After a DOM change event, log should have incremented again.
    expect(logAfterDomEvent).toBe(2);
  });

  test('on non-interactive elements, watch + on:change has no DOM collision', () => {
    // On a span/div, no native change events fire, so only the watcher runs.
    document.body.innerHTML = `
      <div state="{ x: 0, log: 0 }">
        <span watch="x" on:change="log = log + 1">text</span>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;

    // Only watcher triggers
    ctx.x = 1;
    expect(ctx.log).toBe(1);

    ctx.x = 2;
    expect(ctx.log).toBe(2);

    // No DOM change events on a span
  });
});

// ---------------------------------------------------------------------------
// Finding 20: t + bind on the same element -- attribute order picks winner
// ---------------------------------------------------------------------------

describe('Finding 20: t + bind on the same element', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        greet: 'Hello World',
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    _i18n.locale = 'en';
    _i18n.locales = {};
  });

  test('t first, bind second -- bind wins (translation never appears)', () => {
    // Both are priority 20. Stable sort resolves by attribute order.
    // The LATER attribute's directive writes last and wins.
    document.body.innerHTML = `
      <div state="{ msg: 'dynamic-text' }">
        <span t="greet" bind="msg"></span>
      </div>
    `;
    processTree(document.body);

    const span = document.body.querySelector('span');
    // Documented behavior: bind writes last, so msg wins
    expect(span.textContent).toBe('dynamic-text');
  });

  test('bind first, t second -- t wins (bind is dead)', () => {
    document.body.innerHTML = `
      <div state="{ msg: 'dynamic-text' }">
        <span bind="msg" t="greet"></span>
      </div>
    `;
    processTree(document.body);

    const span = document.body.querySelector('span');
    // Documented behavior: t writes last, so translation wins
    expect(span.textContent).toBe('Hello World');
  });

  test('t first, bind second -- bind reactivity works, translation is dead', () => {
    document.body.innerHTML = `
      <div state="{ msg: 'initial' }">
        <span t="greet" bind="msg"></span>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const span = document.body.querySelector('span');

    // bind won initially
    expect(span.textContent).toBe('initial');

    // bind stays reactive
    ctx.msg = 'updated';
    expect(span.textContent).toBe('updated');
  });

  test('bind first, t second -- msg changes now win over the static translation', () => {
    document.body.innerHTML = `
      <div state="{ msg: 'initial' }">
        <span bind="msg" t="greet"></span>
      </div>
    `;
    processTree(document.body);

    const ctx = document.body.firstElementChild.__ctx;
    const span = document.body.querySelector('span');

    // t won initially (processed after bind)
    expect(span.textContent).toBe('Hello World');

    // Key-scoped watchers: t's watcher is keyed to $i18n and no longer
    // re-runs on unrelated context changes, so it cannot overwrite bind's
    // update anymore. bind is keyed to msg and wins. (Historically t
    // re-fired on every notify and clobbered bind — the combination is
    // still unsupported, but the last write now goes to the directive
    // whose dependency actually changed.)
    ctx.msg = 'changed';
    expect(span.textContent).toBe('changed');
  });
});
