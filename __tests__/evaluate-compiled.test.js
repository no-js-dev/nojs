/**
 * WS3 — compiled expression engine (PERF-PLAN.md).
 *
 * evaluate() now runs precompiled closure trees (CSP-safe closure
 * composition, no eval/Function). The tree-walking interpreter remains the
 * reference engine (_evaluateInterpreted, still used by _execStatement).
 *
 * 1. Differential suite: every corpus expression + a seeded generated corpus
 *    run through BOTH engines against structurally identical fresh contexts;
 *    results must match exactly.
 * 2. Security pins re-asserted against the compiled path specifically:
 *    prototype-pollution set, allow-list identifier resolution, blocked
 *    browser globals, Function/eval neutralization (Safety Rule 7).
 */

import { createContext } from '../src/context.js';
import { evaluate, _evaluateInterpreted } from '../src/evaluate.js';
import { _stores, _storeWatchers, _globals, _filters } from '../src/globals.js';

// Test-local filters so pipe coverage doesn't depend on built-in registration
beforeAll(() => {
  _filters.__up = (v) => (typeof v === 'string' ? v.toUpperCase() : v);
  _filters.__dbl = (v, m = 2) => (typeof v === 'number' ? v * m : v);
});
afterAll(() => {
  delete _filters.__up;
  delete _filters.__dbl;
});

afterEach(() => {
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
  Object.keys(_globals).forEach((k) => delete _globals[k]);
});

// Fresh, structurally identical scope data per engine — method calls in the
// corpus may mutate (arr.push), so engines never share objects.
function makeData() {
  return {
    a: 1, b: 2, c: 0, s: 'hello', t: 'WORLD', n: null, u: undefined,
    f: false, tr: true, num: 42.5, neg: -7,
    arr: [1, 2, 3, 4, 5],
    strs: ['x', 'y', 'z'],
    obj: { x: 1, y: { z: 2 }, 'k-ey': 3, arr: [{ id: 1 }, { id: 2 }] },
    row: { id: 7, label: 'row seven', danger: true },
    sel: 7,
    items: [{ id: 1, label: 'aa' }, { id: 2, label: 'bb' }],
    fn: (x) => x * 2,
    mixed: [0, '', null, undefined, false, 'end'],
  };
}

function makeChainedCtx() {
  const parent = createContext({ shared: 100, dup: 'parent', ...makeData() });
  return createContext({ local: 5, dup: 'child' }, parent);
}

// Functions can't be compared for identity across engines; everything else
// deep-compares (toEqual handles NaN, nested objects, undefined).
function normalize(v) {
  if (typeof v === 'function') return '[function]';
  if (Array.isArray(v)) return v.map(normalize);
  return v;
}

function assertBothEngines(expr) {
  const compiled = evaluate(expr, createContext(makeData()));
  const interpreted = _evaluateInterpreted(expr, createContext(makeData()));
  expect({ expr, result: normalize(compiled) })
    .toEqual({ expr, result: normalize(interpreted) });
}

