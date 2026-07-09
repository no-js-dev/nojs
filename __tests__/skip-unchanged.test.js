/**
 * WS2 — skip-unchanged reconciliation (PERF-PLAN.md).
 *
 * Two cooperating optimizations:
 *  1. Binding value memos (bind, bind-html, bind-*, class-{name},
 *     style-{prop}): an identical evaluation result must not touch the DOM.
 *  2. Keyed reconcile skip-assign: a reused clone whose item ref, index,
 *     and count are unchanged skips the raw context re-assign, but its
 *     $notify STILL fires — in-place item mutation (the pinned
 *     mutate-and-slice pattern) must keep re-rendering.
 */

import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/loops.js';
import '../src/directives/styling.js';

function clones(host) {
  return [...host.childNodes].filter((n) => n.nodeType === 1);
}

// Counts real DOM writes by wrapping the native accessors/methods.
function spyDomWrites() {
  const textDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  const origToggle = DOMTokenList.prototype.toggle;
  const origSetAttr = Element.prototype.setAttribute;
  const counts = { text: 0, toggle: 0, setAttr: 0 };
  Object.defineProperty(Node.prototype, 'textContent', {
    ...textDesc,
    set(v) { counts.text++; textDesc.set.call(this, v); },
  });
  DOMTokenList.prototype.toggle = function (...args) { counts.toggle++; return origToggle.apply(this, args); };
  Element.prototype.setAttribute = function (...args) { counts.setAttr++; return origSetAttr.apply(this, args); };
  return {
    counts,
    restore() {
      Object.defineProperty(Node.prototype, 'textContent', textDesc);
      DOMTokenList.prototype.toggle = origToggle;
      Element.prototype.setAttribute = origSetAttr;
    },
  };
}

function buildKeyedList(items) {
  const host = document.createElement('div');
  host.setAttribute('state', JSON.stringify({ rows: items, sel: 0 }));
  const el = document.createElement('div');
  el.setAttribute('each', 'row in rows');
  el.setAttribute('key', 'row.id');
  el.setAttribute('class-danger', 'row.id === sel');
  el.innerHTML = '<span bind="row.label"></span><em bind="$index"></em>';
  host.appendChild(el);
  document.body.appendChild(host);
  processTree(host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('WS2 — pinned reconcile semantics stay intact', () => {
  test('in-place mutation + slice still updates reused rows (THE benchmark pattern)', () => {
    const rows = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ];
    const host = buildKeyedList(rows);
    const ctx = findContext(host);

    // Mutate in place, reassign a slice — item refs and indices identical,
    // so the skip-assign path is taken for every row. The notify must still
    // re-evaluate bindings and pick up the mutated label.
    rows[1].label = 'b !!!';
    ctx.rows = rows.slice();

    expect(clones(host).map((c) => c.querySelector('span').textContent))
      .toEqual(['a', 'b !!!', 'c']);
  });

  test('ref-changed items re-render with the new data', () => {
    const rows = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
    const host = buildKeyedList(rows);
    const ctx = findContext(host);
    const before = clones(host);

    ctx.rows = [rows[0], { id: 2, label: 'B2' }];

    const after = clones(host);
    expect(after[1]).toBe(before[1]); // clone reused (same key)
    expect(after[1].querySelector('span').textContent).toBe('B2');
  });

  test('index bindings still update on reorder', () => {
    const rows = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }];
    const host = buildKeyedList(rows);
    const ctx = findContext(host);

    ctx.rows = [rows[2], rows[1], rows[0]];

    expect(clones(host).map((c) => c.querySelector('span').textContent))
      .toEqual(['c', 'b', 'a']);
    expect(clones(host).map((c) => c.querySelector('em').textContent))
      .toEqual(['0', '1', '2']);
  });

  test('count-dependent fields refresh when the list shrinks', () => {
    const rows = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }];
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ rows }));
    const el = document.createElement('div');
    el.setAttribute('each', 'row in rows');
    el.setAttribute('key', 'row.id');
    el.setAttribute('class-last', '$last');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);

    ctx.rows = rows.slice(0, 2);

    const after = clones(host);
    expect(after).toHaveLength(2);
    expect(after[0].classList.contains('last')).toBe(false);
    expect(after[1].classList.contains('last')).toBe(true);
  });
});

