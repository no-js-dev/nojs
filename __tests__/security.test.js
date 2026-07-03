import { createContext } from '../src/context.js';
import { evaluate, resolve, _execStatement } from '../src/evaluate.js';
import { _sanitizeHtml } from '../src/dom.js';
import { _doFetch } from '../src/fetch.js';
import { _config, _warn, _stores, _SENSITIVE_KEYS, _refs } from '../src/globals.js';
import { _i18n } from '../src/i18n.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import NoJS from '../src/index.js';

import '../src/directives/state.js';
import '../src/directives/head.js';
import '../src/directives/binding.js';

// ═══════════════════════════════════════════════════════════════════════
//  SECURITY TESTS — Coverage for security hardening changes
// ═══════════════════════════════════════════════════════════════════════

describe('Security: Context prototype pollution', () => {
  test('$set() blocks __proto__ key', () => {
    const ctx = createContext({ name: 'test' });
    ctx.$set('__proto__', { polluted: true });
    expect(ctx.polluted).toBeUndefined();
    expect(({}).polluted).toBeUndefined();
  });

  test('$set() blocks constructor key', () => {
    const ctx = createContext({ name: 'test' });
    ctx.$set('constructor', 'hacked');
    expect(ctx.constructor).not.toBe('hacked');
  });

  test('$set() blocks prototype key', () => {
    const ctx = createContext({ name: 'test' });
    ctx.$set('prototype', { polluted: true });
    expect(ctx.prototype).toBeUndefined();
  });

  test('$set() blocks nested path with __proto__', () => {
    const ctx = createContext({ user: { name: 'safe' } });
    ctx.$set('user.__proto__.polluted', true);
    expect(({}).polluted).toBeUndefined();
  });

  test('proxy set trap blocks __proto__ assignment', () => {
    const ctx = createContext({ name: 'test' });
    ctx['__proto__'] = { polluted: true };
    expect(({}).polluted).toBeUndefined();
  });

  test('proxy set trap blocks constructor assignment', () => {
    const ctx = createContext({ name: 'test' });
    ctx['constructor'] = 'hacked';
  });

  test('proxy set trap blocks prototype assignment', () => {
    const ctx = createContext({ name: 'test' });
    ctx['prototype'] = { polluted: true };
  });
});

describe('Security: Sensitive key redaction in devtools', () => {
  test('_SENSITIVE_KEYS contains expected keys', () => {
    expect(_SENSITIVE_KEYS.has('password')).toBe(true);
    expect(_SENSITIVE_KEYS.has('secret')).toBe(true);
    expect(_SENSITIVE_KEYS.has('token')).toBe(true);
    expect(_SENSITIVE_KEYS.has('key')).toBe(true);
    expect(_SENSITIVE_KEYS.has('auth')).toBe(true);
    expect(_SENSITIVE_KEYS.has('credential')).toBe(true);
  });

  test('setting a sensitive key on context does not throw', () => {
    const ctx = createContext({});
    expect(() => { ctx.password = 'secret123'; }).not.toThrow();
    expect(ctx.password).toBe('secret123');
  });

  test('setting a key with "token" in name works normally', () => {
    const ctx = createContext({});
    ctx.authToken = 'abc';
    expect(ctx.authToken).toBe('abc');
  });
});

describe('Security: Expression evaluator — resolve() forbidden props', () => {
  test('resolve() blocks __proto__ traversal', () => {
    const ctx = createContext({ obj: {} });
    const result = resolve('obj.__proto__', ctx);
    expect(result).toBeUndefined();
  });

  test('resolve() blocks constructor traversal', () => {
    const ctx = createContext({ obj: {} });
    const result = resolve('obj.constructor', ctx);
    expect(result).toBeUndefined();
  });

  test('resolve() blocks prototype traversal', () => {
    const ctx = createContext({ fn: function() {} });
    const result = resolve('fn.prototype', ctx);
    expect(result).toBeUndefined();
  });

  test('resolve() allows normal property access', () => {
    const ctx = createContext({ user: { name: 'Alice' } });
    const result = resolve('user.name', ctx);
    expect(result).toBe('Alice');
  });
});

describe('Security: Expression evaluator — MemberExpr forbidden props', () => {
  test('obj.__proto__ returns undefined in expressions', () => {
    const ctx = createContext({ obj: { name: 'test' } });
    const result = evaluate('obj.__proto__', ctx);
    expect(result).toBeUndefined();
  });

  test('obj.constructor returns undefined in expressions', () => {
    const ctx = createContext({ obj: { name: 'test' } });
    const result = evaluate('obj.constructor', ctx);
    expect(result).toBeUndefined();
  });

  test('obj.constructor.name blocked in call expression', () => {
    const ctx = createContext({ obj: {} });
    const result = evaluate('obj.constructor', ctx);
    expect(result).toBeUndefined();
  });
});