const CORPUS = [
  // Literals & keywords
  '42', '3.14', "'str'", '"dq"', 'true', 'false', 'null', 'undefined',
  '1.5e3', '.5', '0',
  // Identifiers & scope
  'a', 's', 'n', 'u', 'missing', 'row', 'arr', 'fn',
  // Arithmetic / comparison / logic
  'a + b', 'a - b', 'a * num', 'num / b', 'num % b', 'a + s', 's + t',
  'a === 1', 'a !== b', 'a == "1"', 'a != "1"', 'a > b', 'a < b',
  'a >= 1', 'b <= 1', 'a && b', 'c && b', 'a || b', 'c || b',
  'n ?? "fb"', 'u ?? a', 'c ?? "kept"', '!a', '!!c', '-a', '+s', '-s',
  'a && b || c', 'a + b * 2 - 1', '(a + b) * 2',
  // Bitwise single | (must not be parsed as pipe inside groups)
  '(a | b)', '(num | c)',
  // Ternary
  'a ? s : t', 'c ? s : t', 'a > b ? "gt" : a < b ? "lt" : "eq"',
  // Member access
  'row.label', 'obj.y.z', 'obj["k-ey"]', 'arr[0]', 'arr[a]',
  'obj.arr[1].id', 'items[0].label', 'row["la" + "bel"]',
  'missing.deep.path', 'n.x', 'u.x',
  // Optional chaining
  'n?.x', 'obj?.y?.z', 'missing?.foo?.bar', 'fn?.(3)', 'missing?.(1)',
  'obj.arr?.[1].id', 'n?.[0]',
  // Calls
  'fn(21)', 'fn(a) + fn(b)', 'Math.max(1, 9, 4)', 'Math.min(...arr)',
  's.toUpperCase()', 's.slice(1, 3)', 'arr.indexOf(3)', 'arr.join("-")',
  'strs.concat(["w"]).length', 'arr.includes(9)', 'notAFunction()',
  'obj.missingMethod()', 'JSON.stringify(row)', 'JSON.parse(\'{"k":1}\').k',
  'String(num)', 'Number(s)', 'Boolean(c)', 'parseInt("42px")',
  'Object.keys(obj)', 'Object.values(row)', 'Object.entries(obj).length',
  // The benchmark-shaped hot expressions
  'row.id === sel', 'row.id !== sel', 'row.danger && row.label',
  // Arrays / objects / spread
  '[1, 2, 3]', '[a, b, s]', '[...arr, 6]', '[...s]', '[...num]',
  '[...mixed]', 'Math.max(...arr)', '[arr[0], obj.x]',
  '{ a: 1, b: s }', '{ a, sel }', '{ [s]: a }', '{ ...row, extra: 1 }',
  '{ ...n }', "{ 'lit key': a }", '{ nested: { deep: b } }',
  "{ ['constructor']: 1 }",
  // Arrow functions
  'arr.map(x => x * 2)', 'arr.filter(x => x > 2).length',
  'arr.reduce((acc, x) => acc + x, 0)', 'arr.map((x, i) => x + i)',
  'arr.map(x => x * a)', 'items.map(it => it.label).join(",")',
  '((...xs) => xs.length)(1, 2, 3)', '(() => 7)()',
  'arr.map(x => ({ v: x }))[1].v', 'strs.map(v => v.toUpperCase())',
  // Template literals
  '`${a} and ${s}`', '`plain`', '`${row.label}: ${row.id}`',
  '`${a > b ? "big" : "small"}`', '`x${`inner ${b}`}y`',
  // typeof / in / instanceof
  'typeof a', 'typeof missing', 'typeof fn', 'typeof Math', 'typeof s',
  '"x" in obj', '"missing" in obj', '"length" in arr', 'a in n',
  'arr instanceof Array', 'row instanceof Object',
  // Postfix / prefix / assignment (expression context — no mutation)
  'a++', '++a', 'a--', '--a', 'a = 99', 'a += 2', 'b *= 3',
  // Keyword-named properties
  'obj.in', 'row.typeof',
  // Filters (pipes)
  's | __up', 'num | __dbl', 'num | __dbl:3', 's | __nosuchfilter',
  'c || b | __dbl', 's | __up | __up',
  // Malformed / hostile input (never throw, engines agree)
  'a b', '1 +', '+ 5', '(1 + 2', "'unterminated", '"open', '`open ${a',
  'arr[0', '{ a: 1', '(1 + 2))', 'arr[0]]', 'a..b', ')(', '?:', '...',
  '1 ++ ++ 2', '= 5',
  // Security probes (both engines must refuse identically)
  '__proto__', 'constructor', 'prototype', 'obj.__proto__',
  "obj['__proto__']", 'obj.constructor', "obj['constructor']",
  'row.prototype', "arr['cons' + 'tructor']", '({}).constructor',
  'Math.constructor', 'fn.constructor', 'toString', 'hasOwnProperty',
  'valueOf', 'window.fetch', 'window.localStorage', 'window.eval',
  'document.cookie', 'document.write', 'Object.getOwnPropertyDescriptor',
  'Object.getPrototypeOf', 'Object.defineProperty',
];

