/**
 * Directive errors stay on their element (Safety Rule 8).
 *
 * A directive whose `init` throws must not stop the rest of processTree or
 * leave `_currentEl` pointing at the failing element. Outside a batch drain
 * the first error is rethrown once the walk finishes, so callers keep the
 * signal they had before. A disposer that throws must not stop the remaining
 * disposers or the content swap around them.
 */

import { registerDirective, processTree, _disposeTree } from '../src/registry.js';
import { _currentEl, _onDispose } from '../src/globals.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';

let warnSpy;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  document.body.innerHTML = '';
});

function mount(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe('directive init errors', () => {
  test('a throwing init renders the rest of the tree, restores _currentEl, then rethrows', () => {
    registerDirective('init-throws', { init() { throw new Error('boom'); } });
    const host = mount(
      `<div state="{ a: 'ok' }"><i init-throws></i><span id="after" bind="a"></span></div>` +
      `<p state="{ b: 'far' }"><b id="far" bind="b"></b></p>`
    );
    const prev = _currentEl;

    expect(() => processTree(host)).toThrow('boom');
    expect(host.querySelector('#after').textContent).toBe('ok');
    expect(host.querySelector('#far').textContent).toBe('far');
    expect(_currentEl).toBe(prev);
    const call = warnSpy.mock.calls.find((c) => c[1] === 'directive "init-throws" init error on <i>:');
    expect(call[2]).toBeInstanceOf(Error);
  });

  test('only the first error is rethrown and the next walk starts clean', () => {
    let n = 0;
    registerDirective('init-throws-n', { init() { throw new Error(`boom${++n}`); } });
    const host = mount(`<i init-throws-n></i><i init-throws-n></i>`);
    expect(() => processTree(host)).toThrow('boom1');

    const clean = mount(`<div state="{ c: 'ok' }"><span id="clean" bind="c"></span></div>`);
    expect(() => processTree(clean)).not.toThrow();
    expect(clean.querySelector('#clean').textContent).toBe('ok');
  });

  test('a nested walk defers to the outermost walk', () => {
    registerDirective('nested-throws', { init() { throw new Error('inner'); } });
    registerDirective('runs-nested', {
      init(el) {
        el.innerHTML = '<i nested-throws></i>';
        processTree(el.firstChild);
        el.dataset.after = 'yes';
      },
    });
    const host = mount(`<div runs-nested></div>`);
    expect(() => processTree(host)).toThrow('inner');
    expect(host.firstChild.dataset.after).toBe('yes');
  });

  test('inside a reactive update the error is warned, not rethrown, and every loop row renders', () => {
    registerDirective('row-throws', {
      init(el) { if (el.parentElement.__ctx.it === 2) throw new Error('row2'); },
    });
    const host = mount(
      `<div state="{ items: [] }">` +
        `<ul><li each="it in items"><i row-throws></i><span class="row" bind="it"></span></li></ul>` +
        `<button on:click="items = [1, 2, 3]"></button>` +
      `</div>`
    );
    processTree(host);

    expect(() => host.querySelector('button').click()).not.toThrow();
    expect([...host.querySelectorAll('.row')].map((s) => s.textContent)).toEqual(['1', '2', '3']);
    expect(warnSpy.mock.calls.some((c) => c[1] === 'directive "row-throws" init error on <i>:')).toBe(true);
  });
});

describe('disposer errors', () => {
  test('a throwing disposer does not stop the remaining disposers or the if content swap', () => {
    const ran = [];
    registerDirective('dispose-throws', {
      init() {
        _onDispose(() => { throw new Error('bad dispose'); });
        _onDispose(() => ran.push('same element'));
      },
    });
    registerDirective('dispose-ok', { init() { _onDispose(() => ran.push('later element')); } });
    const host = mount(
      `<div state="{ show: true }">` +
        `<div id="box" if="show"><i dispose-throws></i><b dispose-ok>content</b></div>` +
        `<button on:click="show = false"></button>` +
      `</div>`
    );
    processTree(host);
    expect(host.querySelector('#box').textContent).toBe('content');

    host.querySelector('button').click();
    expect(host.querySelector('#box').textContent).toBe('');
    expect(ran).toEqual(['same element', 'later element']);
    const call = warnSpy.mock.calls.find((c) => c[1] === 'disposer error:');
    expect(call[2].message).toBe('bad dispose');
  });

  test('a throwing gate disposer does not stop the remaining ones on teardown', () => {
    const ran = [];
    const el = document.createElement('div');
    el.__gateDisposers = [() => { throw new Error('bad gate dispose'); }, () => ran.push('next')];

    expect(() => _disposeTree(el)).not.toThrow();
    expect(ran).toEqual(['next']);
    const call = warnSpy.mock.calls.find((c) => c[1] === 'gate disposer error:');
    expect(call[2].message).toBe('bad gate dispose');
  });
});

describe('NoJS.init with a throwing directive', () => {
  test('renders the page, runs plugin init hooks, then rejects with the error', async () => {
    let NoJS;
    jest.isolateModules(() => { NoJS = require('../src/index.js').default; });
    NoJS.directive('init-boom', { init() { throw new Error('boom'); } });
    const seen = [];
    NoJS.use({ name: 'probe', install() {}, init() { seen.push('plugin init'); } });
    NoJS.on('plugins:ready', () => seen.push('plugins:ready'));
    document.body.innerHTML =
      `<div state="{ a: 'ok' }"><i init-boom></i><span id="after" bind="a"></span></div>` +
      `<p state="{ b: 'far' }"><b id="far" bind="b"></b></p>`;

    await expect(NoJS.init()).rejects.toThrow('boom');
    expect(document.querySelector('#after').textContent).toBe('ok');
    expect(document.querySelector('#far').textContent).toBe('far');
    expect(seen).toEqual(['plugin init', 'plugins:ready']);
  });
});