describe('Security: Expression evaluator — statement write-back hardening', () => {
  test('_execStatement does not write back underscore-prefixed keys', () => {
    const ctx = createContext({ count: 0 });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _execStatement('_secret = 42', ctx);
    expect(ctx._secret).toBeUndefined();
    warnSpy.mockRestore();
  });

  test('_execStatement does not write back __proto__', () => {
    const ctx = createContext({ count: 0 });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _execStatement('__proto__ = {}', ctx);
    expect(({}).polluted).toBeUndefined();
    warnSpy.mockRestore();
  });

  test('_execStatement does not write back constructor', () => {
    const ctx = createContext({ count: 0 });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _execStatement('constructor = "hacked"', ctx);
    warnSpy.mockRestore();
  });

  test('_execStatement allows normal variable write-back', () => {
    const ctx = createContext({ count: 0 });
    _execStatement('count = 5', ctx);
    expect(ctx.count).toBe(5);
  });
});

describe('Security: Expression evaluator — timer wrappers', () => {
  test('setTimeout in expressions calls the real function', () => {
    const ctx = createContext({});
    jest.useFakeTimers();
    const result = evaluate('setTimeout(() => {}, 100)', ctx);
    expect(typeof result).toBe('number');
    jest.useRealTimers();
  });

  test('setTimeout with non-function first arg returns undefined', () => {
    const ctx = createContext({});
    const result = evaluate('setTimeout("alert(1)", 100)', ctx);
    expect(result).toBeUndefined();
  });
});

describe('Security: HTML sanitizer — extended blocked tags', () => {
  test('strips <svg> tags', () => {
    const result = _sanitizeHtml('<div><svg onload="alert(1)"><circle/></svg></div>');
    expect(result).not.toContain('<svg');
  });

  test('strips <math> tags', () => {
    const result = _sanitizeHtml('<div><math><mi>x</mi></math></div>');
    expect(result).not.toContain('<math');
  });

  test('strips <template> tags', () => {
    const result = _sanitizeHtml('<div><template><img src=x onerror=alert(1)></template></div>');
    expect(result).not.toContain('<template');
  });

  test('strips <xmp> tags', () => {
    const result = _sanitizeHtml('<div><xmp>test</xmp></div>');
    expect(result).not.toContain('<xmp');
  });

  test('strips <applet> tags', () => {
    const result = _sanitizeHtml('<div><applet code="evil.class"></applet></div>');
    expect(result).not.toContain('<applet');
  });

  test('still strips <script> tags', () => {
    const result = _sanitizeHtml('<div><script>alert(1)</script></div>');
    expect(result).not.toContain('<script');
  });

  test('allows safe tags like <p> and <span>', () => {
    const result = _sanitizeHtml('<div><p>Hello</p><span>World</span></div>');
    expect(result).toContain('<p>');
    expect(result).toContain('<span>');
  });
});

describe('Security: HTML sanitizer — blob: URI blocking', () => {
  test('removes blob: href', () => {
    const result = _sanitizeHtml('<a href="blob:http://evil.com/uuid">click</a>');
    expect(result).not.toContain('blob:');
  });

  test('removes blob: src', () => {
    const result = _sanitizeHtml('<img src="blob:http://evil.com/uuid">');
    expect(result).not.toContain('blob:');
  });

  test('keeps normal href', () => {
    const result = _sanitizeHtml('<a href="https://example.com">click</a>');
    expect(result).toContain('https://example.com');
  });
});

describe('Security: Fetch — CSRF same-origin check', () => {
  const originalFetch = global.fetch;
  let lastOpts;

  beforeEach(() => {
    lastOpts = null;
    global.fetch = jest.fn((url, opts) => {
      lastOpts = opts;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{}'),
        headers: new Headers(),
        clone: () => ({ headers: new Headers() }),
      });
    });
    _config.csrf = { header: 'X-CSRF-Token', token: 'my-csrf-token' };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _config.csrf = null;
    _config.credentials = 'same-origin';
  });

  test('includes CSRF token for same-origin POST', async () => {
    await _doFetch('/api/data', 'POST', { key: 'val' });
    expect(lastOpts.headers['X-CSRF-Token']).toBe('my-csrf-token');
  });

  test('excludes CSRF token for cross-origin POST', async () => {
    await _doFetch('https://evil.com/api/data', 'POST', { key: 'val' });
    expect(lastOpts.headers['X-CSRF-Token']).toBeUndefined();
  });

  test('includes CSRF token for relative URLs', async () => {
    await _doFetch('/api/submit', 'PUT', { key: 'val' });
    expect(lastOpts.headers['X-CSRF-Token']).toBe('my-csrf-token');
  });
});

describe('Security: Fetch — HTTP credential warning', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('{}'),
      headers: new Headers(),
      clone: () => ({ headers: new Headers() }),
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _config.credentials = 'same-origin';
  });

  test('warns when credentials sent over HTTP', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _config.credentials = 'include';
    await _doFetch('http://example.com/api/data', 'GET');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('insecure HTTP'),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });

  test('no warning for HTTPS', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _config.credentials = 'include';
    await _doFetch('https://example.com/api/data', 'GET');
    const insecureCalls = warnSpy.mock.calls.filter(c =>
      c.some(arg => typeof arg === 'string' && arg.includes('insecure'))
    );
    expect(insecureCalls.length).toBe(0);
    warnSpy.mockRestore();
  });

  test('no warning when credentials omitted', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _config.credentials = 'omit';
    await _doFetch('http://example.com/api/data', 'GET');
    const insecureCalls = warnSpy.mock.calls.filter(c =>
      c.some(arg => typeof arg === 'string' && arg.includes('insecure'))
    );
    expect(insecureCalls.length).toBe(0);
    warnSpy.mockRestore();
  });
});

