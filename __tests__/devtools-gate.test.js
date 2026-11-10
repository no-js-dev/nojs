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

    test('events are emitted with context ids, as in v1.21.1', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.devtools = true;
      initDevtools({ version: 'x' });
      expect(_devtoolsEnabled()).toBe(true);
      const { seen, stop } = collect();
      const parent = createContext({ email: 'alice@example.com' });
      const child = createContext({ n: 1 }, parent);
      parent.email = 'bob@example.com';
      _devtoolsEmit('custom:event', { ok: true });
      stop();
      expect(seen.map((e) => e.type)).toEqual(['ctx:created', 'ctx:created', 'ctx:updated', 'custom:event']);
      const parentId = parent.__raw.__devtoolsId;
      expect(typeof parentId).toBe('number');
      expect(seen[0].data).toMatchObject({ id: parentId, parentId: null, keys: ['email'] });
      expect(seen[1].data).toMatchObject({ id: child.__raw.__devtoolsId, parentId });
      expect(seen[2].data).toEqual({ id: parentId, key: 'email', oldValue: 'alice@example.com', newValue: 'bob@example.com' });
    });

    test('contexts still carry __devtoolsId (JSON.stringify output unchanged)', () => {
      _config.devtools = true;
      const ctx = createContext({ a: 1 });
      expect(JSON.stringify(ctx)).toBe(`{"a":1,"__devtoolsId":${ctx.__raw.__devtoolsId}}`);
    });

    test('ctx:updated keeps the v1.21.1 substring redaction', () => {
      _config.devtools = true;
      const { seen, stop } = collect();
      const ctx = createContext({ keyboard: 'qwerty', user: { token: 'nested' } });
      const user = ctx.user;
      ctx.keyboard = 'dvorak';
      ctx.user = { token: 'other' };
      stop();
      const updates = seen.filter((e) => e.type === 'ctx:updated');
      expect(updates[0].data).toMatchObject({ key: 'keyboard', oldValue: '[REDACTED]', newValue: '[REDACTED]' });
      expect(updates[1].data.oldValue).toBe(user);
      expect(updates[1].data.newValue).toEqual({ token: 'other' });
    });

    test('the unreachable context registry does not retain contexts', () => {
      _config.devtools = true;
      for (let i = 0; i < 1000; i++) createContext({ i });
      expect(_ctxRegistry.size).toBe(0);
    });

    test('devtools: false still emits nothing and registers nothing', () => {
      const { seen, stop } = collect();
      const ctx = createContext({ a: 1 });
      ctx.a = 2;
      stop();
      expect(_ctxRegistry.size).toBe(0);
      expect(seen).toEqual([]);
      expect('__devtoolsId' in ctx.__raw).toBe(false);
    });
  });

  describe('strictDevtools: true', () => {
    test('devtools: true is a no-op: no ids, no context registry and no nojs:devtools events', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.devtools = true;
      _config.strictDevtools = true;
      const { seen, stop } = collect();
      expect(_devtoolsEnabled()).toBe(false);
      initDevtools({ version: 'x' });
      expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('devtools: true is ignored outside local environments'));
      const ctx = createContext({ email: 'alice@example.com' });
      ctx.email = 'bob@example.com';
      _devtoolsEmit('custom:event', { ok: true });
      stop();
      expect(_ctxRegistry.size).toBe(0);
      expect(seen).toEqual([]);
      expect(JSON.stringify(ctx)).toBe('{"email":"bob@example.com"}');
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
