import { _config, _cache, _interceptors, _withMutedWarnings, _warn } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree } from '../src/registry.js';
import { _interpolateBody } from '../src/evaluate.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/http.js';
import '../src/directives/refs.js';

// Request bodies built from the `body` attribute. KEEP rows are byte-for-byte
// what v1.21.1 sends (captured in Chromium, Firefox and WebKit); FIXED rows
// are bodies v1.21.1 mangled (JSON templates, object literals, a placeholder
// holding an object) and the JSON they send now. Each row: body attribute,
// bytes on the wire (null: no body), Content-Type application/json or not.

const STATE = {
  user: { name: 'Ann "Q" & Co' }, role: 'admin', n: 42, obj: { a: 1, b: 'x' }, arr: [1, 2], arrObj: [{ a: 1 }],
  s: 'hello world', amp: 'a&b=c', quote: 'say "hi"', back: 'a\\b', nl: 'l1\nl2', uni: 'café ✓', nul: null, t: true, f: false, zero: 0,
  email: 'e@x.io', password: 'p@ss', item: { id: 7 }, dots: '..', pct: '100%', brace: '{x}', ostr: '{"k":1}',
};

function mockJsonResponse(data) {
  return {
    ok: true,
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

function flush(ms = 10) {
  return new Promise((r) => setTimeout(r, ms));
}

function mount(tag, attrs) {
  const parent = document.createElement('div');
  parent.setAttribute('state', JSON.stringify(STATE));
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.appendChild(el);
  document.body.appendChild(parent);
  processTree(parent);
  return el;
}

async function send(attrs, tag = 'button') {
  mount(tag, attrs).click();
  await flush(30);
  const opts = global.fetch.mock.calls[0][1];
  return { body: opts.body ?? null, json: opts.headers['Content-Type'] === 'application/json' };
}

let warn;
beforeEach(() => {
  document.body.innerHTML = '';
  _config.baseApiUrl = '';
  _config.retries = 0;
  _config.cache = { strategy: 'none', ttl: 300000, prefix: 'nojs_' };
  _interceptors.request = [];
  _interceptors.response = [];
  _cache.clear();
  global.fetch = jest.fn().mockResolvedValue(mockJsonResponse({}));
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  delete global.fetch;
});

describe('body attribute', () => {
  const KEEP = [
    ["{s}", "hello%20world", false],
    ["{n}", "42", true],
    ["{arr}", "1%2C2", false],
    ["{t}", "true", true],
    ["{f}", null, false],
    ["{zero}", null, false],
    ["{nul}", null, false],
    ["{undef}", null, false],
    ["{dots}", "..", false],
    ["{pct}", "100%25", false],
    ["{uni}", "caf%C3%A9%20%E2%9C%93", false],
    ["{quote}", "say%20%22hi%22", false],
    ["{ostr}", "%7B%22k%22%3A1%7D", false],
    ["name={s}&role={role}", "name=hello%20world&role=admin", false],
    ["q={amp}", "q=a%26b%3Dc", false],
    ["a={uni}&b={quote}", "a=caf%C3%A9%20%E2%9C%93&b=say%20%22hi%22", false],
    ["hello", "hello", false],
    ["{s} and {role}", "hello%20world and admin", false],
    ["{n + 1}", "43", true],
    ["{'lit'}", "lit", false],
    ["{JSON.stringify(obj)}", "%7B%22a%22%3A1%2C%22b%22%3A%22x%22%7D", false],
    ["[1,2,3]", "[1,2,3]", true],
    ["{}", "{}", true],
    ["[]", "[]", true],
    ["{ {a: 1} }", "%5Bobject%20Object%5D }", false],
    ["[\"{s}\", {n}]", "[\"hello%20world\",42]", true],
    ["{s}{role}", "hello%20worldadmin", false],
    ["[{s}]", "[hello%20world]", false],
    ["[{n}]", "[42]", true],
    ["[{role}] {s}", "[admin] hello%20world", false],
    ["{\"lit\"}", "lit", false],
    ["{\"5\": 1}", "5", true],
    ["{s}, {role}", "hello%20world, admin", false],
    ["{t ? s : role}", "hello%20world", false],
    ["{ s | uppercase }", "HELLO%20WORLD", false],
    ["{arr}", "1%2C2", false],
  ];
  const FIXED = [
    ["{obj}", "{\"a\":1,\"b\":\"x\"}", true],
    ["{arrObj}", "[{\"a\":1}]", true],
    ["{\"name\": \"{user.name}\", \"role\": \"{role}\"}", "{\"name\":\"Ann \\\"Q\\\" & Co\",\"role\":\"admin\"}", true],
    ["{\"name\":\"{s}\"}", "{\"name\":\"hello world\"}", true],
    ["{\"n\": {n}}", "{\"n\":42}", true],
    ["{\"a\": 1, \"b\": \"x\"}", "{\"a\":1,\"b\":\"x\"}", true],
    [" {\"a\":1} ", "{\"a\":1}", true],
    ["{ email, password }", "{\"email\":\"e@x.io\",\"password\":\"p@ss\"}", true],
    ["{ id: item.id }", "{\"id\":7}", true],
    ["{ id: n }", "{\"id\":42}", true],
    ["{\"o\": {obj}}", "{\"o\":{\"a\":1,\"b\":\"x\"}}", true],
    ["{\"nested\": {\"x\": \"{s}\"}}", "{\"nested\":{\"x\":\"hello world\"}}", true],
    ["{\"q\": \"{quote}\"}", "{\"q\":\"say \\\"hi\\\"\"}", true],
    ["{\"u\": \"{uni}\"}", "{\"u\":\"caf\u00e9 \u2713\"}", true],
    ["{\"amp\": \"{amp}\"}", "{\"amp\":\"a&b=c\"}", true],
    ["{\"b\": \"{back}\"}", "{\"b\":\"a\\\\b\"}", true],
    ["{\"nl\": \"{nl}\"}", "{\"nl\":\"l1\\nl2\"}", true],
    ["{\"t\": {t}, \"z\": {zero}, \"nu\": {nul}}", "{\"t\":true,\"z\":0,\"nu\":null}", true],
    ["{\"k\": \"{undef}\"}", "{\"k\":\"\"}", true],
    ["{\"k\": {undef}}", "{\"k\":null}", true],
    ["{\"id\": {item.id}, \"name\": \"{s}\"}", "{\"id\":7,\"name\":\"hello world\"}", true],
    ["{\"email\":\"{email}\",\"password\":\"{password}\"}", "{\"email\":\"e@x.io\",\"password\":\"p@ss\"}", true],
    ["{\"x\": \"{brace}\"}", "{\"x\":\"{x}\"}", true],
    ["{\"x\": \"pre {s} post\"}", "{\"x\":\"pre hello world post\"}", true],
    ["{\"arr\": {arr}}", "{\"arr\":[1,2]}", true],
    ["{\"text\": \"use {curly}\"}", "{\"text\":\"use \"}", true],
    ["{\"n\": \"{n}\"}", "{\"n\":\"42\"}", true],
    ["[{\"a\": \"{s}\"}]", "[{\"a\":\"hello world\"}]", true],
    ["{ }", "{}", true],
    ["{ a: {b: 1} }", "{\"a\":{\"b\":1}}", true],
    ["{ ...item }", "{\"id\":7}", true],
    ["{ id: item.id, tag: role }", "{\"id\":7,\"tag\":\"admin\"}", true],
    ["{\"a\": \"{s | uppercase}\"}", "{\"a\":\"HELLO WORLD\"}", true],
    ["{\"a\": {n > 1 ? \"big\" : \"small\"}}", "{\"a\":\"big\"}", true],
    ["{\"a\": \"x {\"}", "{\"a\":\"x {\"}", true],
    ["{'a': 1}", "{\"a\":1}", true],
    ["{\"s\": \"{arrObj}\"}", "{\"s\":\"[object Object]\"}", true],
  ];

  test.each(KEEP)('v1.21.1 bytes: post body=%j sends %j (json %s)', async (body, bytes, json) => {
    expect(await send({ post: '/api/x', body })).toEqual({ body: bytes, json });
  });

  test.each(KEEP)('v1.21.1 bytes: call body=%j sends %j (json %s)', async (body, bytes, json) => {
    expect(await send({ call: '/api/x', method: 'post', body })).toEqual({ body: bytes, json });
  });

  test.each(FIXED)('fixed: post body=%j sends %j (json %s)', async (body, bytes, json) => {
    expect(await send({ post: '/api/x', body })).toEqual({ body: bytes, json });
  });

  test.each(FIXED)('fixed: call body=%j sends %j (json %s)', async (body, bytes, json) => {
    expect(await send({ call: '/api/x', method: 'post', body })).toEqual({ body: bytes, json });
  });

  test.each(['put', 'patch', 'delete'])('%s on a button and a div sends the JSON template as JSON', async (method) => {
    for (const tag of ['button', 'div']) {
      global.fetch.mockClear();
      const r = await send({ [method]: '/api/x', body: '{"name": "{user.name}", "role": "{role}"}' }, tag);
      expect(global.fetch.mock.calls[0][1].method).toBe(method.toUpperCase());
      expect(r).toEqual({ body: '{"name":"Ann \\"Q\\" & Co","role":"admin"}', json: true });
    }
  });

  test('a form sends its fields, not the body attribute (v1.21.1)', async () => {
    const form = mount('form', { post: '/api/f', body: '{"x": "{s}"}' });
    const input = document.createElement('input');
    input.name = 'a';
    input.value = '1';
    form.appendChild(input);
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush(30);
    expect(global.fetch.mock.calls[0][1].body).toBe('{"a":"1"}');
  });

  test('a fixed JSON template logs no expression warning', async () => {
    await send({ post: '/api/x', body: '{"email": "{email}", "password": "{password}"}' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('a broken placeholder inside a JSON template still warns once', async () => {
    await send({ post: '/api/x', body: '{"a": "{s s}"}' });
    expect(warn.mock.calls.filter((c) => c.join(' ').includes('Expression error')).length).toBe(1);
    expect(global.fetch.mock.calls[0][1].body).toBe('{"a":"hello world"}');
  });

  test('query keys the cache on the body it sends', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ hits: [] }));
    mount('div', { query: '/api/q', as: 'r', cached: 'memory', body: '{"name": "{s}"}' });
    await flush(30);
    expect(global.fetch.mock.calls[0][1].body).toBe('{"name":"hello world"}');
    expect([..._cache.keys()]).toContain('query:/api/q:{"name": "hello world"}');
  });

  test('query with a v1.21.1 body keeps the v1.21.1 cache key', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ hits: [] }));
    mount('div', { query: '/api/q', as: 'r', cached: 'memory', body: 'name={s}' });
    await flush(30);
    expect([..._cache.keys()]).toContain('query:/api/q:name=hello%20world');
  });
});

