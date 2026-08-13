/**
 * ADR-024 — Compiler-support parser exports.
 *
 * Verifies the three public parser wrappers (parseExpression,
 * parseStatements, segmentPipes) return correct AST shapes and
 * do not pollute the runtime eval caches.
 */

import { parseExpression, parseStatements, segmentPipes } from '../src/evaluate.js';
import { evaluate, _exprCache, _stmtCache } from '../src/evaluate.js';
import { createContext } from '../src/context.js';

// ── Export existence ──────────────────────────────────────────────────

describe('parser exports exist', () => {
  test('parseExpression is a function', () => {
    expect(typeof parseExpression).toBe('function');
  });

  test('parseStatements is a function', () => {
    expect(typeof parseStatements).toBe('function');
  });

  test('segmentPipes is a function', () => {
    expect(typeof segmentPipes).toBe('function');
  });
});

// ── parseExpression ───────────────────────────────────────────────────

describe('parseExpression', () => {
  test('literal number', () => {
    const ast = parseExpression('42');
    expect(ast.type).toBe('Literal');
    expect(ast.value).toBe(42);
  });

  test('literal string', () => {
    const ast = parseExpression("'hello'");
    expect(ast.type).toBe('Literal');
    expect(ast.value).toBe('hello');
  });

  test('literal boolean', () => {
    expect(parseExpression('true')).toEqual(expect.objectContaining({ type: 'Literal', value: true }));
    expect(parseExpression('false')).toEqual(expect.objectContaining({ type: 'Literal', value: false }));
  });

  test('identifier', () => {
    const ast = parseExpression('count');
    expect(ast.type).toBe('Identifier');
    expect(ast.name).toBe('count');
  });

  test('member access (dot)', () => {
    const ast = parseExpression('user.name');
    expect(ast.type).toBe('MemberExpr');
    expect(ast.object.type).toBe('Identifier');
    expect(ast.object.name).toBe('user');
    expect(ast.property).toEqual(expect.objectContaining({ type: 'Identifier', name: 'name' }));
    expect(ast.computed).toBe(false);
  });

  test('member access (computed)', () => {
    const ast = parseExpression('items[0]');
    expect(ast.type).toBe('MemberExpr');
    expect(ast.object.name).toBe('items');
    expect(ast.computed).toBe(true);
  });

  test('optional chaining', () => {
    const ast = parseExpression('user?.address?.city');
    expect(ast.type).toBe('OptionalMemberExpr');
  });

  test('ternary / conditional', () => {
    const ast = parseExpression('a ? b : c');
    expect(ast.type).toBe('ConditionalExpr');
    expect(ast.test.type).toBe('Identifier');
  });

  test('binary expression (arithmetic)', () => {
    const ast = parseExpression('a + b');
    expect(ast.type).toBe('BinaryExpr');
    expect(ast.op).toBe('+');
    expect(ast.left.name).toBe('a');
    expect(ast.right.name).toBe('b');
  });

  test('binary expression (comparison)', () => {
    const ast = parseExpression('x === 1');
    expect(ast.type).toBe('BinaryExpr');
    expect(ast.op).toBe('===');
  });

  test('unary expression', () => {
    const ast = parseExpression('!done');
    expect(ast.type).toBe('UnaryExpr');
    expect(ast.op).toBe('!');
  });

  test('arrow function (single param)', () => {
    const ast = parseExpression('x => x * 2');
    expect(ast.type).toBe('ArrowFunction');
    expect(ast.params).toEqual(['x']);
  });

  test('arrow function (multi param)', () => {
    const ast = parseExpression('(a, b) => a + b');
    expect(ast.type).toBe('ArrowFunction');
    expect(ast.params).toEqual(['a', 'b']);
  });

  test('assignment statement', () => {
    const ast = parseExpression('count = 5');
    expect(ast.type).toBe('AssignExpr');
    expect(ast.op).toBe('=');
  });

  test('compound assignment', () => {
    const ast = parseExpression('count += 1');
    expect(ast.type).toBe('AssignExpr');
    expect(ast.op).toBe('+=');
  });

  test('postfix expression', () => {
    const ast = parseExpression('count++');
    expect(ast.type).toBe('PostfixExpr');
    expect(ast.op).toBe('++');
  });

  test('call expression', () => {
    const ast = parseExpression('items.push(val)');
    expect(ast.type).toBe('CallExpr');
  });

  test('optional call expression', () => {
    const ast = parseExpression('fn?.(x)');
    expect(ast.type).toBe('OptionalCallExpr');
  });

  test('array literal', () => {
    const ast = parseExpression('[1, 2, 3]');
    expect(ast.type).toBe('ArrayExpr');
  });

  test('object literal', () => {
    const ast = parseExpression('{ x: 1, y: 2 }');
    expect(ast.type).toBe('ObjectExpr');
  });

  test('template literal', () => {
    const ast = parseExpression('`hello ${name}`');
    expect(ast.type).toBe('TemplateLiteral');
  });

  test('in operator', () => {
    const ast = parseExpression("'key' in obj");
    expect(ast.type).toBe('BinaryExpr');
    expect(ast.op).toBe('in');
  });

  test('spread element', () => {
    const ast = parseExpression('[...items]');
    expect(ast.type).toBe('ArrayExpr');
    expect(ast.elements[0].type).toBe('SpreadElement');
  });

  test('nullish coalescing', () => {
    const ast = parseExpression('a ?? b');
    expect(ast.type).toBe('BinaryExpr');
    expect(ast.op).toBe('??');
  });

  test('logical OR / AND', () => {
    const orAst = parseExpression('a || b');
    expect(orAst.type).toBe('BinaryExpr');
    expect(orAst.op).toBe('||');

    const andAst = parseExpression('a && b');
    expect(andAst.type).toBe('BinaryExpr');
    expect(andAst.op).toBe('&&');
  });

  test('typeof', () => {
    const ast = parseExpression("typeof x");
    expect(ast.type).toBe('UnaryExpr');
    expect(ast.op).toBe('typeof');
  });

  test('nested complex expression', () => {
    const ast = parseExpression('items.filter(x => x.active).length > 0 ? "yes" : "no"');
    expect(ast.type).toBe('ConditionalExpr');
  });

  test('empty / null input returns Literal undefined', () => {
    expect(parseExpression('')).toEqual({ type: 'Literal', value: undefined });
    expect(parseExpression(null)).toEqual({ type: 'Literal', value: undefined });
    expect(parseExpression(undefined)).toEqual({ type: 'Literal', value: undefined });
  });

  test('prototype-chain access yields Forbidden nodes', () => {
    expect(parseExpression('obj.constructor').type).toBe('Forbidden');
    expect(parseExpression('obj.__proto__').type).toBe('Forbidden');
    expect(parseExpression('obj.prototype').type).toBe('Forbidden');
    expect(parseExpression('__proto__').type).toBe('Forbidden');
  });
});

