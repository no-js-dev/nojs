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

  test('trailing whitespace after the list expression', () => {
    render(`<ul state="{ items: ['a', 'b'] }"><li ${dir}="i in items  " bind="i"></li></ul>`);
    expect(texts('li')).toEqual(['a', 'b']);
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

  test('for on other elements accepts leading whitespace', () => {
    render(`<ul state="{}"><li for="
      x in ['a', 'b']" bind="x"></li></ul>`);
    expect(texts('li')).toEqual(['a', 'b']);
  });

  test('matching stays linear on long whitespace runs', () => {
    const el = document.createElement('li');
    const ws = ' '.repeat(100000);
    const t0 = Date.now();
    el.setAttribute('for', 'x in items' + ws + 'z' + ws);
    expect(_isLoopElement(el)).toBe(true);
    el.setAttribute('for', 'x' + ws + 'y');
    expect(_isLoopElement(el)).toBe(false);
    el.setAttribute('for', 'x in' + ws);
    expect(_isLoopElement(el)).toBe(false);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  test('native label for is left untouched by processTree', () => {
    render(`<div state="{}"><label for="email">Email</label><input id="email"></div>`);
    const label = document.querySelector('label');
    expect(label.getAttribute('for')).toBe('email');
    expect(label.textContent).toBe('Email');
  });
});
