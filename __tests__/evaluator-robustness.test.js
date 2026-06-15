// ═══════════════════════════════════════════════════════════════════════
//  Expression evaluator — malformed-input robustness tests
//  Ensures all malformed inputs fail gracefully (return undefined or '')
//  without throwing uncaught exceptions.
// ═══════════════════════════════════════════════════════════════════════

import { createContext } from '../src/context.js';
import { evaluate, _execStatement } from '../src/evaluate.js';

function makeCtx(data = {}) {
  return createContext(data);
}

describe('Expression evaluator — malformed-input robustness', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ── Empty / null / undefined inputs ────────────────────────────────────────

  describe('empty and null inputs', () => {
    test('empty string returns undefined', () => {
      expect(evaluate('', makeCtx())).toBeUndefined();
    });

    test('null expression returns undefined', () => {
      expect(evaluate(null, makeCtx())).toBeUndefined();
    });

    test('undefined expression returns undefined', () => {
      expect(evaluate(undefined, makeCtx())).toBeUndefined();
    });

    test('whitespace-only string returns undefined', () => {
      const result = evaluate('   ', makeCtx());
      expect(result).toBeUndefined();
    });
  });

  // ── Missing operators ─────────────────────────────────────────────────────

  describe('missing operators', () => {
    test('two identifiers without operator does not throw', () => {
      expect(() => evaluate('a b', makeCtx({ a: 1, b: 2 }))).not.toThrow();
    });

    test('trailing operator returns undefined gracefully', () => {
      const result = evaluate('1 +', makeCtx());
      // Should not throw — result is NaN or undefined
      expect(result === undefined || Number.isNaN(result) || result === 1).toBe(true);
    });

    test('leading operator does not throw', () => {
      expect(() => evaluate('+ 5', makeCtx())).not.toThrow();
    });

    test('double operators do not throw', () => {
      expect(() => evaluate('1 ++ ++ 2', makeCtx())).not.toThrow();
    });
  });

  // ── Unclosed brackets / parentheses ───────────────────────────────────────

  describe('unclosed delimiters', () => {
    test('unclosed parenthesis does not throw', () => {
      expect(() => evaluate('(1 + 2', makeCtx())).not.toThrow();
    });

    test('unclosed bracket does not throw', () => {
      expect(() => evaluate('arr[0', makeCtx({ arr: [1, 2, 3] }))).not.toThrow();
    });

    test('unclosed curly brace does not throw', () => {
      expect(() => evaluate('{ a: 1', makeCtx())).not.toThrow();
    });

    test('unclosed string (single quote) does not throw', () => {
      expect(() => evaluate("'hello", makeCtx())).not.toThrow();
    });

    test('unclosed string (double quote) does not throw', () => {
      expect(() => evaluate('"hello', makeCtx())).not.toThrow();
    });

    test('unclosed template literal does not throw', () => {
      expect(() => evaluate('`hello ${name', makeCtx({ name: 'world' }))).not.toThrow();
    });

    test('extra closing parenthesis does not throw', () => {
      expect(() => evaluate('(1 + 2))', makeCtx())).not.toThrow();
    });

    test('extra closing bracket does not throw', () => {
      expect(() => evaluate('arr[0]]', makeCtx({ arr: [1] }))).not.toThrow();
    });
  });

  // ── Deeply nested expressions ─────────────────────────────────────────────

  describe('deeply nested expressions', () => {
    test('deeply nested parentheses (50 levels) does not throw', () => {
      const open = '('.repeat(50);
      const close = ')'.repeat(50);
      const expr = open + '1' + close;
      expect(() => evaluate(expr, makeCtx())).not.toThrow();
      expect(evaluate(expr, makeCtx())).toBe(1);
    });

    test('deeply nested ternary (20 levels) does not throw', () => {
      // true ? true ? true ? ... 1 : 0 ... : 0 : 0
      let expr = '1';
      for (let i = 0; i < 20; i++) {
        expr = `true ? ${expr} : 0`;
      }
      expect(() => evaluate(expr, makeCtx())).not.toThrow();
      expect(evaluate(expr, makeCtx())).toBe(1);
    });

    test('deeply nested member access does not throw', () => {
      const expr = 'a.b.c.d.e.f.g.h.i.j.k';
      const result = evaluate(expr, makeCtx({ a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 42 } } } } } } } } } } }));
      expect(result).toBe(42);
    });

    test('deeply nested optional chaining on null returns undefined', () => {
      const expr = 'a?.b?.c?.d?.e?.f?.g';
      expect(evaluate(expr, makeCtx({ a: null }))).toBeUndefined();
    });
  });

  // ── Extremely long expressions ────────────────────────────────────────────

  describe('extremely long expressions', () => {
    test('long addition chain (500 terms) does not throw', () => {
      const terms = Array.from({ length: 500 }, () => '1').join(' + ');
      expect(() => evaluate(terms, makeCtx())).not.toThrow();
      expect(evaluate(terms, makeCtx())).toBe(500);
    });

    test('very long string literal does not throw', () => {
      const longStr = "'x".padEnd(2001, 'x') + "'";
      expect(() => evaluate(longStr, makeCtx())).not.toThrow();
    });

    test('many pipe filters chained does not throw', () => {
      // Only works if filters exist; with unknown filters it warns but doesn't throw
      const expr = 'name | uppercase | uppercase | uppercase | uppercase | uppercase';
      expect(() => evaluate(expr, makeCtx({ name: 'test' }))).not.toThrow();
    });
  });

  // ── Adversarial inputs ────────────────────────────────────────────────────

  describe('adversarial inputs', () => {
    test('prototype pollution attempt via __proto__ returns undefined', () => {
      expect(evaluate('__proto__', makeCtx())).toBeUndefined();
    });

    test('constructor access returns undefined', () => {
      expect(evaluate('constructor', makeCtx())).toBeUndefined();
    });

    test('prototype access returns undefined', () => {
      expect(evaluate('prototype', makeCtx())).toBeUndefined();
    });

    test('__proto__ member access returns undefined', () => {
      const ctx = makeCtx({ obj: {} });
      expect(evaluate('obj.__proto__', ctx)).toBeUndefined();
    });

    test('constructor member access returns undefined', () => {
      const ctx = makeCtx({ obj: {} });
      expect(evaluate('obj.constructor', ctx)).toBeUndefined();
    });

    test('null dereference does not throw', () => {
      expect(() => evaluate('x.y.z', makeCtx())).not.toThrow();
      expect(evaluate('x.y.z', makeCtx())).toBeUndefined();
    });

    test('calling non-function does not throw', () => {
      expect(() => evaluate('name()', makeCtx({ name: 'hello' }))).not.toThrow();
      expect(evaluate('name()', makeCtx({ name: 'hello' }))).toBeUndefined();
    });

    test('spread of non-iterable does not throw', () => {
      expect(() => evaluate('[...x]', makeCtx({ x: 42 }))).not.toThrow();
    });

    test('division by zero returns Infinity', () => {
      expect(evaluate('1 / 0', makeCtx())).toBe(Infinity);
    });

    test('modulo by zero returns NaN', () => {
      expect(evaluate('1 % 0', makeCtx())).toBeNaN();
    });

    test('eval attempt returns undefined (not in allow-list)', () => {
      expect(evaluate('eval("1+1")', makeCtx())).toBeUndefined();
    });

    test('Function constructor attempt returns undefined', () => {
      expect(evaluate('Function("return 1")()', makeCtx())).toBeUndefined();
    });

    test('only special characters does not throw', () => {
      expect(() => evaluate('!@#$%^&*()', makeCtx())).not.toThrow();
    });

    test('newline characters in expression do not throw', () => {
      expect(() => evaluate('1 +\n2', makeCtx())).not.toThrow();
      expect(evaluate('1 +\n2', makeCtx())).toBe(3);
    });

    test('tab characters in expression do not throw', () => {
      expect(() => evaluate('1\t+\t2', makeCtx())).not.toThrow();
      expect(evaluate('1\t+\t2', makeCtx())).toBe(3);
    });
  });

  // ── _execStatement robustness ─────────────────────────────────────────────

  describe('_execStatement robustness', () => {
    test('empty statement does not throw', () => {
      const ctx = makeCtx({ x: 1 });
      expect(() => _execStatement('', ctx)).not.toThrow();
    });

    test('multiple semicolons (empty statements) do not throw', () => {
      const ctx = makeCtx({ x: 1 });
      expect(() => _execStatement(';;;', ctx)).not.toThrow();
    });

    test('malformed assignment does not throw', () => {
      const ctx = makeCtx({ x: 1 });
      expect(() => _execStatement('= 5', ctx)).not.toThrow();
    });

    test('undefined function call in statement context warns', () => {
      const ctx = makeCtx({});
      // Should dispatch error but not crash the page
      expect(() => _execStatement('nonExistentFn()', ctx, { $el: document.createElement('div') })).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
