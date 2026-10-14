// ═══════════════════════════════════════════════════════════════════════
//  Loops: list expressions containing whitespace
//  `col in ['name', 'email', 'role']` rendered nothing because the loop
//  expression regex only accepted a whitespace-free list side.
// ═══════════════════════════════════════════════════════════════════════

import { _stores } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import { _isLoopElement } from '../src/directives/loops.js';
import { _isCompleteExpr } from '../src/evaluate.js';

function render(html) {
  document.body.innerHTML = html;
  processTree(document.body);
}

const texts = (sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent);

afterEach(() => {
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
});

describe.each(['foreach', 'each', 'for'])('%s with array literals', (dir) => {
  test('string literal with spaces after commas', () => {
    render(`<table state="{}"><tr>
      <th ${dir}="col in ['name', 'email', 'role']" bind="col"></th>
    </tr></table>`);
    expect(texts('th')).toEqual(['name', 'email', 'role']);
  });

  test('string literal without spaces still renders', () => {
    render(`<ul state="{}"><li ${dir}="col in ['name','email','role']" bind="col"></li></ul>`);
    expect(texts('li')).toEqual(['name', 'email', 'role']);
  });

  test('number literal with spaces, inside brackets too', () => {
    render(`<ul state="{}"><li ${dir}="n in [ 1, 2, 3 ]" bind="n * 10"></li></ul>`);
    expect(texts('li')).toEqual(['10', '20', '30']);
  });

  test('strings that contain commas and spaces', () => {
    render(`<ul state="{}"><li ${dir}="s in ['a, b', 'c,d', ' e ']" bind="'[' + s + ']'"></li></ul>`);
    expect(texts('li')).toEqual(['[a, b]', '[c,d]', '[ e ]']);
  });

  test('nested arrays with an inner loop', () => {
    render(`<div state="{}">
      <p ${dir}="row in [[1, 2], [3, 4, 5]]" class="row">
        <span ${dir}="cell in row" bind="cell"></span>
      </p>
    </div>`);
    const rows = [...document.querySelectorAll('p.row')];
    expect(rows.length).toBe(2);
    expect(rows.map((r) => [...r.querySelectorAll('span')].map((s) => s.textContent))).toEqual([
      ['1', '2'],
      ['3', '4', '5'],
    ]);
  });

  test('array of object literals with key', () => {
    render(`<ul state="{}">
      <li ${dir}="u in [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }]" key="u.id"
          bind="u.id + ':' + u.name"></li>
    </ul>`);
    expect(texts('li')).toEqual(['1:Ann', '2:Bob']);
  });

  test('literal spread over several lines', () => {
    render(`<ul state="{}"><li ${dir}="x in [
      'one',
      'two'
    ]" bind="x"></li></ul>`);
    expect(texts('li')).toEqual(['one', 'two']);
  });

  test('surrounding whitespace around the expression', () => {
    render(`<ul state="{ items: ['a', 'b'] }"><li ${dir}="  i in items  " bind="i"></li></ul>`);
    if (dir === 'for') {
      // `for` keeps v1.21.1 parity: a padded value is not a loop.
      const li = document.querySelector('li');
      expect(document.querySelectorAll('li').length).toBe(1);
      expect(li.getAttribute('for')).toBe('  i in items  ');
    } else {
      expect(texts('li')).toEqual(['a', 'b']);
    }
  });

  test('empty literal with spaces renders the else template', () => {
    render(`<ul state="{}"><li ${dir}="x in [ ]" else="emptyTpl" bind="x"></li></ul>
      <template id="emptyTpl"><li class="empty">none</li></template>`);
    expect(texts('ul li')).toEqual(['none']);
  });

  test('spaced expression over state stays reactive', async () => {
    render(`<ul state="{ items: ['a', 'b', 'c'] }"><li ${dir}="i in items.slice(0, 2)" bind="i"></li></ul>`);
    expect(texts('li')).toEqual(['a', 'b']);
    findContext(document.querySelector('ul')).items = ['x', 'y', 'z'];
    await new Promise((r) => setTimeout(r, 0));
    expect(texts('li')).toEqual(['x', 'y']);
  });

  test('spaced pipe expression', () => {
    render(`<ul state="{ nums: [1, 2, 3] }"><li ${dir}="n in nums | reverse" bind="n"></li></ul>`);
    expect(texts('li')).toEqual(['3', '2', '1']);
  });
});

