/**
 * The expression parser is lenient: tokens it cannot place are dropped and an
 * `=` where an operand belongs is skipped. Results stay exactly as before;
 * what was dropped is now reported with one console warning per expression
 * (Core rule 8 — never fail silently), at parse time, not on every run.
 */

import { createContext } from '../src/context.js';
import { evaluate, _execStatement, parseExpression, parseStatements } from '../src/evaluate.js';
import { _stores } from '../src/globals.js';
import '../src/filters.js';

let warnSpy;
let n = 0;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  n++;
});
afterEach(() => {
  warnSpy.mockRestore();
});

const warnings = () => warnSpy.mock.calls.map((args) => args.join(' '));
const warned = (fragment) => warnings().some((w) => w.includes(fragment));

// Expressions are cached and warned once per string; a unique suffix keeps
// each test independent of the others.
const uniq = (s) => `${s}; __u${n} = 0`;

describe('assignment inside a ternary branch or &&/|| operand', () => {
  const cases = [
    'c ? a = 1 : null',
    'c ? (a = 1) : null',
    'c ? a = 1 : b = 2',
    'c && (a = 1)',
    'c && a = 1',
    'c || (a = 1)',
    'x ? (a = 1) : (a = 0)',
    'c ? a++ : null',
    'c && a++',
    'c && --a',
  ];
  test.each(cases)('%s — warns, state unchanged', (expr) => {
    const ctx = createContext({ c: true, x: true, a: 0, b: 0 });
    _execStatement(uniq(expr), ctx, {});
    expect(ctx.a).toBe(0);
    expect(ctx.b).toBe(0);
    expect(warned('assignment is ignored')).toBe(true);
    expect(warned('a = cond ? x : y')).toBe(true);
  });

  test('store targets warn too and are not written', () => {
    _stores.s = { x: 0 };
    const ctx = createContext({ c: true });
    _execStatement(uniq('c ? $store.s.x = 1 : null'), ctx, {});
    _execStatement(uniq('c && ($store.s.x = 2)'), ctx, {});
    expect(_stores.s.x).toBe(0);
    expect(warnings().filter((w) => w.includes('assignment is ignored'))).toHaveLength(2);
    delete _stores.s;
  });

  test('working forms stay silent', () => {
    const ctx = createContext({ c: true, a: 0, fn: jest.fn() });
    _execStatement(uniq('a = c ? 1 : 2'), ctx, {});
    _execStatement(uniq('c ? fn() : null'), ctx, {});
    _execStatement(uniq('a++'), ctx, {});
    expect(ctx.a).toBe(2);
    expect(ctx.fn).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('leftover tokens', () => {
  test('comma operator — first assignment applies, rest ignored, warns once', () => {
    const ctx = createContext({ a: 0, b: 0 });
    const expr = `a = 1, b = 2 /*${n}*/`.replace(/\/\*.*\*\//, '') + ` `.repeat(n);
    _execStatement(expr, ctx, {});
    _execStatement(expr, ctx, {});
    expect(ctx.a).toBe(1);
    expect(ctx.b).toBe(0);
    const hits = warnings().filter((w) => w.includes('comma operator is not supported'));
    expect(hits).toHaveLength(1);
  });

  test('parenthesized comma', () => {
    const ctx = createContext({ a: 0, b: 0 });
    _execStatement(uniq('(a = 1, b = 2)'), ctx, {});
    expect(ctx.a).toBe(1);
    expect(ctx.b).toBe(0);
    expect(warned('comma operator')).toBe(true);
  });

  test('evaluate keeps the partial result and warns once per expression', () => {
    const ctx = createContext({ a: 2, b: 3 });
    const expr = `a b${' '.repeat(n)}`;
    expect(evaluate(expr, ctx)).toBe(2);
    expect(evaluate(expr, ctx)).toBe(2);
    const hits = warnings().filter((w) => w.includes('unexpected "b"'));
    expect(hits).toHaveLength(1);
  });

  test('leftover inside a template literal', () => {
    const ctx = createContext({ a: 1, b: 2 });
    expect(evaluate('`${a b}`' + ' '.repeat(n), ctx)).toBe('1');
    expect(warned('unexpected "b"')).toBe(true);
  });

  test('leftover inside a const initializer', () => {
    const ctx = createContext({ out: 0 });
    _execStatement(uniq('const v = (1, 2); out = v'), ctx, {});
    expect(ctx.out).toBe(1);
    expect(warned('comma operator')).toBe(true);
  });

  test('chained comparison', () => {
    const ctx = createContext({ a: 1, b: 2, c: true });
    expect(evaluate('a < b == c' + ' '.repeat(n), ctx)).toBe(true);
    expect(warned('unexpected "=="')).toBe(true);
  });
});

describe('statement keywords', () => {
  test('if block — runtime error names the unsupported statement', () => {
    const ctx = createContext({ x: true, a: 0 });
    _execStatement(uniq('if (x) { a = 1 }'), ctx, {});
    expect(ctx.a).toBe(0);
    const hits = warnings().filter((w) => w.includes('"if" statements are not supported'));
    expect(hits).toHaveLength(1);
    expect(warned('if is not defined')).toBe(false);
  });

  test('if block still dispatches nojs:error', () => {
    const el = document.createElement('button');
    const onError = jest.fn();
    el.addEventListener('nojs:error', onError);
    _execStatement(uniq('if (x) a = 1'), createContext({ x: true, a: 0 }), { $el: el });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].detail.message).toContain('"if" statements are not supported');
  });

  test.each([
    ['return x', 'return'],
    ['for (i in list) { a = 1 }', 'for'],
    ['throw new Error("x")', 'throw'],
    ['do { a = 1 } while (x)', 'do'],
    ['var z = 1', 'var'],
    ['break', 'break'],
  ])('%s — warns about "%s"', (expr, kw) => {
    const ctx = createContext({ x: 1, list: [], a: 0 });
    _execStatement(uniq(expr), ctx, {});
    expect(warned(`"${kw}" statements are not supported`)).toBe(true);
  });

  test('assignment in a binding (expression context)', () => {
    const ctx = createContext({ a: 1 });
    expect(evaluate('a = 5' + ' '.repeat(n), ctx)).toBe(5);
    expect(ctx.a).toBe(1);
    expect(warned('assignment is ignored')).toBe(true);
  });

  test('new', () => {
    const ctx = createContext({});
    expect(evaluate('new Date()' + ' '.repeat(n), ctx)).toBeUndefined();
    expect(warned('"new" is not supported in expressions')).toBe(true);
  });

  test('keyword-named state keys and methods stay silent', () => {
    const del = jest.fn();
    const ctx = createContext({ delete: del, new: { x: 1 }, class: 'c', item: 3 });
    _execStatement(uniq('delete(item)'), ctx, {});
    expect(del).toHaveBeenCalledWith(3);
    expect(evaluate('new.x' + ' '.repeat(n), ctx)).toBe(1);
    expect(evaluate("class + '-x'" + ' '.repeat(n), ctx)).toBe('c-x');
    expect(evaluate('class' + ' '.repeat(n), ctx)).toBe('c');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('valid expressions stay silent', () => {
  const exprs = [
    'a + b * 2',
    'user?.name ?? "anon"',
    'list.filter(x => x > 1).map((x, i) => x + i)',
    '{ a: 1, b: [1, 2, { c: 3 }], ...rest }',
    '`${a} and ${b}`',
    'a ? b : c ? 1 : 2',
    'typeof a === "number" && !b',
    "'k' in obj",
    '[...list, 4]',
    'fn(a, b)',
    'a | uppercase',
    'price | currency:\'EUR\'',
  ];
  test.each(exprs)('%s', (expr) => {
    const ctx = createContext({ a: 1, b: 2, c: 3, user: null, list: [1, 2], rest: {}, obj: { k: 1 }, fn: () => 1, price: 2 });
    evaluate(expr, ctx);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  const stmts = [
    'count++; name = "x"',
    'items.push(val); count += 1; done = true',
    'const m = items.splice(0, 1)[0]; items.splice(2, 0, m)',
    'let a = 1, b = 2; total = a + b',
    'obj.k = obj.k ? 0 : 1',
    'open = !open',
    'c ? fn() : null',
    'list = list.filter(x => x !== 1)',
  ];
  test.each(stmts)('statement %s', (expr) => {
    const ctx = createContext({ count: 0, name: '', items: [1, 2, 3], val: 4, done: false, total: 0, obj: { k: 1 }, open: false, c: true, fn: () => 1, list: [1, 2] });
    _execStatement(expr, ctx, {});
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('tooling exports stay silent', () => {
  test('parseExpression / parseStatements do not warn', () => {
    parseExpression('a = 1, b = 2');
    parseExpression('c ? a = 1 : null');
    parseStatements('if (x) { a = 1 }; a = 1, b = 2');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
