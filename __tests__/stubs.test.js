// ═══════════════════════════════════════════════════════════════════════
//  STUB DIRECTIVE SMOKE TESTS
//  Verifies that DnD and validate deprecation stubs register, warn, and
//  don't crash when processed on real DOM elements.
// ═══════════════════════════════════════════════════════════════════════

import { _warn } from '../src/globals.js';
import { processTree } from '../src/registry.js';

import '../src/directives/state.js';
import '../src/directives/dnd-stub.js';
import '../src/directives/validate-stub.js';

// Mock _warn so we can assert on it without console noise
jest.mock('../src/globals.js', () => {
  const actual = jest.requireActual('../src/globals.js');
  return {
    ...actual,
    _warn: jest.fn(actual._warn),
  };
});

describe('DnD deprecation stubs', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    _warn.mockClear();
  });

  const DND_DIRECTIVES = ['drag', 'drop', 'drag-list', 'drag-multiple'];

  test.each(DND_DIRECTIVES)(
    '"%s" stub registers and emits deprecation warning on init',
    (name) => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ items: [] }');
      const el = document.createElement('div');
      el.setAttribute(name, 'items');
      parent.appendChild(el);
      document.body.appendChild(parent);

      processTree(parent);

      expect(_warn).toHaveBeenCalledWith(
        expect.stringContaining(`"${name}" has moved to @erickxavier/nojs-elements`)
      );
    }
  );

  test.each(DND_DIRECTIVES)(
    '"%s" stub does not crash or throw',
    (name) => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ x: 1 }');
      const el = document.createElement('div');
      el.setAttribute(name, 'x');
      parent.appendChild(el);
      document.body.appendChild(parent);

      expect(() => processTree(parent)).not.toThrow();
    }
  );
});

describe('Validate deprecation stub', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    _warn.mockClear();
  });

  test('"validate" stub registers and emits deprecation warning on init', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const input = document.createElement('input');
    input.setAttribute('validate', 'required');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    expect(_warn).toHaveBeenCalledWith(
      expect.stringContaining('"validate" has moved to @erickxavier/nojs-elements')
    );
  });

  test('"validate" stub does not crash or throw', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const form = document.createElement('form');
    form.setAttribute('validate', '');
    const input = document.createElement('input');
    input.setAttribute('validate', 'required');
    form.appendChild(input);
    parent.appendChild(form);
    document.body.appendChild(parent);

    expect(() => processTree(parent)).not.toThrow();
  });
});