describe('WS3 — differential: corpus through both engines', () => {
  test.each(CORPUS)('%s', (expr) => {
    assertBothEngines(expr);
  });

  test('parent-chain scoping matches (shadowing + inheritance)', () => {
    for (const expr of ['local + shared', 'dup', 'shared', 'local', 'dup + s', 'missing']) {
      const compiled = evaluate(expr, makeChainedCtx());
      const interpreted = _evaluateInterpreted(expr, makeChainedCtx());
      expect({ expr, result: compiled }).toEqual({ expr, result: interpreted });
    }
  });

  test('$store / $route / plugin globals resolve identically', () => {
    _stores.cart = createContext({ count: 3 });
    _globals.demo = { count: 5 };
    for (const expr of ['$store.cart.count', '$demo.count', '$nosuchglobal', '$route', '$router']) {
      const compiled = evaluate(expr, createContext(makeData()));
      const interpreted = _evaluateInterpreted(expr, createContext(makeData()));
      expect({ expr, result: normalize(compiled) })
        .toEqual({ expr, result: normalize(interpreted) });
    }
  });

  test('context vars shadow $-specials and safe globals in both engines', () => {
    const data = { $store: 'shadowed', Math: { max: () => 99 } };
    for (const expr of ['$store', 'Math.max(1, 2)']) {
      const compiled = evaluate(expr, createContext({ ...data }));
      const interpreted = _evaluateInterpreted(expr, createContext({ ...data }));
      expect({ expr, result: compiled }).toEqual({ expr, result: interpreted });
    }
    expect(evaluate('$store', createContext({ $store: 'shadowed' }))).toBe('shadowed');
    expect(evaluate('Math.max(1, 2)', createContext({ Math: { max: () => 99 } }))).toBe(99);
  });

  test('arrow-function VALUES invoked outside evaluate() fail closed identically', () => {
    // An arrow returned from evaluate() runs its body later, outside the
    // evaluator's outer try/catch — a throwing body must still degrade to
    // warn + undefined (never propagate to the external caller).
    for (const expr of ['x => x.a.b', 'x => x.missing.deep + 1', 'x => x()']) {
      const compiledFn = evaluate(expr, createContext(makeData()));
      const interpretedFn = _evaluateInterpreted(expr, createContext(makeData()));
      expect(typeof compiledFn).toBe('function');
      expect(typeof interpretedFn).toBe('function');
      for (const arg of [undefined, null, {}, 42]) {
        let compiledResult, interpretedResult;
        expect(() => { compiledResult = compiledFn(arg); }).not.toThrow();
        expect(() => { interpretedResult = interpretedFn(arg); }).not.toThrow();
        expect({ expr, arg, result: compiledResult })
          .toEqual({ expr, arg, result: interpretedResult });
      }
    }
  });
});

// ── Seeded generated corpus ────────────────────────────────────────────────
// Deterministic LCG so CI never flakes; grammar recombines scope identifiers,
// literals, operators, member paths, calls, ternaries, arrays and arrows.

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function generateExpr(rng, depth) {
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const atoms = [
    'a', 'b', 'c', 'num', 'neg', 's', 't', 'n', 'u', 'f', 'tr', 'sel',
    'row.id', 'row.label', 'obj.x', 'obj.y.z', 'arr[0]', 'arr[1]',
    'items[0].id', 'items[1].label', 'missing', 'missing.deep',
    '1', '2', '0', '3.5', "'lit'", '"q"', 'true', 'false', 'null', 'undefined',
  ];
  if (depth <= 0) return pick(atoms);
  const forms = [
    () => `${generateExpr(rng, depth - 1)} ${pick(['+', '-', '*', '/', '%', '===', '!==', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '??'])} ${generateExpr(rng, depth - 1)}`,
    () => `${pick(['!', '-', '+', 'typeof '])}${generateExpr(rng, depth - 1)}`,
    () => `(${generateExpr(rng, depth - 1)})`,
    () => `${generateExpr(rng, depth - 1)} ? ${generateExpr(rng, depth - 1)} : ${generateExpr(rng, depth - 1)}`,
    () => `[${generateExpr(rng, depth - 1)}, ${generateExpr(rng, depth - 1)}]`,
    () => `{ k: ${generateExpr(rng, depth - 1)}, j: ${generateExpr(rng, depth - 1)} }`,
    () => `fn(${generateExpr(rng, depth - 1)})`,
    () => `Math.max(${generateExpr(rng, depth - 1)}, ${generateExpr(rng, depth - 1)})`,
    () => `arr.map(x => x ${pick(['+', '*', '-'])} ${generateExpr(rng, depth - 1)})`,
    () => `\`v=\${${generateExpr(rng, depth - 1)}}\``,
    () => `${pick(['row', 'obj', 'n', 'missing'])}?.${pick(['id', 'x', 'label', 'nope'])}`,
    () => pick(atoms),
  ];
  return pick(forms)();
}

