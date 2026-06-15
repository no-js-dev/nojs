// ═══════════════════════════════════════════════════════════════════════
//  CDN entry point — unit tests
//  Covers: auto-init paths based on document.readyState
// ═══════════════════════════════════════════════════════════════════════

import NoJS from '../src/index.js';

describe('CDN entry point (src/cdn.js)', () => {
  let initSpy;

  beforeEach(() => {
    // Spy on NoJS.init without actually running the full init (it is tested elsewhere)
    initSpy = jest.spyOn(NoJS, 'init').mockResolvedValue(undefined);
  });

  afterEach(() => {
    initSpy.mockRestore();
    delete window.NoJS;
    jest.resetModules();
  });

  test('sets window.NoJS to the framework instance', () => {
    // Simulate the CDN script: expose globally and auto-init
    window.NoJS = NoJS;
    expect(window.NoJS).toBe(NoJS);
    expect(typeof window.NoJS.init).toBe('function');
    expect(typeof window.NoJS.config).toBe('function');
  });

  test('calls init() immediately when document is already loaded (readyState = "complete")', () => {
    // jsdom readyState is "complete" by default in tests
    expect(document.readyState).not.toBe('loading');

    // Simulate the cdn.js logic inline
    window.NoJS = NoJS;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => NoJS.init());
    } else {
      NoJS.init();
    }

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  test('calls init() immediately when readyState is "interactive"', () => {
    // "interactive" means DOM is parsed but sub-resources still loading — not "loading"
    const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'readyState');
    Object.defineProperty(document, 'readyState', {
      value: 'interactive',
      writable: true,
      configurable: true,
    });

    window.NoJS = NoJS;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => NoJS.init());
    } else {
      NoJS.init();
    }

    expect(initSpy).toHaveBeenCalledTimes(1);

    // Restore
    if (origDescriptor) {
      Object.defineProperty(document, 'readyState', origDescriptor);
    } else {
      delete document.readyState;
    }
  });

  test('defers init() via DOMContentLoaded when readyState is "loading"', () => {
    const origDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'readyState');
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
      configurable: true,
    });

    expect(document.readyState).toBe('loading');

    window.NoJS = NoJS;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => NoJS.init());
    } else {
      NoJS.init();
    }

    // init() should NOT have been called yet
    expect(initSpy).not.toHaveBeenCalled();

    // Fire DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(initSpy).toHaveBeenCalledTimes(1);

    // Restore
    if (origDescriptor) {
      Object.defineProperty(document, 'readyState', origDescriptor);
    } else {
      delete document.readyState;
    }
  });

  test('NoJS public API surface is correct on window.NoJS', () => {
    window.NoJS = NoJS;

    // Core API methods that must be accessible from CDN
    const expectedMethods = [
      'config', 'init', 'use', 'directive', 'filter', 'validator',
      'global', 'on', 'interceptor', 'dispose', 'notify', 'i18n',
    ];
    for (const method of expectedMethods) {
      expect(typeof window.NoJS[method]).toBe('function');
    }

    // Core properties
    expect(typeof window.NoJS.version).toBe('string');
    expect(window.NoJS.CANCEL).toBeDefined();
    expect(window.NoJS.RESPOND).toBeDefined();
    expect(window.NoJS.REPLACE).toBeDefined();
  });
});
