/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://app.example.com/"}
 */
import { _config, _stores } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { _ctxRegistry, _devtoolsEmit, _devtoolsEnabled, initDevtools, _isLocalHostname } from '../src/devtools.js';

function collect() {
  const seen = [];
  const onEvent = (e) => seen.push(e.detail);
  window.addEventListener('nojs:devtools', onEvent);
  return { seen, stop: () => window.removeEventListener('nojs:devtools', onEvent) };
}

describe('devtools on a non-local host', () => {
  afterEach(() => {
    _config.devtools = false;
    _config.strictDevtools = false;
    _ctxRegistry.clear();
    for (const key of Object.keys(_stores)) delete _stores[key];
    delete window.__NOJS_DEVTOOLS__;
    jest.restoreAllMocks();
  });

  test('the jsdom location is a non-local hostname', () => {
    expect(window.location.hostname).toBe('app.example.com');
    expect(_isLocalHostname()).toBe(false);
  });

  describe('default (v1.21.1): only initDevtools is gated', () => {
    test('initDevtools warns and does not expose window.__NOJS_DEVTOOLS__', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.devtools = true;
      initDevtools({ version: 'x' });
      expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('devtools: true is ignored outside local environments'));
    });

    test('events are emitted and the context registry populates', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.devtools = true;
      initDevtools({ version: 'x' });
      expect(_devtoolsEnabled()).toBe(true);
      const { seen, stop } = collect();
      const ctx = createContext({ email: 'alice@example.com' });
      ctx.email = 'bob@example.com';
      _devtoolsEmit('custom:event', { ok: true });
      stop();
      expect(_ctxRegistry.size).toBe(1);
      expect(seen.map((e) => e.type)).toEqual(['ctx:created', 'ctx:updated', 'custom:event']);
      expect(seen[1].data).toMatchObject({ key: 'email', oldValue: 'alice@example.com', newValue: 'bob@example.com' });
    });

    test('devtools: false still emits nothing and registers nothing', () => {
      const { seen, stop } = collect();
      const ctx = createContext({ a: 1 });
      ctx.a = 2;
      stop();
      expect(_ctxRegistry.size).toBe(0);
      expect(seen).toEqual([]);
    });
  });

  describe('strictDevtools: true', () => {
    test('devtools: true is a no-op: no context registry and no nojs:devtools events', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.devtools = true;
      _config.strictDevtools = true;
      const { seen, stop } = collect();
      expect(_devtoolsEnabled()).toBe(false);
      initDevtools({ version: 'x' });
      expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
      const ctx = createContext({ email: 'alice@example.com' });
      ctx.email = 'bob@example.com';
      _devtoolsEmit('custom:event', { ok: true });
      stop();
      expect(_ctxRegistry.size).toBe(0);
      expect(seen).toEqual([]);
    });

    test('toggling strictDevtools off restores emission', () => {
      _config.devtools = true;
      _config.strictDevtools = true;
      expect(_devtoolsEnabled()).toBe(false);
      _config.strictDevtools = false;
      expect(_devtoolsEnabled()).toBe(true);
    });
  });
});
