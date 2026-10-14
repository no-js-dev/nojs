/**
 * Directive errors stay on their element (Safety Rule 8).
 *
 * A directive whose `init` throws must not stop the rest of processTree or
 * leave `_currentEl` pointing at the failing element. A disposer that throws
 * must not stop the remaining disposers or the content swap around them.
 */

import { registerDirective, processTree, _disposeTree } from '../src/registry.js';
import { _currentEl, _onDispose } from '../src/globals.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';

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
  test('a throwing init does not stop later elements from rendering and restores _currentEl', () => {
    registerDirective('init-throws', { init() { throw new Error('boom'); } });
    const host = mount(
      `<div state="{ a: 'ok' }"><i init-throws></i><span id="after" bind="a"></span></div>` +
      `<p state="{ b: 'far' }"><b id="far" bind="b"></b></p>`
    );
    const prev = _currentEl;

    expect(() => processTree(host)).not.toThrow();
    expect(host.querySelector('#after').textContent).toBe('ok');
    expect(host.querySelector('#far').textContent).toBe('far');
    expect(_currentEl).toBe(prev);
    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', 'directive "init-throws" init error on <i>:', 'boom');
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
    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', 'disposer error:', 'bad dispose');
  });

  test('a throwing gate disposer does not stop the remaining ones on teardown', () => {
    const ran = [];
    const el = document.createElement('div');
    el.__gateDisposers = [() => { throw new Error('bad gate dispose'); }, () => ran.push('next')];

    expect(() => _disposeTree(el)).not.toThrow();
    expect(ran).toEqual(['next']);
    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', 'gate disposer error:', 'bad gate dispose');
  });
});
