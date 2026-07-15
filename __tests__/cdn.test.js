// ═══════════════════════════════════════════════════════════════════════
//  CDN entry point — unit tests
//  Covers: src/cdn.js auto-init paths based on document.readyState
// ═══════════════════════════════════════════════════════════════════════

import NoJS from '../src/index.js';

describe('CDN entry point (src/cdn.js)', () => {
  const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'readyState');

  // Loads the real src/cdn.js in an isolated module registry, with
  // src/index.js mocked so init() doesn't actually run.
  function loadCdn(readyState) {
    const init = jest.fn().mockResolvedValue(undefined);
    const fakeNoJS = { init };
    Object.defineProperty(document, 'readyState', {
      value: readyState,
      configurable: true,
    });
    jest.isolateModules(() => {
      jest.doMock('../src/index.js', () => ({ __esModule: true, default: fakeNoJS }));
      require('../src/cdn.js');
    });
    return { init, fakeNoJS };
  }

  afterEach(() => {
    delete window.NoJS;
    if (origDescriptor) {
      Object.defineProperty(document, 'readyState', origDescriptor);
    } else {
      delete document.readyState;
    }
    jest.dontMock('../src/index.js');
    jest.resetModules();
  });

  test('sets window.NoJS to the framework instance', () => {
    const { fakeNoJS } = loadCdn('complete');
    expect(window.NoJS).toBe(fakeNoJS);
  });

  test('calls init() immediately when document is already loaded (readyState = "complete")', () => {
    const { init } = loadCdn('complete');
    expect(init).toHaveBeenCalledTimes(1);
  });

  test('calls init() immediately when readyState is "interactive"', () => {
    const { init } = loadCdn('interactive');
    expect(init).toHaveBeenCalledTimes(1);
  });

  test('defers init() via DOMContentLoaded when readyState is "loading"', () => {
    const { init } = loadCdn('loading');
    expect(init).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(init).toHaveBeenCalledTimes(1);
  });

  test('NoJS public API surface is correct on window.NoJS', () => {
    window.NoJS = NoJS;

    const expectedMethods = [
      'config', 'init', 'use', 'directive', 'filter', 'validator',
      'global', 'on', 'interceptor', 'dispose', 'notify', 'i18n',
    ];
    for (const method of expectedMethods) {
      expect(typeof window.NoJS[method]).toBe('function');
    }

    expect(typeof window.NoJS.version).toBe('string');
    expect(window.NoJS.CANCEL).toBeDefined();
    expect(window.NoJS.RESPOND).toBeDefined();
    expect(window.NoJS.REPLACE).toBeDefined();
  });
});
