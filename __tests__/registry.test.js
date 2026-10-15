import { registerDirective, processElement, processTree, _disposeTree, _disposeChildren } from '../src/registry.js';
import { createContext } from '../src/context.js';
import { _setCurrentEl, _onDispose, _storeWatchers, _addStoreWatcher } from '../src/globals.js';
import { _i18nListeners } from '../src/i18n.js';

describe('Directive Registry', () => {
  describe('registerDirective', () => {
    test('registers a directive and processes elements with it', () => {
      const initFn = jest.fn();
      registerDirective('test-dir', { priority: 50, init: initFn });

      const div = document.createElement('div');
      div.setAttribute('test-dir', 'hello');
      processElement(div);

      expect(initFn).toHaveBeenCalledWith(div, 'test-dir', 'hello');
    });

    test('respects directive priority', () => {
      const order = [];
      registerDirective('prio-low', {
        priority: 100,
        init: () => order.push('low'),
      });
      registerDirective('prio-high', {
        priority: 1,
        init: () => order.push('high'),
      });

      const div = document.createElement('div');
      div.setAttribute('prio-low', '');
      div.setAttribute('prio-high', '');
      processElement(div);

      expect(order).toEqual(['high', 'low']);
    });

});

  describe('processElement', () => {
    test('marks element as __declared', () => {
      const div = document.createElement('div');
      expect(div.__declared).toBeFalsy();
      processElement(div);
      expect(div.__declared).toBe(true);
    });

    test('skips already declared elements', () => {
      const initFn = jest.fn();
      registerDirective('skip-test', { init: initFn });

      const div = document.createElement('div');
      div.setAttribute('skip-test', '');
      div.__declared = true;

      processElement(div);
      expect(initFn).not.toHaveBeenCalled();
    });

    test('matches pattern directives like class-*', () => {
      const initFn = jest.fn();
      registerDirective('class-*', { priority: 20, init: initFn });

      const div = document.createElement('div');
      div.setAttribute('class-active', 'true');
      processElement(div);

      expect(initFn).toHaveBeenCalledWith(div, 'class-active', 'true');
    });

    test('matches pattern directives like on:*', () => {
      const initFn = jest.fn();
      registerDirective('on:*', { priority: 20, init: initFn });

      const div = document.createElement('div');
      div.setAttribute('on:click', 'doSomething()');
      processElement(div);

      expect(initFn).toHaveBeenCalledWith(div, 'on:click', 'doSomething()');
    });
  });

  describe('processTree', () => {
    test('processes all elements in tree', () => {
      const initFn = jest.fn();
      registerDirective('tree-test', { init: initFn });

      const root = document.createElement('div');
      const child1 = document.createElement('span');
      child1.setAttribute('tree-test', 'a');
      const child2 = document.createElement('p');
      child2.setAttribute('tree-test', 'b');
      root.appendChild(child1);
      root.appendChild(child2);

      processTree(root);
      expect(initFn).toHaveBeenCalledTimes(2);
    });

    test('skips template and script elements', () => {
      const initFn = jest.fn();
      registerDirective('skip-tpl', { init: initFn });

      const root = document.createElement('div');
      const tpl = document.createElement('template');
      tpl.setAttribute('skip-tpl', '');
      const script = document.createElement('script');
      script.setAttribute('skip-tpl', '');
      root.appendChild(tpl);
      root.appendChild(script);

      processTree(root);
      expect(initFn).not.toHaveBeenCalled();
    });

    test('handles null root gracefully', () => {
      expect(() => processTree(null)).not.toThrow();
    });

    test('processes root element itself', () => {
      const initFn = jest.fn();
      registerDirective('root-test', { init: initFn });

      const root = document.createElement('div');
      root.setAttribute('root-test', 'val');
      processTree(root);

      expect(initFn).toHaveBeenCalledWith(root, 'root-test', 'val');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  DISPOSAL: _disposeTree, _disposeChildren
// ═══════════════════════════════════════════════════════════════════════

describe('Disposal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('_disposeTree', () => {
    test('calls __disposers on root and all descendants', () => {
      const root = document.createElement('div');
      const child = document.createElement('span');
      const grandchild = document.createElement('p');
      root.appendChild(child);
      child.appendChild(grandchild);

      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();
      root.__disposers = [fn1];
      child.__disposers = [fn2];
      grandchild.__disposers = [fn3];

      _disposeTree(root);

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    test('nulls out __disposers after calling them', () => {
      const el = document.createElement('div');
      el.__disposers = [jest.fn()];

      _disposeTree(el);

      expect(el.__disposers).toBeNull();
    });

    test('resets __declared to false', () => {
      const el = document.createElement('div');
      el.__declared = true;
      el.__disposers = [];

      _disposeTree(el);

      expect(el.__declared).toBe(false);
    });

    test('clears context __listeners and removes from _storeWatchers', () => {
      const fn = jest.fn();
      _addStoreWatcher(fn, 'test');

      const el = document.createElement('div');
      el.__ctx = { __listeners: new Set([fn]) };

      _disposeTree(el);

      expect(_storeWatchers.get('test')?.has(fn) ?? false).toBe(false);
      expect(el.__ctx.__listeners.size).toBe(0);
    });

    test('handles null root gracefully', () => {
      expect(() => _disposeTree(null)).not.toThrow();
    });
  });

  describe('_disposeChildren', () => {
    test('calls __disposers on children but NOT on parent', () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('p');
      parent.appendChild(child1);
      parent.appendChild(child2);

      const parentFn = jest.fn();
      const childFn1 = jest.fn();
      const childFn2 = jest.fn();
      parent.__disposers = [parentFn];
      child1.__disposers = [childFn1];
      child2.__disposers = [childFn2];

      _disposeChildren(parent);

      expect(parentFn).not.toHaveBeenCalled();
      expect(childFn1).toHaveBeenCalledTimes(1);
      expect(childFn2).toHaveBeenCalledTimes(1);
    });

    test('disposes deeply nested descendants', () => {
      const root = document.createElement('div');
      const child = document.createElement('div');
      const grandchild = document.createElement('span');
      root.appendChild(child);
      child.appendChild(grandchild);

      const deepFn = jest.fn();
      grandchild.__disposers = [deepFn];

      _disposeChildren(root);

      expect(deepFn).toHaveBeenCalledTimes(1);
    });

    test('resets __declared on children only', () => {
      const parent = document.createElement('div');
      parent.__declared = true;
      const child = document.createElement('span');
      child.__declared = true;
      parent.appendChild(child);

      _disposeChildren(parent);

      expect(parent.__declared).toBe(true);
      expect(child.__declared).toBe(false);
    });

    test('handles parent with no children', () => {
      const parent = document.createElement('div');
      expect(() => _disposeChildren(parent)).not.toThrow();
    });
  });

  describe('_onDispose registration', () => {
    test('registers callback that fires on _disposeTree', () => {
      const el = document.createElement('div');
      const cleanup = jest.fn();

      _setCurrentEl(el);
      _onDispose(cleanup);
      _setCurrentEl(null);

      _disposeTree(el);

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test('multiple _onDispose callbacks are all called', () => {
      const el = document.createElement('div');
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();

      _setCurrentEl(el);
      _onDispose(fn1);
      _onDispose(fn2);
      _onDispose(fn3);
      _setCurrentEl(null);

      _disposeTree(el);

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    test('does not register when _currentEl is null', () => {
      _setCurrentEl(null);
      _onDispose(jest.fn());
      // No error, just a no-op
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  MATCH CACHE: attribute-name signature separator
// ═══════════════════════════════════════════════════════════════════════

describe('Match cache signature', () => {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const source = fs.readFileSync(path.join(__dirname, '../src/registry.js'));

  test('src/registry.js holds no literal NUL byte', () => {
    expect(source.includes(0)).toBe(false);
  });

  test('the separator literal still evaluates to U+0000', () => {
    const m = /sig \+= attrs\[i\]\.name \+ ("(?:[^"\\]|\\.)*");/.exec(source.toString('utf8'));
    expect(m).not.toBeNull();
    expect(vm.runInNewContext(m[1])).toBe('\u0000');
  });

  test('attribute sets whose names concatenate alike get separate matches', () => {
    const joined = jest.fn();
    const split = jest.fn();
    registerDirective('sigsep-abx', { init: joined });
    registerDirective('sigsep-a', { init: split });

    const one = document.createElement('div');
    one.setAttribute('sigsep-abx', '');
    processElement(one);

    const two = document.createElement('div');
    two.setAttribute('sigsep-a', '');
    two.setAttribute('bx', '');
    processElement(two);

    expect(joined).toHaveBeenCalledTimes(1);
    expect(joined.mock.calls[0][0]).toBe(one);
    expect(split).toHaveBeenCalledTimes(1);
    expect(split.mock.calls[0][0]).toBe(two);
  });
});