describe('_interpolateBody', () => {
  const ctx = () => createContext({ ...STATE });

  test('returns the v1.21.1 text as the key for a v1.21.1 body', () => {
    expect(_interpolateBody('a={s}', ctx())).toEqual({ body: 'a=hello%20world', key: 'a=hello%20world' });
    expect(_interpolateBody('{n}', ctx())).toEqual({ body: 42, key: '42' });
  });

  test('an unclosed placeholder in a JSON template falls back to v1.21.1', () => {
    expect(_interpolateBody('{"a": {n', ctx()).key).toBe('{"a": {n');
  });

  test('a value JSON cannot encode falls back to v1.21.1', () => {
    const c = createContext({ big: BigInt(1) });
    expect(_interpolateBody('{"a": {big}}', c)).toEqual({ body: 'a}', key: 'a}' });
  });

  test('a JSON template whose v1.21.1 text is valid JSON keeps it', () => {
    expect(_interpolateBody('{"5": 1}', ctx())).toEqual({ body: 5, key: '5' });
    expect(_interpolateBody('["{s}", {n}]', ctx())).toEqual({ body: ['hello%20world', 42], key: '["hello%20world", 42]' });
  });

  test('an array without objects keeps v1.21.1', () => {
    expect(_interpolateBody('[{s}]', ctx())).toEqual({ body: '[hello%20world]', key: '[hello%20world]' });
  });

  test('escaped quotes and backslashes inside JSON strings are kept', () => {
    expect(_interpolateBody('{"a": "x\\"{s}\\\\"}', ctx()).body).toEqual({ a: 'x"hello world\\' });
  });

  test('a placeholder string holding a quote is not a placeholder', () => {
    expect(_interpolateBody('{"a": {s ? "y" : "z"}}', ctx()).body).toEqual({ a: 'y' });
  });

  test('an object literal that does not evaluate to an object keeps v1.21.1', () => {
    expect(_interpolateBody('{ a: 1 }.a', ctx()).key).toBe('.a');
  });

  test('an object literal with a top-level pipe keeps v1.21.1', () => {
    expect(_interpolateBody('{ a: s } | json', ctx()).key).toBe(' | json');
  });

  test('a value-position placeholder of a function or undefined sends null', () => {
    expect(_interpolateBody('{"a": {nope}, "b": {s.trim}}', ctx()).body).toEqual({ a: null, b: null });
  });
});

describe('_withMutedWarnings', () => {
  test('silences _warn inside fn and restores it after a throw', () => {
    expect(_withMutedWarnings(() => { _warn('hidden'); return 1; })).toBe(1);
    expect(warn).not.toHaveBeenCalled();
    expect(() => _withMutedWarnings(() => { throw new Error('boom'); })).toThrow('boom');
    _warn('shown');
    expect(warn).toHaveBeenCalledWith('[No.JS]', 'shown');
  });
});
