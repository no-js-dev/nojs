import { _filters } from '../src/globals.js';
import '../src/filters.js';

describe('Built-in Filters', () => {
  describe('Text Filters', () => {
    test('uppercase', () => {
      expect(_filters.uppercase('hello')).toBe('HELLO');
      expect(_filters.uppercase(null)).toBe('');
      expect(_filters.uppercase(undefined)).toBe('');
    });

    test('lowercase', () => {
      expect(_filters.lowercase('HELLO')).toBe('hello');
      expect(_filters.lowercase(null)).toBe('');
    });

    test('capitalize', () => {
      expect(_filters.capitalize('hello world')).toBe('Hello World');
      expect(_filters.capitalize('foo bar baz')).toBe('Foo Bar Baz');
      expect(_filters.capitalize(null)).toBe('');
    });

    test('truncate with default length', () => {
      const long = 'a'.repeat(150);
      const result = _filters.truncate(long);
      expect(result).toHaveLength(103);
      expect(result.endsWith('...')).toBe(true);
    });

    test('truncate with custom length', () => {
      expect(_filters.truncate('hello world', 5)).toBe('hello...');
      expect(_filters.truncate('hi', 10)).toBe('hi');
    });

    test('trim', () => {
      expect(_filters.trim('  hello  ')).toBe('hello');
      expect(_filters.trim(null)).toBe('');
    });

    test('stripHtml', () => {
      expect(_filters.stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
      expect(_filters.stripHtml('<script>alert("x")</script>Text')).toBe('alert("x")Text');
    });

    test('slugify', () => {
      expect(_filters.slugify('Hello World!')).toBe('hello-world');
      expect(_filters.slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(_filters.slugify('Special @#$ Characters')).toBe('special-characters');
    });

    test('nl2br still converts newlines to br', () => {
      expect(_filters.nl2br('line1\nline2\nline3')).toBe('line1<br>line2<br>line3');
    });

    test('nl2br encodes HTML entities before converting newlines', () => {
      expect(_filters.nl2br('<script>alert(1)</script>\nHello')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;<br>Hello'
      );
    });

    test('nl2br encodes ampersands', () => {
      expect(_filters.nl2br('A & B\nC')).toBe('A &amp; B<br>C');
    });

    test('encodeUri', () => {
      expect(_filters.encodeUri('hello world')).toBe('hello%20world');
      expect(_filters.encodeUri('foo=bar&baz=qux')).toBe('foo%3Dbar%26baz%3Dqux');
    });
  });

  describe('Number Filters', () => {
    test('number with default decimals', () => {
      const result = _filters.number(1234567);
      expect(typeof result).toBe('string');
    });

    test('number with custom decimals', () => {
      const result = _filters.number(3.14159, 2);
      expect(result).toContain('3');
    });

    test('number with non-numeric input', () => {
      expect(_filters.number('abc')).toBe('abc');
    });

    test('currency with default USD', () => {
      const result = _filters.currency(9.99);
      expect(typeof result).toBe('string');
    });

    test('currency with custom code', () => {
      const result = _filters.currency(100, 'EUR');
      expect(typeof result).toBe('string');
    });

    test('currency with non-numeric input', () => {
      expect(_filters.currency('abc')).toBe('abc');
    });

    test('percent', () => {
      expect(_filters.percent(0.75)).toBe('75%');
      expect(_filters.percent(0.333, 1)).toBe('33.3%');
      expect(_filters.percent('abc')).toBe('abc');
    });

    test('filesize', () => {
      expect(_filters.filesize(0)).toBe('0 B');
      expect(_filters.filesize(1024)).toBe('1.0 KB');
      expect(_filters.filesize(1048576)).toBe('1.0 MB');
      expect(_filters.filesize(1073741824)).toBe('1.0 GB');
      expect(_filters.filesize('abc')).toBe('abc');
    });

    test('ordinal', () => {
      expect(_filters.ordinal(1)).toBe('1st');
      expect(_filters.ordinal(2)).toBe('2nd');
      expect(_filters.ordinal(3)).toBe('3rd');
      expect(_filters.ordinal(4)).toBe('4th');
      expect(_filters.ordinal(11)).toBe('11th');
      expect(_filters.ordinal(12)).toBe('12th');
      expect(_filters.ordinal(13)).toBe('13th');
      expect(_filters.ordinal(21)).toBe('21st');
      expect(_filters.ordinal(22)).toBe('22nd');
      expect(_filters.ordinal('abc')).toBe('abc');
    });
  });

  describe('Array Filters', () => {
    test('count', () => {
      expect(_filters.count([1, 2, 3])).toBe(3);
      expect(_filters.count([])).toBe(0);
      expect(_filters.count('not array')).toBe(0);
    });

    test('first', () => {
      expect(_filters.first([10, 20, 30])).toBe(10);
      expect(_filters.first('scalar')).toBe('scalar');
    });

    test('last', () => {
      expect(_filters.last([10, 20, 30])).toBe(30);
      expect(_filters.last('scalar')).toBe('scalar');
    });

    test('join with default separator', () => {
      expect(_filters.join(['a', 'b', 'c'])).toBe('a, b, c');
    });

    test('join with custom separator', () => {
      expect(_filters.join(['a', 'b', 'c'], ' | ')).toBe('a | b | c');
    });

    test('join with non-array', () => {
      expect(_filters.join('scalar')).toBe('scalar');
    });

    test('reverse', () => {
      expect(_filters.reverse([1, 2, 3])).toEqual([3, 2, 1]);
      expect(_filters.reverse('scalar')).toBe('scalar');
    });

    test('reverse does not mutate original', () => {
      const arr = [1, 2, 3];
      _filters.reverse(arr);
      expect(arr).toEqual([1, 2, 3]);
    });

    test('unique', () => {
      expect(_filters.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(_filters.unique('scalar')).toBe('scalar');
    });

    test('pluck', () => {
      const items = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
      expect(_filters.pluck(items, 'name')).toEqual(['a', 'b', 'c']);
      expect(_filters.pluck('scalar', 'name')).toBe('scalar');
    });

    test('sortBy ascending', () => {
      const items = [{ age: 30 }, { age: 10 }, { age: 20 }];
      expect(_filters.sortBy(items, 'age')).toEqual([
        { age: 10 }, { age: 20 }, { age: 30 },
      ]);
    });

    test('sortBy descending', () => {
      const items = [{ age: 10 }, { age: 30 }, { age: 20 }];
      expect(_filters.sortBy(items, '-age')).toEqual([
        { age: 30 }, { age: 20 }, { age: 10 },
      ]);
    });

    test('sortBy does not mutate original', () => {
      const items = [{ age: 30 }, { age: 10 }];
      _filters.sortBy(items, 'age');
      expect(items[0].age).toBe(30);
    });

    test('sortBy with non-array', () => {
      expect(_filters.sortBy('scalar', 'key')).toBe('scalar');
    });

    test('where', () => {
      const items = [
        { role: 'admin', name: 'Alice' },
        { role: 'user', name: 'Bob' },
        { role: 'admin', name: 'Carol' },
      ];
      expect(_filters.where(items, 'role', 'admin')).toEqual([
        { role: 'admin', name: 'Alice' },
        { role: 'admin', name: 'Carol' },
      ]);
      expect(_filters.where('scalar', 'role', 'admin')).toBe('scalar');
    });
  });

  describe('Date Filters', () => {
    test('date with default format', () => {
      const result = _filters.date('2024-01-15');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('date with long format', () => {
      const result = _filters.date('2024-01-15', 'long');
      expect(typeof result).toBe('string');
    });

    test('date with full format', () => {
      const result = _filters.date('2024-01-15', 'full');
      expect(typeof result).toBe('string');
    });

    test('date with invalid input', () => {
      expect(_filters.date('not a date')).toBe('not a date');
    });

    test('datetime', () => {
      const result = _filters.datetime('2024-01-15T12:00:00');
      expect(typeof result).toBe('string');
    });

    test('datetime with invalid input', () => {
      expect(_filters.datetime('nope')).toBe('nope');
    });

    test('relative - just now', () => {
      const now = new Date();
      expect(_filters.relative(now.toISOString())).toBe('just now');
    });

    test('relative - minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(_filters.relative(fiveMinAgo.toISOString())).toBe('5m ago');
    });

    test('relative - hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
      expect(_filters.relative(twoHoursAgo.toISOString())).toBe('2h ago');
    });

    test('relative - days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000);
      expect(_filters.relative(threeDaysAgo.toISOString())).toBe('3d ago');
    });

    test('relative with invalid input', () => {
      expect(_filters.relative('nope')).toBe('nope');
    });

    test('fromNow - future', () => {
      const inTwoHours = new Date(Date.now() + 2.5 * 3600 * 1000);
      expect(_filters.fromNow(inTwoHours.toISOString())).toBe('in 2h');
    });

    test('fromNow - past falls back to relative', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(_filters.fromNow(fiveMinAgo.toISOString())).toBe('5m ago');
    });

    test('fromNow with invalid input', () => {
      expect(_filters.fromNow('nope')).toBe('nope');
    });
  });

  describe('Utility Filters', () => {
    test('default - returns default for null/empty', () => {
      expect(_filters.default(null, 'N/A')).toBe('N/A');
      expect(_filters.default(undefined, 'N/A')).toBe('N/A');
      expect(_filters.default('', 'N/A')).toBe('N/A');
    });

    test('default - returns value when present', () => {
      expect(_filters.default('hello', 'N/A')).toBe('hello');
      expect(_filters.default(0, 'N/A')).toBe(0);
      expect(_filters.default(false, 'N/A')).toBe(false);
    });

    test('json', () => {
      expect(_filters.json({ a: 1 })).toBe('{\n  "a": 1\n}');
      expect(_filters.json({ a: 1 }, 0)).toBe('{"a":1}');
    });

    test('debug logs and returns value', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const result = _filters.debug('test value');
      expect(result).toBe('test value');
      expect(spy).toHaveBeenCalledWith('[No.JS debug]', 'test value');
      spy.mockRestore();
    });

    test('keys', () => {
      expect(_filters.keys({ a: 1, b: 2, c: 3 })).toEqual(['a', 'b', 'c']);
      expect(_filters.keys(null)).toEqual([]);
      expect(_filters.keys('string')).toEqual([]);
    });

    test('values', () => {
      expect(_filters.values({ a: 1, b: 2, c: 3 })).toEqual([1, 2, 3]);
      expect(_filters.values(null)).toEqual([]);
    });
  });
});