describe('WS3 — differential: seeded generated corpus', () => {
  test('400 generated expressions agree across engines (seed 42)', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 400; i++) {
      const expr = generateExpr(rng, 1 + Math.floor(rng() * 3));
      const compiled = evaluate(expr, createContext(makeData()));
      const interpreted = _evaluateInterpreted(expr, createContext(makeData()));
      expect({ expr, result: normalize(compiled) })
        .toEqual({ expr, result: normalize(interpreted) });
    }
  });
});

// ── Security pins against the COMPILED path specifically ──────────────────

describe('WS3 — compiled path security pins', () => {
  test('prototype-pollution identifier set resolves to undefined', () => {
    const ctx = createContext({ obj: { x: 1 } });
    for (const expr of [
      '__proto__', 'constructor', 'prototype',
      'obj.__proto__', 'obj.constructor', 'obj.prototype',
      "obj['__proto__']", "obj['constructor']", "obj['prototype']",
      "obj['__pro' + 'to__']",
    ]) {
      expect(evaluate(expr, ctx)).toBeUndefined();
    }
  });

  test('unknown identifiers resolve to undefined (allow-list only)', () => {
    const ctx = createContext({});
    for (const expr of ['nonexistent', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf']) {
      expect(evaluate(expr, ctx)).toBeUndefined();
    }
    expect(evaluate('typeof nonexistent', ctx)).toBe('undefined');
  });

  test('blocked browser surface stays blocked', () => {
    const ctx = createContext({});
    for (const expr of [
      'window.fetch', 'window.XMLHttpRequest', 'window.localStorage',
      'window.sessionStorage', 'window.WebSocket', 'window.indexedDB',
      'window.eval', 'window.Function', 'document.cookie', 'document.write',
      'document.execCommand', 'navigator.sendBeacon',
    ]) {
      expect(evaluate(expr, ctx)).toBeUndefined();
    }
  });

  test('Function / eval are neutralized on member reads (_rewrapResult)', () => {
    const ctx = createContext({ o: { F: Function, e: eval } });
    expect(evaluate('o.F', ctx)).toBeUndefined();
    expect(evaluate('o.e', ctx)).toBeUndefined();
  });

  test('curated Object shim omits reflection statics', () => {
    const ctx = createContext({});
    expect(evaluate('Object.getOwnPropertyDescriptor', ctx)).toBeUndefined();
    expect(evaluate('Object.getPrototypeOf', ctx)).toBeUndefined();
    expect(evaluate('Object.defineProperty', ctx)).toBeUndefined();
    expect(evaluate('Object.create', ctx)).toBeUndefined();
    expect(evaluate('Object.keys({ x: 1 })', ctx)).toEqual(['x']);
  });

  test('location is read-only, navigation methods are no-ops', () => {
    const ctx = createContext({});
    expect(typeof evaluate('location.href', ctx)).toBe('string');
    expect(evaluate('location.assign("https://evil.example")', ctx)).toBeUndefined();
    expect(evaluate('history.pushState(null, "", "/x")', ctx)).toBeUndefined();
  });

  test('object literals cannot smuggle forbidden keys (static or computed)', () => {
    const ctx = createContext({ k: 'constructor' });
    expect(evaluate("{ ['const' + 'ructor']: 1 }", ctx)).toEqual({});
    expect(evaluate('{ [k]: 1 }', ctx)).toEqual({});
    expect(evaluate('{ ...{ safe: 1 } }', ctx)).toEqual({ safe: 1 });
  });

  test('non-reactive context objects evaluate to undefined (legacy contract)', () => {
    expect(evaluate('a', { a: 1 })).toBeUndefined();
    expect(evaluate('1 + 1', null)).toBeUndefined();
    expect(evaluate('1 + 1', undefined)).toBeUndefined();
  });

  test('arrow-function params shadow context vars and globals', () => {
    const ctx = createContext({ x: 'outer', arr: [1, 2] });
    expect(evaluate('arr.map(x => x)[0]', ctx)).toBe(1);
    expect(evaluate('arr.map(Math => Math)[1]', ctx)).toBe(2);
    expect(evaluate('x', ctx)).toBe('outer');
  });
});
