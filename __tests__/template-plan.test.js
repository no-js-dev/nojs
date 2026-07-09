/**
 * WS1 — loop template compilation (master template + process plan).
 *
 * Loop clones are no longer processed by processTree: a per-loop master
 * template (stripped once, external template resolved once) is cloned per
 * iteration and directives are initialized by replaying a precomputed
 * process plan. These tests pin that the planned path is observably
 * identical to the generic path.
 */

import { _stores, _storeWatchers, _globals } from '../src/globals.js';
import { processTree, _buildProcessPlan, _runProcessPlan } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import { _execStatement } from '../src/evaluate.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';
import '../src/directives/styling.js';

afterEach(() => {
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
  Object.keys(_globals).forEach((k) => delete _globals[k]);
});

function mount(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  processTree(host);
  return host;
}

describe('_buildProcessPlan / _runProcessPlan', () => {
  test('plan records only directive-carrying elements with paths and values', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <span></span>
      <p bind="row.label"><em class-danger="row.id === sel"></em></p>`;
    const plan = _buildProcessPlan(root);
    expect(plan).toHaveLength(2);
    expect(plan[0].path).toEqual([1]);            // <p> is element child 1
    expect(plan[0].values).toEqual(['row.label']);
    expect(plan[1].path).toEqual([1, 0]);         // <em> inside <p>
    expect(plan[1].matched[0].name).toBe('class-danger');
  });

  test('plan skips TEMPLATE and SCRIPT subtrees like processTree', () => {
    const root = document.createElement('div');
    root.innerHTML = `<template><p bind="x"></p></template><script>var a;</script><b bind="y"></b>`;
    const plan = _buildProcessPlan(root);
    expect(plan).toHaveLength(1);
    expect(plan[0].values).toEqual(['y']);
  });

  test('replay skips nodes detached before/during the run (structural safety)', () => {
    const host = mount(`<div state='{"msg": "hi"}'></div>`);
    const scope = host.firstElementChild;
    const inner = document.createElement('div');
    inner.innerHTML = `<p bind="msg"></p><section><span bind="msg"></span></section>`;
    scope.appendChild(inner);
    const plan = _buildProcessPlan(inner);
    expect(plan).toHaveLength(2);
    // Structural inits (loops, use) can detach later planned nodes mid-run.
    // Simulate: the <section> subtree is gone by the time replay reaches it.
    const section = inner.querySelector('section');
    const span = section.firstElementChild;
    section.remove();
    _runProcessPlan(inner, plan);
    expect(inner.querySelector('p').textContent).toBe('hi');
    expect(span.__declared).toBeUndefined(); // detached node never initialized
  });
});

describe('planned loop clones — equivalence with generic processing', () => {
  test('bind / class-* / on:* inside keyed clones work end to end', () => {
    const host = mount(`
      <div state='{"rows": [{"id":1,"label":"a"},{"id":2,"label":"b"}], "sel": 0}'>
        <ul>
          <li each="row in rows" key="row.id" class-danger="row.id === sel">
            <span class="lbl" bind="row.label"></span>
            <a class="pick" on:click="sel = row.id"></a>
          </li>
        </ul>
      </div>`);
    const items = host.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.lbl').textContent).toBe('a');
    expect(items[1].querySelector('.lbl').textContent).toBe('b');

    items[1].querySelector('.pick').click();
    expect(items[1].classList.contains('danger')).toBe(true);
    expect(items[0].classList.contains('danger')).toBe(false);
  });

  test('clones carry no loop/companion attributes (Safety Rule 9)', () => {
    const host = mount(`
      <div state='{"rows": [{"id":1}]}'>
        <p each="row in rows" key="row.id" limit="5" index="i" bind="row.id"></p>
      </div>`);
    const clone = host.querySelector('p');
    expect(clone.textContent).toBe('1');
    for (const attr of ['each', 'key', 'limit', 'index', 'template']) {
      expect(clone.hasAttribute(attr)).toBe(false);
    }
  });

  test('nested loops inside clones render fully', () => {
    const host = mount(`
      <div state='{"groups": [{"name":"g1","items":["x","y"]},{"name":"g2","items":["z"]}]}'>
        <section each="g in groups" key="g.name">
          <h2 bind="g.name"></h2>
          <span class="it" each="it in g.items" bind="it"></span>
        </section>`);
    const sections = host.querySelectorAll('section');
    expect(sections).toHaveLength(2);
    expect([...sections[0].querySelectorAll('.it')].map((s) => s.textContent)).toEqual(['x', 'y']);
    expect([...sections[1].querySelectorAll('.it')].map((s) => s.textContent)).toEqual(['z']);
  });

  test('if inside clones empties per-row without breaking siblings', () => {
    // Pin: same semantics as the generic path — a falsy `if` empties the
    // element's content but leaves the element in place.
    const host = mount(`
      <div state='{"rows": [{"id":1,"ok":true},{"id":2,"ok":false}]}'>
        <div class="row" each="row in rows" key="row.id">
          <em if="row.ok" bind="row.id"></em>
          <b bind="row.id"></b>
        </div>
      </div>`);
    const rows = host.querySelectorAll('.row');
    expect(rows[0].querySelector('em').textContent).toBe('1');
    expect(rows[1].querySelector('em').textContent).toBe('');
    expect(rows[1].querySelector('b').textContent).toBe('2');
  });

  test('external template attribute resolves into clones', () => {
    const host = mount(`
      <template id="row-tpl"><i class="v" bind="row.label"></i></template>
      <div state='{"rows": [{"id":1,"label":"tpl-a"}]}'>
        <li each="row in rows" key="row.id" template="row-tpl"></li>
      </div>`);
    expect(host.querySelector('li .v').textContent).toBe('tpl-a');
  });

  test('external template appearing later is picked up (master rebuild on ref change)', () => {
    const host = mount(`
      <div state='{"rows": [{"id":1,"label":"first"}]}'>
        <li each="row in rows" key="row.id" template="late-tpl"></li>
      </div>`);
    // No template yet — clone renders with its own (empty) children.
    expect(host.querySelector('li .v')).toBeNull();

    const tpl = document.createElement('template');
    tpl.id = 'late-tpl';
    tpl.innerHTML = '<i class="v" bind="row.label"></i>';
    document.body.appendChild(tpl);

    // New row forces new clones — the ref change rebuilds the master.
    const ctx = findContext(host.querySelector('div[state]'));
    _execStatement('rows = [{"id":2,"label":"late"}]', ctx, {});
    expect(host.querySelector('li .v').textContent).toBe('late');
  });

  test('else template renders on empty and items replace it on refill', () => {
    const host = mount(`
      <template id="empty-tpl"><p class="empty">none</p></template>
      <div state='{"rows": []}'>
        <li each="row in rows" key="row.id" else="empty-tpl" bind="row.id"></li>
      </div>`);
    expect(host.querySelector('.empty')).not.toBeNull();

    const ctx = findContext(host.querySelector('div[state]'));
    _execStatement('rows = [{"id":7}]', ctx, {});
    expect(host.querySelector('.empty')).toBeNull();
    expect(host.querySelector('li').textContent).toBe('7');
  });

  test('keyless delta append initializes appended clones via the plan', () => {
    const host = mount(`
      <div state='{"rows": [{"id":1,"label":"a"}]}'>
        <li each="row in rows"><span bind="row.label"></span></li>
      </div>`);
    const ctx = findContext(host.querySelector('div[state]'));
    const first = host.querySelector('li');
    _execStatement('rows = rows.concat([{"id":2,"label":"b"}])', ctx, {});
    const items = host.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0]).toBe(first); // prefix reused, not rebuilt
    expect(items[1].querySelector('span').textContent).toBe('b');
  });

  test('keyed reconcile mixes reused and planned new clones in list order', () => {
    const host = mount(`
      <div state='{"rows": [{"id":1,"label":"a"},{"id":3,"label":"c"}]}'>
        <li each="row in rows" key="row.id" bind="row.label"></li>
      </div>`);
    const ctx = findContext(host.querySelector('div[state]'));
    const [liA, liC] = host.querySelectorAll('li');
    _execStatement(
      'rows = [{"id":1,"label":"a"},{"id":2,"label":"b"},{"id":3,"label":"c"}]',
      ctx, {},
    );
    const items = [...host.querySelectorAll('li')];
    expect(items.map((n) => n.textContent)).toEqual(['a', 'b', 'c']);
    expect(items[0]).toBe(liA);
    expect(items[2]).toBe(liC);
  });
});