describe('filters.js — currency fallback', () => {
  test('returns fallback format for invalid currency code', () => {
    const original = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function (locale, opts) {
      if (opts?.style === 'currency') throw new Error('Invalid currency');
      return original.call(this, locale, opts);
    };

    const result = _filters.currency(42.5, 'INVALID');
    expect(result).toBe('INVALID 42.50');

    Number.prototype.toLocaleString = original;
  });
});



describe('filters.js — truncate short string', () => {
  test('returns string as-is when shorter than len', () => {
    expect(_filters.truncate('short', 100)).toBe('short');
    expect(_filters.truncate('', 10)).toBe('');
  });

  test('returns string as-is when exactly equal to len', () => {
    expect(_filters.truncate('12345', 5)).toBe('12345');
  });

  test('truncates when string is longer than len', () => {
    expect(_filters.truncate('123456', 5)).toBe('12345...');
  });
});

describe('filters.js — null/undefined fallback (v ?? "")', () => {
  test('stripHtml with null/undefined', () => {
    expect(_filters.stripHtml(null)).toBe('');
    expect(_filters.stripHtml(undefined)).toBe('');
  });

  test('slugify with null/undefined/empty', () => {
    expect(_filters.slugify(null)).toBe('');
    expect(_filters.slugify(undefined)).toBe('');
    expect(_filters.slugify('')).toBe('');
  });

  test('nl2br with null/undefined', () => {
    expect(_filters.nl2br(null)).toBe('');
    expect(_filters.nl2br(undefined)).toBe('');
  });

  test('encodeUri with null/undefined', () => {
    expect(_filters.encodeUri(null)).toBe('');
    expect(_filters.encodeUri(undefined)).toBe('');
  });

  test('truncate with null/undefined', () => {
    expect(_filters.truncate(null)).toBe('');
    expect(_filters.truncate(undefined)).toBe('');
  });

  test('trim with null/undefined', () => {
    expect(_filters.trim(null)).toBe('');
    expect(_filters.trim(undefined)).toBe('');
  });
});