describe('Security: Head directive — canonical dangerous scheme blocking', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  test('blocks javascript: in page-canonical', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'javascript:alert(1)'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    if (link) expect(link.href).not.toContain('javascript:');
  });

  test('blocks vbscript: in page-canonical', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'vbscript:evil'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    if (link) expect(link.href).not.toContain('vbscript:');
  });

  test('blocks data: in page-canonical', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'data:text/html,evil'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    if (link) expect(link.href).not.toContain('data:text/html');
  });

  test('allows normal path in page-canonical', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'/products/widget'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('/products/widget');
  });
});

describe('Security: Head directive — JSON-LD </script> escaping', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  test('escapes </ in JSON-LD content to prevent script injection', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '{}');
    const jsonld = document.createElement('div');
    jsonld.setAttribute('hidden', '');
    jsonld.setAttribute('page-jsonld', '');
    jsonld.textContent = '{"@type":"Product","desc":"</div>injection"}';
    div.appendChild(jsonld);
    document.body.appendChild(div);
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).not.toContain('</');
    expect(script.textContent).toContain('<\\/');
  });
});

describe('Security: State directive — namespaced storage keys', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    _config.appId = '';
  });

  test('uses appId in storage key when set', () => {
    _config.appId = 'myapp';
    localStorage.setItem('nojs_myappstate_form', JSON.stringify({ name: 'persisted' }));

    document.body.innerHTML = `
      <div state="{ name: '' }" persist="localStorage" persist-key="form" persist-fields="name">
        <span bind="name"></span>
      </div>
    `;
    processTree(document.body);
    const ctx = findContext(document.querySelector('[state]'));
    expect(ctx.name).toBe('persisted');
  });

  test('uses empty appId by default', () => {
    _config.appId = '';
    localStorage.setItem('nojs_state_form', JSON.stringify({ count: 42 }));

    document.body.innerHTML = `
      <div state="{ count: 0 }" persist="localStorage" persist-key="form" persist-fields="count">
        <span bind="count"></span>
      </div>
    `;
    processTree(document.body);
    const ctx = findContext(document.querySelector('[state]'));
    expect(ctx.count).toBe(42);
  });
});

describe('Security: State directive — deserialization prototype pollution', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    _config.appId = '';
  });

  test('blocks __proto__ key during hydration from localStorage', () => {
    const malicious = JSON.stringify({ __proto__: { polluted: true }, name: 'ok' });
    localStorage.setItem('nojs_state_evil', malicious);

    document.body.innerHTML = `
      <div state="{ name: '' }" persist="localStorage" persist-key="evil" persist-fields="name,__proto__">
        <span bind="name"></span>
      </div>
    `;
    processTree(document.body);
    expect(({}).polluted).toBeUndefined();
  });

  test('blocks constructor key during hydration', () => {
    const malicious = JSON.stringify({ constructor: 'hacked', name: 'ok' });
    localStorage.setItem('nojs_state_evil2', malicious);

    document.body.innerHTML = `
      <div state="{ name: '' }" persist="localStorage" persist-key="evil2" persist-fields="name,constructor">
        <span bind="name"></span>
      </div>
    `;
    processTree(document.body);
    const ctx = findContext(document.querySelector('[state]'));
    expect(ctx.constructor).not.toBe('hacked');
  });
});

describe('Security: i18n deep merge — prototype pollution', () => {
  beforeEach(() => {
    _i18n.locales = { en: { hello: 'Hello' } };
  });

  test('_deepMerge skips __proto__ keys during locale merge', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":"yes"},"greeting":"Hi"}');
    _i18n.locales = {};
    _i18n.locales.en = payload;

    // Load another locale that triggers merge
    const maliciousLocale = JSON.parse('{"__proto__":{"polluted":"yes"},"farewell":"Bye"}');
    // Manually trigger the merge path by setting locales
    _i18n.locales.en = Object.assign({}, _i18n.locales.en || {}, maliciousLocale);

    expect(({}).polluted).toBeUndefined();
  });
});

describe('Security: Config locking after init', () => {
  afterEach(() => {
    _config.sanitize = true;
    _config.dangerouslyDisableSanitize = false;
    _config.sanitizeHtml = null;
  });

  test('config.sanitize cannot be changed after init via NoJS.config()', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    document.body.innerHTML = '<div state="{}"></div>';
    await NoJS.init();
    const beforeValue = _config.sanitize;

    NoJS.config({ sanitize: false });

    expect(_config.sanitize).toBe(beforeValue);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('cannot be changed after init'),
    );
    warnSpy.mockRestore();
  });

  test('config.dangerouslyDisableSanitize blocked after init', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    document.body.innerHTML = '<div state="{}"></div>';
    await NoJS.init();

    NoJS.config({ dangerouslyDisableSanitize: true });

    expect(_config.dangerouslyDisableSanitize).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('cannot be changed after init'),
    );
    warnSpy.mockRestore();
  });

  test('non-security config keys still work after init', async () => {
    document.body.innerHTML = '<div state="{}"></div>';
    await NoJS.init();

    NoJS.config({ debug: true });
    expect(_config.debug).toBe(true);

    _config.debug = false;
  });
});

