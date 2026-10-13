/**
 * _FORBIDDEN_PROPS must match only its own names (`__proto__`, `constructor`,
 * `prototype`), not inherited Object.prototype members (`toString`,
 * `hasOwnProperty`, ...) and not data fields named `alert` / `confirm` /
 * `prompt`. Both engines are exercised; statements use the interpreter.
 */

import { createContext } from '../src/context.js';
import { evaluate, _evaluateInterpreted, _execStatement, resolve } from '../src/evaluate.js';

const engines = [['compiled', evaluate], ['interpreted', _evaluateInterpreted]];

describe.each(engines)('inherited Object.prototype names (%s engine)', (_n, ev) => {
  const make = () => createContext({
    n: 3.14159, big: 1234.5, d: new Date(0), o: { a: 1 }, name: 'x',
    m: { toString: 'ts', valueOf: 3 },
  });

  // NOJS-EVAL-005 — flipped to test() by the fix commit
  test.failing('(5).toString() and number/string toString()', () => {
    expect(ev('(5).toString()', make())).toBe('5');
    expect(ev('big.toString()', make())).toBe('1234.5');
    expect(ev('name.toString()', make())).toBe('x');
  });

  // NOJS-EVAL-005 — flipped to test() by the fix commit
  test.failing('toLocaleString is callable on numbers and dates', () => {
    expect(ev('big.toLocaleString("en-US")', make())).toBe('1,234.5');
    expect(typeof ev('d.toLocaleString()', make())).toBe('string');
  });

  // NOJS-EVAL-005 — flipped to test() by the fix commit
  test.failing('hasOwnProperty and valueOf are callable', () => {
    expect(ev('o.hasOwnProperty("a")', make())).toBe(true);
    expect(ev('o.hasOwnProperty("zz")', make())).toBe(false);
    expect(ev('d.valueOf()', make())).toBe(0);
  });

  // NOJS-EVAL-005 — flipped to test() by the fix commit
  test.failing('own data fields named like Object.prototype members are readable', () => {
    expect(ev('m.toString', make())).toBe('ts');
    expect(ev('m["valueOf"]', make())).toBe(3);
  });

  test('control: toFixed still works', () => {
    expect(ev('n.toFixed(2)', make())).toBe('3.14');
  });
});

// NOJS-EVAL-005 — flipped to test() by the fix commit
test.failing('resolve() and statement write-back accept Object.prototype names', () => {
  const ctx = createContext({ o: { valueOf: 3 } });
  expect(resolve('o.valueOf', ctx)).toBe(3);
  const c2 = createContext({});
  _execStatement('valueOf = 1', c2, {});
  expect(c2.valueOf).toBe(1);
});

describe.each(engines)('data fields named alert/confirm/prompt (%s engine)', (_n, ev) => {
  const make = () => createContext({ cfg: { confirm: true, prompt: 'p', alert: 'a' }, k: 'confirm' });

  // NOJS-EVAL-006 — flipped to test() by the fix commit
  test.failing('read via dot, literal computed and runtime computed', () => {
    expect(ev('cfg.confirm', make())).toBe(true);
    expect(ev('cfg.prompt', make())).toBe('p');
    expect(ev('cfg["alert"]', make())).toBe('a');
    expect(ev('cfg[k]', make())).toBe(true);
    expect(ev('cfg?.[k]', make())).toBe(true);
  });

  // NOJS-EVAL-006 — flipped to test() by the fix commit
  test.failing('object literals keep these keys', () => {
    expect(ev('{ confirm: 1, prompt: 2 }', make())).toEqual({ confirm: 1, prompt: 2 });
    expect(ev('{ ...cfg }', make())).toEqual({ confirm: true, prompt: 'p', alert: 'a' });
  });
});

// NOJS-EVAL-006 — flipped to test() by the fix commit
test.failing('data fields named alert/confirm/prompt are writable', () => {
  const ctx = createContext({ cfg: { confirm: true } });
  _execStatement('cfg.confirm = false', ctx, {});
  expect(ctx.cfg.confirm).toBe(false);
  _execStatement('cfg["prompt"] = "x"', ctx, {});
  expect(ctx.cfg.prompt).toBe('x');
});

describe.each(engines)('dangerous names stay blocked (%s engine)', (_n, ev) => {
  const make = () => createContext({ o: { a: 1 }, k: 'constructor', p: '__proto__', arr: ['constructor'] });

  test('dot, computed literal and runtime computed reads', () => {
    expect(ev('o.constructor', make())).toBeUndefined();
    expect(ev('o.__proto__', make())).toBeUndefined();
    expect(ev('o["constructor"]', make())).toBeUndefined();
    expect(ev('o["__proto__"]', make())).toBeUndefined();
    expect(ev('o[k]', make())).toBeUndefined();
    expect(ev('o[p]', make())).toBeUndefined();
    expect(ev('o[arr]', make())).toBeUndefined(); // coerces to "constructor"
    expect(ev('o?.[k]', make())).toBeUndefined();
    expect(ev('o.constructor.prototype', make())).toBeUndefined();
    expect(ev('Object.prototype', make())).toBeUndefined();
  });

  test('calls through blocked names', () => {
    expect(ev('o.constructor("x")', make())).toBeUndefined();
    expect(ev('o[k]("x")', make())).toBeUndefined();
  });

  test('object literals drop blocked keys', () => {
    expect(ev('{ constructor: 1, a: 2 }', make())).toEqual({ a: 2 });
    expect(ev('{ [k]: 1, a: 2 }', make())).toEqual({ a: 2 });
  });

  test('window alert/confirm/prompt are not reachable', () => {
    const spies = ['alert', 'confirm', 'prompt'].map((n) => jest.spyOn(window, n).mockImplementation(() => true));
    for (const n of ['alert', 'confirm', 'prompt']) {
      expect(ev(`window.${n}`, make())).toBeUndefined();
      expect(ev(`window["${n}"]`, make())).toBeUndefined();
      expect(ev(`window.${n}("x")`, make())).toBeUndefined();
    }
    spies.forEach((s) => { expect(s).not.toHaveBeenCalled(); s.mockRestore(); });
  });
});

test('statement writes to blocked names are dropped', () => {
  const ctx = createContext({ o: { a: 1 }, k: 'constructor' });
  _execStatement('o.constructor = 1', ctx, {});
  _execStatement('o[k] = 1', ctx, {});
  _execStatement('o["__proto__"] = { polluted: 1 }', ctx, {});
  expect(Object.prototype.hasOwnProperty.call(ctx.o, 'constructor')).toBe(false);
  expect(ctx.o.polluted).toBeUndefined();
  expect(({}).polluted).toBeUndefined();
});
