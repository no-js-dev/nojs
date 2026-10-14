/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://app.example.com/"}
 */
// v1.21.1 compatibility (unit level), #370: with devtools: true on a
// non-local host, v1.21.1 still emits nojs:devtools events and registers
// contexts (only the command listener / window.__NOJS_DEVTOOLS__ are gated).
// See __tests__/compat-v1-21.test.js for the rest of the suite.

import { _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { _ctxRegistry } from '../src/devtools.js';

describe('compat v1.21.1 — devtools on a non-local host (#370)', () => {
  afterEach(() => {
    _config.devtools = false;
    _ctxRegistry.clear();
  });

  test('contexts are registered and ctx:created / ctx:updated events are emitted', () => {
    expect(window.location.hostname).toBe('app.example.com');
    _config.devtools = true;
    const events = [];
    const onEvent = (e) => events.push(e.detail);
    window.addEventListener('nojs:devtools', onEvent);

    const ctx = createContext({ count: 0 });
    ctx.count = 1;
    window.removeEventListener('nojs:devtools', onEvent);

    expect(_ctxRegistry.size).toBe(1);
    const created = events.find((e) => e.type === 'ctx:created');
    expect(created).toBeDefined();
    expect(typeof created.data.id).toBe('number');
    expect(_ctxRegistry.get(created.data.id)).toBe(ctx);
    const updated = events.find((e) => e.type === 'ctx:updated');
    expect(updated.data).toMatchObject({ id: created.data.id, key: 'count', oldValue: 0, newValue: 1 });
  });
});
