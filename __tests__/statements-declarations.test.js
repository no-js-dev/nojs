/**
 * const / let in statement handlers (nojs#350).
 *
 * Declarations create handler-local bindings: visible to the following
 * statements of the same handler, never written back to state, and gone
 * when the handler returns. Reassigning a const throws (reported through the
 * normal expression-error path). Unsupported forms (destructuring) fail
 * loudly instead of being dropped.
 */

import { createContext } from '../src/context.js';
import { _execStatement, _stmtCache, parseStatements } from '../src/evaluate.js';

let warnSpy;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

function warned(fragment) {
  return warnSpy.mock.calls.some((args) => args.join(' ').includes(fragment));
}

describe('issue repro lines', () => {
  test('const m = items.splice(0,1)[0]; items.splice(2,0,m)', () => {
    const ctx = createContext({ items: ['a', 'b', 'c'] });
    _execStatement('const m = items.splice(0,1)[0]; items.splice(2,0,m)', ctx);
    expect(ctx.items).toEqual(['b', 'c', 'a']);
    expect('m' in ctx.__raw).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('const m = items[0]; items.splice(0,1); items.splice(2,0,m)', () => {
    const ctx = createContext({ items: ['a', 'b', 'c'] });
    _execStatement('const m = items[0]; items.splice(0,1); items.splice(2,0,m)', ctx);
    expect(ctx.items).toEqual(['b', 'c', 'a']);
    expect('m' in ctx.__raw).toBe(false);
  });
});

describe('handler-local bindings', () => {
  test('let can be reassigned and stays local', () => {
    const ctx = createContext({ total: 0 });
    _execStatement('let x = 2; x = x * 5; x += 1; total = x', ctx);
    expect(ctx.total).toBe(11);
    expect('x' in ctx.__raw).toBe(false);
  });

  test('let without initializer is undefined', () => {
    const ctx = createContext({ out: 'unset' });
    _execStatement('let x; out = typeof x', ctx);
    expect(ctx.out).toBe('undefined');
  });

  test('multiple declarators, commas inside initializers preserved', () => {
    const ctx = createContext({ out: null });
    _execStatement('const a = [1, 2], b = Math.max(3, 4); out = a.length + b', ctx);
    expect(ctx.out).toBe(6);
    expect('a' in ctx.__raw).toBe(false);
    expect('b' in ctx.__raw).toBe(false);
  });

  test('a local shadowing a state key does not overwrite state', () => {
    const ctx = createContext({ count: 1, out: 0 });
    _execStatement('const count = 100; out = count', ctx);
    expect(ctx.out).toBe(100);
    expect(ctx.count).toBe(1);
  });

  test('a local shadowing a parent context key does not overwrite it', () => {
    const parent = createContext({ name: 'parent' });
    const child = createContext({ out: '' }, parent);
    _execStatement("let name = 'local'; out = name", child);
    expect(child.out).toBe('local');
    expect(parent.name).toBe('parent');
  });

  test('locals do not persist between runs', () => {
    const ctx = createContext({ out: null });
    _execStatement('const v = 7; out = v', ctx);
    _execStatement('out = typeof v', ctx);
    expect(ctx.out).toBe('undefined');
  });

  test('mutating an object through a const alias notifies state', () => {
    const ctx = createContext({ todo: { done: false } });
    const seen = [];
    ctx.$watch(() => seen.push(ctx.todo.done));
    _execStatement('const t = todo; t.done = true', ctx);
    expect(ctx.todo.done).toBe(true);
    expect(seen).toContain(true);
  });

  test('undeclared assignment still creates state (unchanged behaviour)', () => {
    const ctx = createContext({ items: ['a', 'b', 'c'] });
    _execStatement('m = items.splice(0,1)[0]; items.splice(2,0,m)', ctx);
    expect(ctx.items).toEqual(['b', 'c', 'a']);
    expect(ctx.m).toBe('a');
  });

  test('a state key named let still works as an identifier', () => {
    const ctx = createContext({ let: 1 });
    _execStatement('let = let + 1', ctx);
    expect(ctx.let).toBe(2);
  });
});

describe('errors are loud, never silent', () => {
  test('reassigning a const throws and aborts the handler (no state writes apply)', () => {
    const ctx = createContext({ out: 0 });
    _execStatement('const c = 1; out = 5; c = 2; out = 9', ctx);
    expect(ctx.out).toBe(0);
    expect(warned('Assignment to constant variable')).toBe(true);
  });

  test('incrementing a const throws', () => {
    const ctx = createContext({ out: 0 });
    _execStatement('const c = 1; c++; out = c', ctx);
    expect(ctx.out).toBe(0);
    expect(warned('Assignment to constant variable')).toBe(true);
  });

  test('const without initializer is a syntax error', () => {
    const ctx = createContext({ out: 0 });
    _execStatement('const c; out = 1', ctx);
    expect(ctx.out).toBe(0);
    expect(warned('Missing initializer')).toBe(true);
  });

  test('redeclaration is a syntax error', () => {
    const ctx = createContext({ out: 0 });
    _execStatement('let a = 1; let a = 2; out = a', ctx);
    expect(ctx.out).toBe(0);
    expect(warned("Identifier 'a' has already been declared")).toBe(true);
  });

  test('destructuring is rejected with a warning naming the statement', () => {
    const ctx = createContext({ items: ['a', 'b'], out: null });
    _execStatement('const [x] = items; out = x', ctx);
    expect(ctx.out).toBe(null);
    expect(warned('const [x] = items')).toBe(true);
    expect(warned('no destructuring')).toBe(true);
  });

  test('errors dispatch nojs:error on the handler element', () => {
    const el = document.createElement('button');
    const handler = jest.fn();
    el.addEventListener('nojs:error', handler);
    _execStatement('const c = 1; c = 2', createContext({}), { $el: el });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('declaring a $-prefixed or forbidden name is rejected', () => {
    const ctx = createContext({ out: 0 });
    _execStatement('const $x = 1; out = 1', ctx);
    _execStatement('let constructor = 1; out = 2', ctx);
    expect(ctx.out).toBe(0);
    expect(warned('invalid const declaration name "$x"')).toBe(true);
    expect(warned('invalid let declaration name "constructor"')).toBe(true);
  });
});

describe('compiler-support parseStatements mirrors the runtime', () => {
  test('still returns plain expression nodes', () => {
    const stmts = parseStatements('count = 1; count++');
    expect(stmts.map((s) => s.type)).toEqual(['AssignExpr', 'PostfixExpr']);
  });

  test('const/let statements come back as VarDecl, not Identifier(const)', () => {
    const stmts = parseStatements('const m = items.splice(0, 1)[0]; let a = 1, b; items.splice(2, 0, m)');
    expect(stmts.map((s) => s.type)).toEqual(['VarDecl', 'VarDecl', 'CallExpr']);
    expect(stmts[0].kind).toBe('const');
    expect(stmts[0].declarations).toHaveLength(1);
    expect(stmts[0].declarations[0].name).toBe('m');
    expect(stmts[0].declarations[0].init.type).toBe('MemberExpr');
    expect(stmts[1]).toEqual({
      type: 'VarDecl',
      kind: 'let',
      declarations: [
        { name: 'a', init: { type: 'Literal', value: 1 } },
        { name: 'b', init: null },
      ],
    });
  });

  test('matches the runtime statement cache node for node', () => {
    const src = 'const n = list.length; total = n * 2; let x';
    const ctx = createContext({ list: [1, 2], total: 0 });
    _execStatement(src, ctx);
    expect(ctx.total).toBe(4);
    expect(parseStatements(src)).toEqual([..._stmtCache.get(src)]);
  });

  test('`let` alone stays an identifier', () => {
    expect(parseStatements('let')[0]).toEqual({ type: 'Identifier', name: 'let' });
  });

  test('returns a plain array', () => {
    const stmts = parseStatements('const a = 1');
    expect(Object.keys(stmts)).toEqual(['0']);
  });

  test('invalid declarations throw like the runtime', () => {
    expect(() => parseStatements('const a')).toThrow(SyntaxError);
    expect(() => parseStatements('const [a] = list')).toThrow(/destructuring/);
    expect(() => parseStatements('const a = 1; let a = 2')).toThrow(/already been declared/);
  });
});
