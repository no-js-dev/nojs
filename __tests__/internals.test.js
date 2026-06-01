// ═══════════════════════════════════════════════════════════════════════
//  NoJS.internals API TESTS
//  Verifies the internal API surface exposed for trusted plugins
//  (e.g. NoJS-Elements) via NoJS.internals.
// ═══════════════════════════════════════════════════════════════════════

import NoJS from '../src/index.js';
import { registerDirective, processTree, _removeCoreDirective } from '../src/registry.js';
import { _warn } from '../src/globals.js';

// Import core directives so they register before freeze
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/dnd-stub.js';
import '../src/directives/validate-stub.js';

describe('NoJS.internals', () => {
  beforeAll(async () => {
    // Ensure directives are frozen (init freezes them)
    NoJS._initialized = false;
    document.body.innerHTML = '<div id="app"></div>';
    await NoJS.init();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  afterAll(() => {
    NoJS._initialized = false;
  });

  test('returns a frozen object', () => {
    const internals = NoJS.internals;
    expect(internals).toBeDefined();
    expect(Object.isFrozen(internals)).toBe(true);
  });

  test('exposes all expected keys', () => {
    const internals = NoJS.internals;
    const expectedKeys = [
      'execStatement',
      'cloneTemplate',
      'disposeChildren',
      'warn',
      'validators',
      'removeCoreDirective',
      'onDispose',
    ];

    for (const key of expectedKeys) {
      expect(internals).toHaveProperty(key);
    }
  });

  test('execStatement is a function', () => {
    expect(typeof NoJS.internals.execStatement).toBe('function');
  });

  test('cloneTemplate is a function', () => {
    expect(typeof NoJS.internals.cloneTemplate).toBe('function');
  });

  test('disposeChildren is a function', () => {
    expect(typeof NoJS.internals.disposeChildren).toBe('function');
  });

  test('warn is a function', () => {
    expect(typeof NoJS.internals.warn).toBe('function');
  });

  test('validators is an object', () => {
    expect(typeof NoJS.internals.validators).toBe('object');
    expect(NoJS.internals.validators).not.toBeNull();
  });

  test('removeCoreDirective is a function', () => {
    expect(typeof NoJS.internals.removeCoreDirective).toBe('function');
  });

  test('onDispose is a function', () => {
    expect(typeof NoJS.internals.onDispose).toBe('function');
  });

  test('each call to internals returns a fresh frozen object', () => {
    const a = NoJS.internals;
    const b = NoJS.internals;
    // Each access creates a new frozen object (getter)
    expect(a).not.toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(b)).toBe(true);
  });

  test('frozen internals object cannot be extended', () => {
    const internals = NoJS.internals;
    expect(() => {
      internals.newProp = 'test';
    }).toThrow();
  });
});

describe('removeCoreDirective', () => {
  beforeAll(async () => {
    NoJS._initialized = false;
    document.body.innerHTML = '<div id="app"></div>';
    await NoJS.init();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  afterAll(() => {
    NoJS._initialized = false;
  });

  test('removes a stub directive so it no longer processes', () => {
    // "drag" is registered as a stub — remove it
    const internals = NoJS.internals;
    internals.removeCoreDirective('drag');

    // After removal, setting drag attribute should not trigger the stub warning
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 1 }');
    const el = document.createElement('div');
    el.setAttribute('drag', 'x');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    // The drag directive should not have been processed (no warn about deprecation)
    // since it was removed from the registry
    const dragWarns = warnSpy.mock.calls.filter(
      (c) => c.some((arg) => typeof arg === 'string' && arg.includes('"drag" has moved'))
    );
    expect(dragWarns).toHaveLength(0);
    warnSpy.mockRestore();
  });

  test('allows re-registering a directive after removeCoreDirective', () => {
    // Remove "drop" stub, then register a custom "drop" directive
    const internals = NoJS.internals;
    internals.removeCoreDirective('drop');

    let customInitCalled = false;
    registerDirective('drop', {
      priority: 15,
      init() {
        customInitCalled = true;
      },
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [] }');
    const el = document.createElement('div');
    el.setAttribute('drop', 'items');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    expect(customInitCalled).toBe(true);
  });

  test('cannot override a core directive without removeCoreDirective first', () => {
    // "validate" is still registered as a core stub — attempting to override should warn
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let overrideCalled = false;
    registerDirective('validate', {
      priority: 30,
      init() {
        overrideCalled = true;
      },
    });

    // The override should have been blocked
    const overrideWarns = warnSpy.mock.calls.filter(
      (c) => c.some((arg) => typeof arg === 'string' && arg.includes('Cannot override core directive'))
    );
    expect(overrideWarns.length).toBeGreaterThan(0);
    warnSpy.mockRestore();

    // Process an element — should still use the stub, not the override
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const input = document.createElement('input');
    input.setAttribute('validate', 'required');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);
    expect(overrideCalled).toBe(false);
  });
});
