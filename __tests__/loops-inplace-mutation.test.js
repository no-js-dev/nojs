/**
 * Loops re-render after in-place array mutation (nojs#349).
 *
 * push / splice / index assign / reverse / sort keep the array reference.
 * The same-reference fast path must only fire when the contents are also
 * unchanged; otherwise the loop falls through to the keyed / delta / rebuild
 * paths. Every case is driven through an on:click handler (the real
 * statement write-back path) for both unkeyed and keyed loops.
 */

import { _stores, _storeWatchers } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';

afterEach(() => {
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
});

function mount(items, handler, loopAttrs = '') {
  document.body.innerHTML = `
    <div id="host" state='${JSON.stringify({ items })}'>
      <ul id="list"><li each="item in items" ${loopAttrs} bind="item"></li></ul>
      <button id="btn" on:click="${handler}"></button>
    </div>`;
  const host = document.getElementById('host');
  processTree(host);
  return {
    host,
    ctx: findContext(host),
    texts: () => [...document.querySelectorAll('#list li')].map((li) => li.textContent),
    click: () => document.getElementById('btn').click(),
  };
}

const CASES = [
  ['push', "items.push('d')", ['a', 'b', 'c', 'd']],
  ['splice remove', 'items.splice(1, 1)', ['a', 'c']],
  ['splice insert', "items.splice(1, 0, 'x')", ['a', 'x', 'b', 'c']],
  ['splice move first to last', "items.splice(0, 1); items.splice(2, 0, 'a')", ['b', 'c', 'a']],
  ['index assign', "items[0] = 'X'", ['X', 'b', 'c']],
  ['reverse', 'items.reverse()', ['c', 'b', 'a']],
  ['sort', 'items.sort((p, q) => p < q ? 1 : -1)', ['c', 'b', 'a']],
  ['pop', 'items.pop()', ['a', 'b']],
  ['shift', 'items.shift()', ['b', 'c']],
  ['unshift', "items.unshift('z')", ['z', 'a', 'b', 'c']],
];

describe.each([
  ['unkeyed', ''],
  ['keyed', 'key="item"'],
])('%s loop re-renders after in-place mutation', (_label, loopAttrs) => {
  test.each(CASES)('%s', (_name, handler, expected) => {
    const { texts, click } = mount(['a', 'b', 'c'], handler, loopAttrs);
    expect(texts()).toEqual(['a', 'b', 'c']);
    click();
    expect(texts()).toEqual(expected);
  });

  test('repeated in-place mutations keep rendering', () => {
    const { texts, click } = mount(['a'], "items.push('n' + items.length)", loopAttrs);
    click();
    click();
    expect(texts()).toEqual(['a', 'n1', 'n2']);
  });

  test('mutation to empty and back', () => {
    const { ctx, texts } = mount(['a', 'b'], '', loopAttrs);
    ctx.__raw.items.splice(0);
    ctx.$notify('items');
    expect(texts()).toEqual([]);
    ctx.__raw.items.push('q');
    ctx.$notify('items');
    expect(texts()).toEqual(['q']);
  });
});

describe('keyed object loop reuses rows on in-place reorder', () => {
  test('reverse moves existing nodes instead of recreating them', () => {
    const items = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 3, n: 'c' }];
    document.body.innerHTML = `
      <div id="host" state='${JSON.stringify({ items })}'>
        <ul id="list"><li each="item in items" key="item.id" bind="item.n"></li></ul>
        <button id="btn" on:click="items.reverse()"></button>
      </div>`;
    processTree(document.getElementById('host'));
    const before = [...document.querySelectorAll('#list li')];
    document.getElementById('btn').click();
    const after = [...document.querySelectorAll('#list li')];
    expect(after.map((li) => li.textContent)).toEqual(['c', 'b', 'a']);
    expect(after[0]).toBe(before[2]);
    expect(after[2]).toBe(before[0]);
  });
});

describe('sort attribute is exempt from the same-reference fast path', () => {
  test('in-place mutation of a sort field re-sorts the list', () => {
    const items = [{ id: 1, n: 'b' }, { id: 2, n: 'c' }, { id: 3, n: 'a' }];
    document.body.innerHTML = `
      <div id="host" state='${JSON.stringify({ items })}'>
        <ul id="list"><li each="item in items" sort="n" bind="item.n"></li></ul>
        <button id="btn" on:click="items[0].n = 'z'"></button>
      </div>`;
    processTree(document.getElementById('host'));
    const texts = () => [...document.querySelectorAll('#list li')].map((li) => li.textContent);
    expect(texts()).toEqual(['a', 'b', 'c']);
    document.getElementById('btn').click();
    expect(texts()).toEqual(['a', 'c', 'z']);
  });
});

describe('unchanged contents still take the notify-only path', () => {
  test('a notify with identical contents keeps every clone node', () => {
    const { ctx, texts } = mount(['a', 'b', 'c'], '');
    const before = [...document.querySelectorAll('#list li')];
    ctx.$notify('items');
    const after = [...document.querySelectorAll('#list li')];
    expect(texts()).toEqual(['a', 'b', 'c']);
    after.forEach((li, i) => expect(li).toBe(before[i]));
  });

  test('deep mutation of an item updates bindings without rebuilding', () => {
    const items = [{ n: 'a' }, { n: 'b' }];
    document.body.innerHTML = `
      <div id="host" state='${JSON.stringify({ items })}'>
        <ul id="list"><li each="item in items" bind="item.n"></li></ul>
        <button id="btn" on:click="items[1].n = 'B'"></button>
      </div>`;
    processTree(document.getElementById('host'));
    const before = [...document.querySelectorAll('#list li')];
    document.getElementById('btn').click();
    const after = [...document.querySelectorAll('#list li')];
    expect(after.map((li) => li.textContent)).toEqual(['a', 'B']);
    after.forEach((li, i) => expect(li).toBe(before[i]));
  });
});