// ── parseStatements ───────────────────────────────────────────────────

describe('parseStatements', () => {
  test('single statement', () => {
    const stmts = parseStatements('count++');
    expect(stmts).toHaveLength(1);
    expect(stmts[0].type).toBe('PostfixExpr');
  });

  test('multiple semicolon-separated statements', () => {
    const stmts = parseStatements("count++; name = 'x'");
    expect(stmts).toHaveLength(2);
    expect(stmts[0].type).toBe('PostfixExpr');
    expect(stmts[1].type).toBe('AssignExpr');
  });

  test('trailing semicolon does not produce empty statement', () => {
    const stmts = parseStatements('a = 1;');
    expect(stmts).toHaveLength(1);
  });

  test('empty / null input returns empty array', () => {
    expect(parseStatements('')).toEqual([]);
    expect(parseStatements(null)).toEqual([]);
    expect(parseStatements(undefined)).toEqual([]);
  });

  test('complex multi-statement', () => {
    const stmts = parseStatements("items.push(val); count += 1; done = true");
    expect(stmts).toHaveLength(3);
    expect(stmts[0].type).toBe('CallExpr');
    expect(stmts[1].type).toBe('AssignExpr');
    expect(stmts[2].type).toBe('AssignExpr');
  });
});

// ── segmentPipes ──────────────────────────────────────────────────────

describe('segmentPipes', () => {
  test('expression with no pipes', () => {
    expect(segmentPipes('user.name')).toEqual(['user.name']);
  });

  test('single pipe filter', () => {
    expect(segmentPipes('user.name | uppercase')).toEqual(['user.name', 'uppercase']);
  });

  test('multiple pipe filters', () => {
    expect(segmentPipes('price | currency | truncate:20')).toEqual([
      'price', 'currency', 'truncate:20',
    ]);
  });

  test('does not split on logical OR (||)', () => {
    expect(segmentPipes('a || b')).toEqual(['a || b']);
  });

  test('pipes inside strings are preserved', () => {
    expect(segmentPipes("'a|b' | uppercase")).toEqual(["'a|b'", 'uppercase']);
  });

  test('pipes inside template literals are preserved', () => {
    expect(segmentPipes('`${a|b}` | trim')).toEqual(['`${a|b}`', 'trim']);
  });

  test('pipes inside brackets are preserved', () => {
    expect(segmentPipes('arr[a|0] | count')).toEqual(['arr[a|0]', 'count']);
  });

  test('null input returns empty array', () => {
    expect(segmentPipes(null)).toEqual([]);
  });
});

// ── Cache safety ──────────────────────────────────────────────────────

describe('cache safety', () => {
  test('parseExpression does not populate _exprCache', () => {
    const sizeBefore = _exprCache.size;
    parseExpression('cacheTestExpr_parse_' + Date.now());
    expect(_exprCache.size).toBe(sizeBefore);
  });

  test('parseStatements does not populate _stmtCache', () => {
    const sizeBefore = _stmtCache.size;
    parseStatements('cacheTestStmt_' + Date.now() + ' = 1');
    expect(_stmtCache.size).toBe(sizeBefore);
  });

  test('evaluate still works identically after parseExpression', () => {
    parseExpression('a + b');
    parseExpression('user.name');
    parseStatements('count++; x = 1');
    segmentPipes('val | uppercase');

    const ctx = createContext({ a: 3, b: 7, user: { name: 'test' } });
    expect(evaluate('a + b', ctx)).toBe(10);
    expect(evaluate('user.name', ctx)).toBe('test');
  });
});

// ── Package entry-point reachability (ADR-024) ────────────────────────

describe('package entry-point reachability', () => {
  let entry;

  beforeAll(async () => {
    entry = await import('../src/index.js');
  });

  test('parseExpression is re-exported from the module entry', () => {
    expect(typeof entry.parseExpression).toBe('function');
  });

  test('parseStatements is re-exported from the module entry', () => {
    expect(typeof entry.parseStatements).toBe('function');
  });

  test('segmentPipes is re-exported from the module entry', () => {
    expect(typeof entry.segmentPipes).toBe('function');
  });

  test('re-exported functions are the same references as evaluate.js exports', () => {
    expect(entry.parseExpression).toBe(parseExpression);
    expect(entry.parseStatements).toBe(parseStatements);
    expect(entry.segmentPipes).toBe(segmentPipes);
  });
});