describe('_isLoopElement with spaced list expressions', () => {
  test('for with an array literal containing spaces is a loop', () => {
    const el = document.createElement('li');
    el.setAttribute('for', "n in [1, 2, 3]");
    expect(_isLoopElement(el)).toBe(true);
  });

  test('native label/output for stays a non-loop', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'email');
    expect(_isLoopElement(label)).toBe(false);
    const output = document.createElement('output');
    output.setAttribute('for', 'a b');
    expect(_isLoopElement(output)).toBe(false);
  });

  test.each([
    'x in y z',
    'sum in totals ',
    'total in qty price',
    'a in b\nc',
  ])('native output/label for="%s" is not a loop', (value) => {
    for (const tag of ['output', 'label']) {
      const el = document.createElement(tag);
      el.setAttribute('for', value);
      expect(_isLoopElement(el)).toBe(false);
    }
  });

  test('native output/label with a spaced for value keep rendering', () => {
    render(`<div state="{}">
      <output for="x in y z">calc</output>
      <output for="sum in totals ">sum</output>
      <label for="first in last name">Name</label>
    </div>`);
    const outputs = document.querySelectorAll('output');
    expect([...outputs].map((o) => o.textContent)).toEqual(['calc', 'sum']);
    expect(outputs[0].getAttribute('for')).toBe('x in y z');
    expect(outputs[1].getAttribute('for')).toBe('sum in totals ');
    expect(document.querySelector('label').textContent).toBe('Name');
  });

  test('native output/label keep the v1.21.1 loop shape "item in path"', () => {
    render(`<div state="{ items: ['a', 'b'] }">
      <label for="item in items" class="l" bind="item"></label>
      <output for="item in items" class="o" bind="item"></output>
    </div>`);
    expect(texts('label.l')).toEqual(['a', 'b']);
    expect(texts('output.o')).toEqual(['a', 'b']);
  });

  test('foreach/each on output still accept spaced list expressions', () => {
    render(`<div state="{}"><output foreach="n in [1, 2]" bind="n"></output></div>`);
    expect(texts('output')).toEqual(['1', '2']);
  });

  test('native label for is left untouched by processTree', () => {
    render(`<div state="{}"><label for="email">Email</label><input id="email"></div>`);
    const label = document.querySelector('label');
    expect(label.getAttribute('for')).toBe('email');
    expect(label.textContent).toBe('Email');
  });
});

