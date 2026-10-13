/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://app.example.com/"}
 */
import { _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { _ctxRegistry, initDevtools, _isLocalHostname } from '../src/devtools.js';

describe('devtools on a non-local host', () => {
  afterEach(() => {
    _config.devtools = false;
    _ctxRegistry.clear();
    jest.restoreAllMocks();
  });

  // NOJS-DEVT-001 — flipped to test() by the fix commit
  test.failing('devtools: true is a no-op: no context registry and no nojs:devtools events', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    _config.devtools = true;
    const seen = [];
    const onEvent = (e) => seen.push(e.detail);
    window.addEventListener('nojs:devtools', onEvent);
    expect(_isLocalHostname()).toBe(false);
    initDevtools({ version: 'x' });
    expect(window.__NOJS_DEVTOOLS__).toBeUndefined();
    const ctx = createContext({ email: 'alice@example.com' });
    ctx.email = 'bob@example.com';
    window.removeEventListener('nojs:devtools', onEvent);
    expect(_ctxRegistry.size).toBe(0);
    expect(seen).toEqual([]);
  });
});