describe('filters.js — sortBy without key', () => {
  test('sortBy with no key parameter sorts by undefined property', () => {
    const items = [{ a: 3 }, { a: 1 }, { a: 2 }];
    const result = _filters.sortBy(items);
    expect(result).toHaveLength(3);
  });

  test('sortBy with null key', () => {
    const items = [{ a: 3 }, { a: 1 }];
    const result = _filters.sortBy(items, null);
    expect(result).toHaveLength(2);
  });
});

describe('filters.js — fromNow future dates', () => {
  let nowSpy;
  const FIXED_NOW = new Date('2025-06-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  test('fromNow in a moment for near-future', () => {
    const soonDate = new Date(FIXED_NOW + 30 * 1000);
    const result = _filters.fromNow(soonDate.toISOString());
    expect(result).toBe('in a moment');
  });

  test('fromNow in Xm for future minutes', () => {
    const futureMin = new Date(FIXED_NOW + 10 * 60 * 1000);
    const result = _filters.fromNow(futureMin.toISOString());
    expect(result).toBe('in 10m');
  });

  test('fromNow in Xd for future days', () => {
    const futureDays = new Date(FIXED_NOW + 3 * 86400 * 1000);
    const result = _filters.fromNow(futureDays.toISOString());
    expect(result).toBe('in 3d');
  });
});

describe('filters.js — default filter edge cases', () => {
  test('returns 0 when value is 0 (not null/empty)', () => {
    expect(_filters.default(0, 'fallback')).toBe(0);
  });

  test('returns false when value is false (not null/empty)', () => {
    expect(_filters.default(false, 'fallback')).toBe(false);
  });

  test('returns empty array as value (not null/empty)', () => {
    const arr = [];
    expect(_filters.default(arr, 'fallback')).toBe(arr);
  });
});