describe('for attribute keeps v1.21.1 parity outside spaced list expressions', () => {
  const XHTML = 'http://www.w3.org/1999/xhtml';
  const SVG = 'http://www.w3.org/2000/svg';

  function forEl(tag, value, doc = document, ns) {
    const el = ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);
    el.setAttribute('for', value);
    return el;
  }

  test('XHTML label/output (lowercase tagName) keep the native carve-out', () => {
    const xml = new DOMParser().parseFromString(`<html xmlns="${XHTML}"><body/></html>`, 'application/xhtml+xml');
    const output = forEl('output', 'x in y z', xml, XHTML);
    const label = forEl('label', 'sum in totals ', xml, XHTML);
    expect(output.tagName).toBe('output');
    expect(_isLoopElement(output)).toBe(false);
    expect(_isLoopElement(label)).toBe(false);
    expect(_isLoopElement(forEl('label', "x in ['a', 'b']", xml, XHTML))).toBe(false);
    expect(_isLoopElement(forEl('label', 'item in items', xml, XHTML))).toBe(true);
  });

  test('XHTML document: native output/label render, spaced each still loops', () => {
    const xml = new DOMParser().parseFromString(
      `<html xmlns="${XHTML}"><body><div id="root" state="{ items: ['a', 'b'] }">` +
        `<output for="x in y z">calc</output><label for="sum in totals ">lab</label>` +
        `<ul><li each="i in items | reverse" bind="i"></li></ul>` +
      `</div></body></html>`,
      'application/xhtml+xml',
    );
    const root = xml.getElementById('root');
    processTree(root);
    expect(root.querySelector('output').textContent).toBe('calc');
    expect(root.querySelector('label').textContent).toBe('lab');
    expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['b', 'a']);
  });

  test('SVG-namespace label/output keep the native carve-out', () => {
    expect(_isLoopElement(forEl('label', 'x in y z', document, SVG))).toBe(false);
    expect(_isLoopElement(forEl('output', 'a in b c', document, SVG))).toBe(false);
  });

  test.each([
    ['x in y z', false],
    ['a in b ', false],
    [' a in b', false],
    ['x in items oops', false],
    ['total in qty price', false],
    ['item in items', true],
    ["x in ['a', 'b']", true],
    ['y in items | reverse', true],
    ['n in items.slice(0, 2)', true],
    ['u in [{ id: 1 }, { id: 2 }]', true],
  ])('custom element for="%s" is a loop: %s', (value, expected) => {
    expect(_isLoopElement(forEl('my-tip', value))).toBe(expected);
    expect(_isLoopElement(forEl('li', value))).toBe(expected);
  });

  test('custom elements with a non-loop for value keep rendering', () => {
    render(`<div state="{}">
      <my-tip for="x in y z">tip</my-tip>
      <my-tip for="sum in totals ">pad</my-tip>
      <div for="a in b c">div</div>
    </div>`);
    expect(texts('my-tip')).toEqual(['tip', 'pad']);
    expect(document.querySelector('my-tip').getAttribute('for')).toBe('x in y z');
    expect(texts('div div')).toEqual(['div']);
  });

  test('custom elements with a spaced list expression loop', () => {
    render(`<div state="{}">
      <my-row for="x in [1, 2]" bind="x">raw</my-row>
      <my-row for="y in ['a', 'b'] | reverse" class="r" bind="y">raw</my-row>
    </div>`);
    expect(texts('my-row:not(.r)')).toEqual(['1', '2']);
    expect(texts('my-row.r')).toEqual(['b', 'a']);
  });

  test('matching stays linear on long whitespace runs', () => {
    const ws = ' '.repeat(100000);
    const t0 = Date.now();
    expect(_isLoopElement(forEl('li', 'x in items' + ws + 'z'))).toBe(false);
    expect(_isLoopElement(forEl('li', 'x in [' + ws + '1]'))).toBe(true);
    expect(_isLoopElement(forEl('li', 'x' + ws + 'y'))).toBe(false);
    expect(_isLoopElement(forEl('li', 'x in' + ws))).toBe(false);
    expect(_isLoopElement(forEl('li', ws + 'x in xs' + ws))).toBe(false);
    expect(_isLoopElement(forEl('output', 'x' + ws + 'in' + ws + 'y z'))).toBe(false);
    render(`<ul state="{}"><li foreach="${ws}x in [${ws}1, 2]${ws}" bind="x"></li></ul>`);
    expect(texts('li')).toEqual(['1', '2']);
    expect(Date.now() - t0).toBeLessThan(500);
  });
});

describe('_isCompleteExpr', () => {
  test.each([
    ["['a', 'b']", true],
    ['items | reverse', true],
    ["items | where:'on':true", true],
    ['a.b[0]', true],
    ['y z', false],
    ['qty price', false],
    ['items |', false],
    ['', false],
    ['   ', false],
  ])('%j → %s', (expr, expected) => {
    expect(_isCompleteExpr(expr)).toBe(expected);
  });
});