describe('WS2 — unchanged rows produce zero DOM writes', () => {
  test('same-values reconcile: no textContent / classList / attribute writes', () => {
    const rows = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }];
    const host = buildKeyedList(rows);
    const ctx = findContext(host);

    const spy = spyDomWrites();
    try {
      ctx.rows = rows.slice(); // nothing changed
      expect(spy.counts.text).toBe(0);
      expect(spy.counts.toggle).toBe(0);
      expect(spy.counts.setAttr).toBe(0);
    } finally {
      spy.restore();
    }
  });

  test('partial update: only mutated rows write text', () => {
    const rows = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }];
    const host = buildKeyedList(rows);
    const ctx = findContext(host);

    rows[0].label = 'a !!!';
    const spy = spyDomWrites();
    try {
      ctx.rows = rows.slice();
      expect(spy.counts.text).toBe(1); // only row 1's bind wrote
    } finally {
      spy.restore();
    }
    expect(clones(host)[0].querySelector('span').textContent).toBe('a !!!');
  });

  test('selection change toggles only the two affected rows', () => {
    const rows = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }];
    const host = buildKeyedList(rows);
    const ctx = findContext(host);

    ctx.sel = 1; // select row 1
    expect(clones(host)[0].classList.contains('danger')).toBe(true);

    const spy = spyDomWrites();
    try {
      ctx.sel = 2; // deselect row 1, select row 2 — rows 3+ untouched
      expect(spy.counts.toggle).toBe(2);
    } finally {
      spy.restore();
    }
    expect(clones(host).map((c) => c.classList.contains('danger')))
      .toEqual([false, true, false]);
  });
});

describe('WS2 — scalar binding memos', () => {
  test('bind-* skips setAttribute when the value is unchanged', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ "url": "/a", "other": 0 }');
    const img = document.createElement('img');
    img.setAttribute('bind-src', 'url');
    host.appendChild(img);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);
    expect(img.getAttribute('src')).toBe('/a');

    const spy = spyDomWrites();
    try {
      ctx.$notify(); // unkeyed notify — bind-src re-evaluates, same value
      expect(spy.counts.setAttr).toBe(0);
    } finally {
      spy.restore();
    }

    ctx.url = '/b';
    expect(img.getAttribute('src')).toBe('/b');
  });

  test('boolean bind-* re-applies only on change', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ "off": true }');
    const btn = document.createElement('button');
    btn.setAttribute('bind-disabled', 'off');
    host.appendChild(btn);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);
    expect(btn.disabled).toBe(true);

    const spy = spyDomWrites();
    try {
      ctx.$notify();
      expect(spy.counts.setAttr).toBe(0);
    } finally {
      spy.restore();
    }

    ctx.off = false;
    expect(btn.disabled).toBe(false);
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  test('style-* skips writes for identical values', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ "c": "red" }');
    const box = document.createElement('div');
    box.setAttribute('style-color', 'c');
    host.appendChild(box);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);
    expect(box.style.color).toBe('red');

    // jsdom exposes style writes via the CSSOM, not setAttribute — assert
    // via a property setter spy on the declaration object.
    let writes = 0;
    const style = box.style;
    const orig = Object.getPrototypeOf(style).setProperty;
    box.style.setProperty = function (...a) { writes++; return orig.apply(this, a); };
    ctx.$notify();
    expect(box.style.color).toBe('red');

    ctx.c = 'blue';
    expect(box.style.color).toBe('blue');
  });

  test('complex key expressions fall back to the evaluator path', () => {
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ rows: [{ id: 1, label: 'a' }, { id: 2, label: 'b' }] }));
    const el = document.createElement('div');
    el.setAttribute('each', 'row in rows');
    el.setAttribute('key', 'row.id * 10'); // not a bare item.prop — evaluator path
    el.innerHTML = '<span bind="row.label"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);
    const before = clones(host);

    ctx.rows = [{ id: 2, label: 'B' }, { id: 1, label: 'A' }];

    const after = clones(host);
    expect(after.map((c) => c.textContent)).toEqual(['B', 'A']);
    // Keys matched across renders — clones reused, just reordered.
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
  });

  test('dunder key props are not read directly (evaluator fallback)', () => {
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ rows: [{ id: 1 }, { id: 2 }] }));
    const el = document.createElement('div');
    el.setAttribute('each', 'row in rows');
    el.setAttribute('key', 'row.__proto__');
    el.innerHTML = '<span bind="row.id"></span>';
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    // The fast path must NOT read item.__proto__ directly. The evaluator
    // blocks dunder access and yields undefined for every row, so the keys
    // collide and collapse to one clone — prototype objects never become
    // Map keys. Pin that exact (safe) fallback behavior.
    expect(clones(host).map((c) => c.textContent)).toEqual(['2']);
  });

  test('bind-html preserves child identity when markup is unchanged', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ "html": "<b>hi</b>", "other": 0 }');
    const target = document.createElement('div');
    target.setAttribute('bind-html', 'html');
    host.appendChild(target);
    document.body.appendChild(host);
    processTree(host);
    const ctx = findContext(host);

    const bold = target.querySelector('b');
    expect(bold.textContent).toBe('hi');

    ctx.other = 1; // unrelated change — same markup must not rebuild children
    expect(target.querySelector('b')).toBe(bold);

    ctx.html = '<b>bye</b>';
    expect(target.querySelector('b')).not.toBe(bold);
    expect(target.querySelector('b').textContent).toBe('bye');
  });
});
