/**
 * #332 — filter argument parsing must preserve whitespace inside quoted args.
 *
 * `items | join:', '` is documented (docs/md/filters.md) to render `a, b, c`.
 * Whitespace inside quotes is significant; only unquoted args are trimmed.
 * Covers both the compiled path (evaluate) and the interpreted fallback.
 */

import { evaluate, _evaluateInterpreted } from '../src/evaluate.js';
import { createContext } from '../src/context.js';
import { _filters } from '../src/globals.js';
import '../src/filters.js';

const paths = [
  ['compiled (evaluate)', evaluate],
  ['interpreted (_evaluateInterpreted)', _evaluateInterpreted],
];

describe.each(paths)('filter args — %s', (_label, run) => {
  const items = ['a', 'b', 'c'];

  test("docs example: join:', ' keeps the space", () => {
    expect(run("items | join:', '", createContext({ items }))).toBe('a, b, c');
  });

  test('double-quoted separator keeps surrounding spaces', () => {
    expect(run('items | join:" - "', createContext({ items }))).toBe('a - b - c');
  });

  test("whitespace-only quoted arg stays a string (join:' ')", () => {
    expect(run("items | join:' '", createContext({ items }))).toBe('a b c');
  });

  test("empty quoted arg is passed through (join:'')", () => {
    expect(run("items | join:''", createContext({ items }))).toBe('abc');
  });

  test('quoted comma is part of the arg, not a separator', () => {
    expect(run("items | join:', '", createContext({ items: ['x', 'y'] }))).toBe('x, y');
  });

  test('whitespace outside the quotes is ignored', () => {
    expect(run("items | join:  ' | '  ", createContext({ items }))).toBe('a | b | c');
  });

  describe('with a probe filter', () => {
    beforeAll(() => {
      _filters.__probe = (_v, ...args) => args;
    });
    afterAll(() => {
      delete _filters.__probe;
    });

    test('unquoted args are trimmed and numeric ones coerced', () => {
      expect(run('x | __probe: 1 ,  foo , 2.5 ', createContext({ x: 0 }))).toEqual([1, 'foo', 2.5]);
    });

    test('mixed quoted and unquoted args', () => {
      expect(run("x | __probe:' a ', b ,\" c \"", createContext({ x: 0 }))).toEqual([' a ', 'b', ' c ']);
    });

    test('quoted numeric string is still coerced (backward compatible)', () => {
      expect(run("x | __probe:'20'", createContext({ x: 0 }))).toEqual([20]);
    });

    test('quoted whitespace is not coerced to 0', () => {
      expect(run("x | __probe:' '", createContext({ x: 0 }))).toEqual([' ']);
    });

    test('trailing empty unquoted arg is dropped', () => {
      expect(run('x | __probe:a, ', createContext({ x: 0 }))).toEqual(['a']);
    });
  });
});