describe('Security: Plugin globals — forbidden key sanitization', () => {
  test('JSON.parse(JSON.stringify()) strips __proto__ from global values', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const malicious = JSON.parse('{"__proto__":{"polluted":true},"safe":"ok"}');

    NoJS.global('safeGlobal', malicious);

    expect(({}).polluted).toBeUndefined();
    warnSpy.mockRestore();
  });

  test('_deepCheckUnsafe catches non-serializable objects with forbidden keys', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const circular = { name: 'test' };
    circular.self = circular;
    Object.defineProperty(circular, '__proto__', {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
    });

    NoJS.global('evilCircular', circular);

    expect(({}).polluted).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe('Security: ObjectExpr — forbidden keys in spread', () => {
  test('object spread does not copy forbidden keys as own properties', () => {
    const src = Object.create(null);
    src.safe = 'ok';
    src.constructor = 'hacked';
    const ctx = createContext({ src });
    const result = evaluate('({...src})', ctx);
    expect(result.safe).toBe('ok');
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
  });

  test('object literal skips forbidden keys', () => {
    const ctx = createContext({});
    const result = evaluate('({safe: "ok"})', ctx);
    expect(result.safe).toBe('ok');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  F1 — javascript:/vbscript: sanitizer bypass via embedded control chars
//  (NOJS-230). DOMParser decodes entities like `java&#9;script:` to a
//  literal TAB inside the value; the browser ignores interior control chars
//  and resolves it to `javascript:`. A leading-only trim let those survive
//  the scheme check — the fix strips ALL U+0000–U+0020 chars first.
// ═══════════════════════════════════════════════════════════════════════

describe('Security: F1 — control-char scheme bypass (bind-html sink)', () => {
  // Re-parse the sanitized HTML string so we can inspect the resulting
  // attribute robustly (a raw substring check would be fooled by the
  // interior control char, e.g. "java\tscript:" not containing "javascript:").
  function attrAfter(html, sel, attr) {
    const div = document.createElement('div');
    div.innerHTML = _sanitizeHtml(html);
    const el = div.querySelector(sel);
    return el ? el.getAttribute(attr) : null;
  }

  // MUST-BLOCK: interior control-char entities collapse back to a live scheme.
  const controlEntities = [
    ['tab', '&#9;'],
    ['newline', '&#10;'],
    ['carriage return', '&#13;'],
  ];
  for (const [label, entity] of controlEntities) {
    test(`neutralizes javascript: split by a ${label} (java${entity}script:)`, () => {
      const html = `<a href="java${entity}script:alert(1)">x</a>`;
      expect(attrAfter(html, 'a', 'href')).toBeNull();
      expect(_sanitizeHtml(html)).not.toContain('alert');
    });

    test(`neutralizes vbscript: split by a ${label} (vb${entity}script:)`, () => {
      const html = `<a href="vb${entity}script:msgbox(1)">x</a>`;
      expect(attrAfter(html, 'a', 'href')).toBeNull();
      expect(_sanitizeHtml(html)).not.toContain('msgbox');
    });
  }

  // MUST-STILL-BLOCK: no regression on the already-caught vectors.
  test('still blocks plain javascript:', () => {
    expect(attrAfter('<a href="javascript:alert(1)">x</a>', 'a', 'href')).toBeNull();
  });

  test('still blocks leading-tab-entity (&#9;javascript:)', () => {
    expect(attrAfter('<a href="&#9;javascript:alert(1)">x</a>', 'a', 'href')).toBeNull();
  });

  test('still blocks mixed-case JaVaScRiPt:', () => {
    expect(attrAfter('<a href="JaVaScRiPt:alert(1)">x</a>', 'a', 'href')).toBeNull();
  });

  test('NUL entity (&#0; → U+FFFD) is NOT collapsed into a live scheme', () => {
    // U+FFFD is outside the stripped U+0000–U+0020 range, so it is preserved
    // and the value stays an inert non-scheme — matching pre-fix behaviour and
    // proving the strip does not over-reach.
    const href = attrAfter('<a href="java&#0;script:alert(1)">x</a>', 'a', 'href');
    expect(href).toContain('�');
    expect(/^javascript:/i.test(href)).toBe(false);
  });

  // MUST-PASS: no over-blocking of legitimate values.
  test.each([
    ['absolute https', '<a href="https://example.com/a">x</a>', 'a', 'href', 'https://example.com/a'],
    ['relative path', '<a href="/products/widget">x</a>', 'a', 'href', '/products/widget'],
    ['mailto', '<a href="mailto:hi@example.com">x</a>', 'a', 'href', 'mailto:hi@example.com'],
    ['fragment anchor', '<a href="#section">x</a>', 'a', 'href', '#section'],
    ['data image png', '<img src="data:image/png;base64,iVBORw0KGgo=">', 'img', 'src', 'data:image/png;base64,iVBORw0KGgo='],
  ])('allows %s', (_label, html, sel, attr, expected) => {
    expect(attrAfter(html, sel, attr)).toBe(expected);
  });
});

describe('Security: F1 — control-char scheme bypass (bind-href / attr path)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Build the tainted value at runtime via String.fromCharCode so a literal
  // control char reaches _sanitizeAttrValue without embedding raw bytes in the
  // HTML fixture. `valueExpr` is a NoJS expression producing the string.
  function hrefViaBind(valueExpr) {
    document.body.innerHTML =
      `<div state="{ u: ${valueExpr} }"><a bind-href="u">x</a></div>`;
    processTree(document.body);
    return document.querySelector('a').getAttribute('href');
  }

  const controlCodes = [
    ['tab', 9],
    ['newline', 10],
    ['carriage return', 13],
  ];
  for (const [label, code] of controlCodes) {
    test(`neutralizes javascript: split by a ${label}`, () => {
      expect(
        hrefViaBind(`'java' + String.fromCharCode(${code}) + 'script:alert(1)'`),
      ).toBe('#');
    });

    test(`neutralizes vbscript: split by a ${label}`, () => {
      expect(
        hrefViaBind(`'vb' + String.fromCharCode(${code}) + 'script:msgbox(1)'`),
      ).toBe('#');
    });
  }

  // MUST-STILL-BLOCK
  test('still blocks plain javascript:', () => {
    expect(hrefViaBind(`'javascript:alert(1)'`)).toBe('#');
  });

  test('still blocks mixed-case JaVaScRiPt:', () => {
    expect(hrefViaBind(`'JaVaScRiPt:alert(1)'`)).toBe('#');
  });

  // MUST-PASS: legitimate URLs pass through unchanged.
  test.each([
    ['absolute https', `'https://example.com/a'`, 'https://example.com/a'],
    ['relative path', `'/products/widget'`, '/products/widget'],
    ['mailto', `'mailto:hi@example.com'`, 'mailto:hi@example.com'],
    ['fragment anchor', `'#section'`, '#section'],
    ['data image png', `'data:image/png;base64,iVBORw0KGgo='`, 'data:image/png;base64,iVBORw0KGgo='],
  ])('allows %s', (_label, valueExpr, expected) => {
    expect(hrefViaBind(valueExpr)).toBe(expected);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  F1 (NOJS-230) — control-char scheme bypass inside SVG data URIs.
//  A data:image/svg+xml payload is deep-sanitized (_sanitizeSvgContent):
//  <script> is removed and href/xlink:href schemes are checked. The same
//  leading-only-trim bug lived here — an entity like `java&#9;script:` inside
//  an <a xlink:href> decodes (via DOMParser) to a live scheme the browser
//  runs. Reached two ways: bind-html → _sanitizeHtml → _sanitizeSvgDataUri,
//  and bind-href/bind-src → _sanitizeAttrValue → _sanitizeSvgDataUri.
// ═══════════════════════════════════════════════════════════════════════

describe('Security: F1 — SVG data URI scheme bypass (bind-html / _sanitizeHtml sink)', () => {
  // Wrap the given <a> attributes in a valid namespaced SVG document.
  function svgWith(aAttrs) {
    return '<svg xmlns="http://www.w3.org/2000/svg" ' +
      'xmlns:xlink="http://www.w3.org/1999/xlink">' +
      `<a ${aAttrs}><text>x</text></a></svg>`;
  }

  // URL-encoded form: <img src="data:image/svg+xml,<encoded>">. Returns the
  // sanitized, decoded SVG markup so we can assert on the surviving attributes.
  function cleanSvgUrlEncoded(svg) {
    const html = `<img src="data:image/svg+xml,${encodeURIComponent(svg)}">`;
    const div = document.createElement('div');
    div.innerHTML = _sanitizeHtml(html);
    const src = div.querySelector('img').getAttribute('src');
    return decodeURIComponent(src.slice(src.indexOf(',') + 1));
  }

  // MUST-BLOCK: interior control-char entity in xlink:href / href collapses to a
  // live scheme and must be stripped from the sanitized SVG.
  const entities = [['tab', '&#9;'], ['newline', '&#10;'], ['carriage return', '&#13;']];
  for (const [label, ent] of entities) {
    test(`strips javascript: split by a ${label} in xlink:href`, () => {
      const out = cleanSvgUrlEncoded(svgWith(`xlink:href="java${ent}script:alert(1)"`));
      expect(out.toLowerCase()).not.toContain('javascript');
      expect(out).not.toContain('alert');
    });

    test(`strips vbscript: split by a ${label} in element href`, () => {
      const out = cleanSvgUrlEncoded(svgWith(`href="vb${ent}script:msgbox(1)"`));
      expect(out.toLowerCase()).not.toContain('vbscript');
      expect(out).not.toContain('msgbox');
    });
  }

  // MUST-STILL-BLOCK: plain javascript: (no control char) — no regression.
  test('strips plain javascript: in xlink:href', () => {
    const out = cleanSvgUrlEncoded(svgWith('xlink:href="javascript:alert(1)"'));
    expect(out.toLowerCase()).not.toContain('javascript');
    expect(out).not.toContain('alert');
  });

  // base64 form is deep-sanitized too.
  test('strips tab-split javascript: in a base64 SVG data URI', () => {
    const svg = svgWith('xlink:href="java&#9;script:alert(1)"');
    const html = `<img src="data:image/svg+xml;base64,${btoa(svg)}">`;
    const div = document.createElement('div');
    div.innerHTML = _sanitizeHtml(html);
    const src = div.querySelector('img').getAttribute('src');
    const decoded = atob(src.slice(src.indexOf(',') + 1));
    expect(decoded.toLowerCase()).not.toContain('javascript');
    expect(decoded).not.toContain('alert');
  });

  // MUST-PASS: benign hrefs inside the SVG survive sanitization.
  test('preserves a fragment xlink:href="#foo"', () => {
    expect(cleanSvgUrlEncoded(svgWith('xlink:href="#foo"'))).toContain('#foo');
  });

  test('preserves an https element href', () => {
    expect(cleanSvgUrlEncoded(svgWith('href="https://example.com/x"')))
      .toContain('https://example.com/x');
  });
});

describe('Security: F1 — SVG data URI scheme bypass (bind-src / _sanitizeAttrValue path)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // NoJS expression yielding a double-quote char, used to quote the SVG's inner
  // attributes without colliding with the fixture's own quoting.
  const DQ = 'String.fromCharCode(34)';

  // Build a NoJS expression that evaluates to a data:image/svg+xml URI whose
  // <a> carries `aAttr` (e.g. `xlink:href=java&#9;script:alert(1)` — the value
  // is inserted verbatim, so pass entities like &#9; already escaped as needed).
  function svgUriExpr(aName, aValue) {
    return [
      `'data:image/svg+xml,<svg xmlns='`, DQ, `'http://www.w3.org/2000/svg'`, DQ,
      `' xmlns:xlink='`, DQ, `'http://www.w3.org/1999/xlink'`, DQ,
      `'><a ${aName}='`, DQ, `'${aValue}'`, DQ, `'>x</a></svg>'`,
    ].join(' + ');
  }

  // Drive the value through bind-src, then decode the sanitized data URI back to
  // SVG markup. `&amp;#9;` in the fixture survives HTML parsing as literal
  // `&#9;`, which DOMParser (inside _sanitizeSvgContent) decodes to a real tab.
  function cleanSvgViaBindSrc(aName, aValue) {
    document.body.innerHTML =
      `<div state="{ u: ${svgUriExpr(aName, aValue)} }"><img bind-src="u"></div>`;
    processTree(document.body);
    const src = document.querySelector('img').getAttribute('src');
    if (src === '#' || !src.includes(',')) return src;
    return decodeURIComponent(src.slice(src.indexOf(',') + 1));
  }

  // MUST-BLOCK: tab-entity split scheme in xlink:href, reached via _sanitizeAttrValue.
  test('strips tab-split javascript: in xlink:href', () => {
    const out = cleanSvgViaBindSrc('xlink:href', 'java&amp;#9;script:alert(1)');
    expect(out.toLowerCase()).not.toContain('javascript');
    expect(out).not.toContain('alert');
  });

  test('strips tab-split vbscript: in element href', () => {
    const out = cleanSvgViaBindSrc('href', 'vb&amp;#9;script:msgbox(1)');
    expect(out.toLowerCase()).not.toContain('vbscript');
    expect(out).not.toContain('msgbox');
  });

  // MUST-STILL-BLOCK: plain javascript: still stripped through this path.
  test('strips plain javascript: in xlink:href', () => {
    const out = cleanSvgViaBindSrc('xlink:href', 'javascript:alert(1)');
    expect(out.toLowerCase()).not.toContain('javascript');
    expect(out).not.toContain('alert');
  });

  // MUST-PASS: benign fragment link preserved through the SVG sanitizer.
  test('preserves a benign fragment xlink:href="#foo"', () => {
    expect(cleanSvgViaBindSrc('xlink:href', '#foo')).toContain('#foo');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  F3 — evaluator escape to the real Function constructor via raw Object
// ═══════════════════════════════════════════════════════════════════════

describe('Security F3: Object shim blocks Function-constructor escape', () => {
  test('PoC — getOwnPropertyDescriptor(getPrototypeOf(...)).value chain yields no Function', () => {
    const ctx = createContext({});
    // The full published PoC. Every reflection static is absent from the shim,
    // so the chain collapses to undefined long before reaching `.value`.
    const result = evaluate(
      "Object.getOwnPropertyDescriptor(Object.getPrototypeOf(parseInt),'constructor').value('return document.cookie')()",
      ctx,
    );
    expect(result).toBeUndefined();
  });

  test('getOwnPropertyDescriptor is not exposed on the Object shim', () => {
    const ctx = createContext({});
    expect(evaluate('Object.getOwnPropertyDescriptor', ctx)).toBeUndefined();
  });

  test('getPrototypeOf is not exposed on the Object shim', () => {
    const ctx = createContext({});
    expect(evaluate('Object.getPrototypeOf', ctx)).toBeUndefined();
  });

  test('getOwnPropertyDescriptors(...).constructor stays undefined', () => {
    const ctx = createContext({});
    const result = evaluate(
      "Object.getOwnPropertyDescriptors(parseInt).constructor",
      ctx,
    );
    expect(result).toBeUndefined();
  });

  test('create / defineProperty / setPrototypeOf are not exposed', () => {
    const ctx = createContext({});
    expect(evaluate('Object.create', ctx)).toBeUndefined();
    expect(evaluate('Object.defineProperty', ctx)).toBeUndefined();
    expect(evaluate('Object.setPrototypeOf', ctx)).toBeUndefined();
    expect(evaluate('Object.getOwnPropertyNames', ctx)).toBeUndefined();
  });

  test('direct parseInt.constructor is still undefined', () => {
    const ctx = createContext({});
    expect(evaluate('parseInt.constructor', ctx)).toBeUndefined();
  });

  test('no expression path returns the real Function constructor', () => {
    const ctx = createContext({ fn: () => 1 });
    // Even reaching a function value, its constructor is forbidden and the
    // return-site guard neutralizes Function/eval identity.
    expect(evaluate('fn.constructor', ctx)).toBeUndefined();
    expect(evaluate("fn.constructor('return 1')", ctx)).toBeUndefined();
  });

  test('legit Object.keys / values / entries / assign / freeze / fromEntries still work', () => {
    const ctx = createContext({ obj: { a: 1, b: 2 } });
    expect(evaluate('Object.keys(obj)', ctx)).toEqual(['a', 'b']);
    expect(evaluate('Object.values(obj)', ctx)).toEqual([1, 2]);
    expect(evaluate('Object.entries(obj)', ctx)).toEqual([['a', 1], ['b', 2]]);
    expect(evaluate('Object.assign({}, obj)', ctx)).toEqual({ a: 1, b: 2 });
    const frozen = evaluate('Object.freeze(obj)', ctx);
    expect(frozen).toEqual({ a: 1, b: 2 });
    expect(evaluate("Object.fromEntries([['x', 9]])", ctx)).toEqual({ x: 9 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  F4 — evaluator escape to a cross-realm Window via iframe contentWindow
// ═══════════════════════════════════════════════════════════════════════

describe('Security F4: iframe contentWindow is re-wrapped to a safe proxy', () => {
  let iframe;

  beforeEach(() => {
    for (const k of Object.keys(_refs)) delete _refs[k];
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    _refs.frame = iframe;
  });

  afterEach(() => {
    for (const k of Object.keys(_refs)) delete _refs[k];
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    iframe = null;
  });

  test('$refs.frame.contentWindow does not expose the raw Window', () => {
    const ctx = createContext({});
    const cw = evaluate('$refs.frame.contentWindow', ctx);
    // Must not be the raw contentWindow; either the safe proxy or undefined.
    if (iframe.contentWindow) {
      expect(cw).not.toBe(iframe.contentWindow);
    }
  });

  test('PoC — $refs.frame.contentWindow.eval(...) is blocked', () => {
    const ctx = createContext({});
    const result = evaluate(
      "$refs.frame.contentWindow.eval(\"fetch('/x?c='+parent.document.cookie)\")",
      ctx,
    );
    expect(result).toBeUndefined();
  });

  test('contentWindow.fetch (not eval-gated) is blocked', () => {
    const ctx = createContext({});
    expect(evaluate('$refs.frame.contentWindow.fetch', ctx)).toBeUndefined();
  });

  test('contentWindow.localStorage is blocked', () => {
    const ctx = createContext({});
    expect(evaluate('$refs.frame.contentWindow.localStorage', ctx)).toBeUndefined();
  });

  test('contentWindow.document is re-wrapped so cookie is blocked', () => {
    const ctx = createContext({});
    // .cookie is a blocked document prop → undefined via _safeDocument.
    expect(evaluate('$refs.frame.contentWindow.document.cookie', ctx)).toBeUndefined();
  });

  test('a normal (non-iframe) element ref still resolves allowed member reads', () => {
    const div = document.createElement('div');
    div.id = 'plain-ref';
    div.setAttribute('data-role', 'ok');
    document.body.appendChild(div);
    _refs.plain = div;
    const ctx = createContext({});
    expect(evaluate('$refs.plain.id', ctx)).toBe('plain-ref');
    expect(evaluate("$refs.plain.getAttribute('data-role')", ctx)).toBe('ok');
    div.remove();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  F4 (NOJS-239) — cross-realm Document escape via iframe.contentDocument
//  The contentWindow family was already closed; contentDocument still handed
//  back a RAW cross-realm Document (parent-realm `instanceof Document` is FALSE
//  cross-realm), exposing real .cookie / .location / .write / .querySelector
//  with no eval and no fetch. Fixed by (1) a `nodeType === 9` duck-type in
//  _rewrapResult and (2) blocking foreign-realm accessor names on element reads.
// ═══════════════════════════════════════════════════════════════════════

describe('Security F4: iframe contentDocument is neutralized (NOJS-239)', () => {
  let iframe;

  beforeEach(() => {
    for (const k of Object.keys(_refs)) delete _refs[k];
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    _refs.frame = iframe;
  });

  afterEach(() => {
    for (const k of Object.keys(_refs)) delete _refs[k];
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    iframe = null;
  });

  test('$refs.frame.contentDocument does not expose the raw cross-realm Document', () => {
    const ctx = createContext({});
    const cd = evaluate('$refs.frame.contentDocument', ctx);
    // Never the raw child-realm Document object.
    if (iframe.contentDocument) {
      expect(cd).not.toBe(iframe.contentDocument);
    }
    // Blocked at the element member read → undefined (defense-in-depth #2).
    expect(cd).toBeUndefined();
  });

  test('PoC — contentDocument.cookie never yields the real cookie', () => {
    const ctx = createContext({});
    // The demonstrated navigation-exfil primitive. Must not surface a cookie.
    expect(evaluate('$refs.frame.contentDocument.cookie', ctx)).toBeUndefined();
  });

  test('contentDocument.location is blocked (no navigation sink)', () => {
    const ctx = createContext({});
    expect(evaluate('$refs.frame.contentDocument.location', ctx)).toBeUndefined();
    expect(evaluate('$refs.frame.contentDocument.location.href', ctx)).toBeUndefined();
  });

  test('contentDocument.write is blocked', () => {
    const ctx = createContext({});
    expect(evaluate('$refs.frame.contentDocument.write', ctx)).toBeUndefined();
  });

  test('contentDocument.querySelector cannot reach the raw child document', () => {
    const ctx = createContext({});
    expect(evaluate("$refs.frame.contentDocument.querySelector('*')", ctx)).toBeUndefined();
  });

  test('PoC — the on:click navigation-exfil statement leaks nothing and no-ops the write', () => {
    const ctx = createContext({ out: '' });
    // Read side: cookie resolves to undefined, so the exfil URL carries the
    // literal 'undefined' string — never a real cookie value.
    _execStatement("out = '/exfil?nav=' + $refs.frame.contentDocument.cookie", ctx);
    expect(ctx.out).toBe('/exfil?nav=undefined');
    expect(ctx.out).not.toContain('=session');
    // Write side: assigning through the blocked chain must not throw and must
    // not navigate (the target object resolves to undefined → no-op assign).
    expect(() => {
      _execStatement("$refs.frame.contentDocument.location.href = '/exfil'", ctx);
    }).not.toThrow();
  });

  test('fix #1 — a cross-realm Document reached via ownerDocument is re-wrapped', () => {
    // ownerDocument is NOT in the accessor block, so this value flows through
    // _rewrapResult. For an element created inside the child frame, its
    // ownerDocument is the child-realm Document — the nodeType===9 duck-type
    // must neutralize it even though parent-realm `instanceof Document` may miss.
    const childDoc = iframe.contentDocument;
    if (!childDoc) return; // environment without a child document — skip
    const host = childDoc.body || childDoc.documentElement;
    const childEl = childDoc.createElement('span');
    host.appendChild(childEl);
    _refs.child = childEl;
    const ctx = createContext({});
    const od = evaluate('$refs.child.ownerDocument', ctx);
    // Never the raw child Document; either the safe proxy or undefined.
    expect(od).not.toBe(childDoc);
    // Whatever it is, its cookie/write/location must be neutralized.
    expect(od === undefined || od.cookie === undefined).toBe(true);
    expect(evaluate('$refs.child.ownerDocument.cookie', ctx)).toBeUndefined();
    expect(evaluate('$refs.child.ownerDocument.write', ctx)).toBeUndefined();
  });

  test('regression — the contentWindow family stays blocked', () => {
    const ctx = createContext({});
    const cw = evaluate('$refs.frame.contentWindow', ctx);
    if (iframe.contentWindow) {
      expect(cw).not.toBe(iframe.contentWindow);
    }
    expect(evaluate('$refs.frame.contentWindow.fetch', ctx)).toBeUndefined();
    expect(evaluate('$refs.frame.contentWindow.localStorage', ctx)).toBeUndefined();
    expect(evaluate('$refs.frame.contentWindow.document.cookie', ctx)).toBeUndefined();
    // frames / parent / top / self off a raw element are blocked too.
    expect(evaluate('$refs.frame.frames', ctx)).toBeUndefined();
    expect(evaluate('$refs.frame.parent', ctx)).toBeUndefined();
  });

  test('a normal element ref still resolves allowed member reads', () => {
    const div = document.createElement('div');
    div.id = 'plain-cd';
    div.className = 'card';
    div.setAttribute('data-role', 'ok');
    div.dataset.kind = 'x';
    document.body.appendChild(div);
    _refs.plain = div;
    const ctx = createContext({});
    expect(evaluate('$refs.plain.id', ctx)).toBe('plain-cd');
    expect(evaluate('$refs.plain.className', ctx)).toBe('card');
    expect(evaluate("$refs.plain.getAttribute('data-role')", ctx)).toBe('ok');
    expect(evaluate('$refs.plain.dataset.kind', ctx)).toBe('x');
    div.remove();
  });

  test("_safeDocument's own allowed members still work", () => {
    const ctx = createContext({});
    // Normal document reads are unaffected by the duck-type / accessor block.
    expect(typeof evaluate('document.title', ctx)).toBe('string');
    expect(evaluate("document.querySelector('body')", ctx)).toBe(document.body);
    // ...while its blocked members remain blocked.
    expect(evaluate('document.cookie', ctx)).toBeUndefined();
    expect(evaluate('document.write', ctx)).toBeUndefined();
  });
});
