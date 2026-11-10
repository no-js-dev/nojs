import { _stores, _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree, _disposeTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';
import { evaluate } from '../src/evaluate.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/head.js';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.title = '';
});

afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.title = '';
  Object.keys(_stores).forEach(k => delete _stores[k]);
});

// ─── page-title ───────────────────────────────────────────────────────────────

describe('page-title directive', () => {
  test('sets document.title from a string literal expression', () => {
    document.body.innerHTML = `<div hidden page-title="'About Us | Site'"></div>`;
    processTree(document.body);
    expect(document.title).toBe('About Us | Site');
  });

  test('evaluates expression against local state context', () => {
    document.body.innerHTML = `
      <div state='{"name":"My Product"}'>
        <div hidden page-title="name + ' | Store'"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.title).toBe('My Product | Store');
  });

  test('updates document.title reactively when state changes', async () => {
    document.body.innerHTML = `
      <div state='{"name":"First"}'>
        <div hidden page-title="name + ' | Site'"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.title).toBe('First | Site');

    const ctx = findContext(document.querySelector('[state]'));
    ctx.$set('name', 'Second');
    await new Promise(r => setTimeout(r, 10));
    expect(document.title).toBe('Second | Site');
  });

  test('does not set title when expression evaluates to null', () => {
    document.title = 'Original';
    document.body.innerHTML = `
      <div state="{ val: null }">
        <div hidden page-title="val"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.title).toBe('Original');
  });
});

// ─── page-description ─────────────────────────────────────────────────────────

describe('page-description directive', () => {
  test('creates <meta name="description"> if not present', () => {
    document.body.innerHTML = `<div hidden page-description="'Great product'"></div>`;
    processTree(document.body);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta.content).toBe('Great product');
  });

  test('updates existing <meta name="description"> content', () => {
    const existing = document.createElement('meta');
    existing.name = 'description';
    existing.content = 'Old description';
    document.head.appendChild(existing);

    document.body.innerHTML = `<div hidden page-description="'New description'"></div>`;
    processTree(document.body);
    const metas = document.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
    expect(metas[0].content).toBe('New description');
  });

  test('updates reactively when state changes', async () => {
    document.body.innerHTML = `
      <div state='{"desc":"First desc"}'>
        <div hidden page-description="desc"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('meta[name="description"]').content).toBe('First desc');

    const ctx = findContext(document.querySelector('[state]'));
    ctx.$set('desc', 'Second desc');
    await new Promise(r => setTimeout(r, 10));
    expect(document.querySelector('meta[name="description"]').content).toBe('Second desc');
  });
});

// ─── page-canonical ───────────────────────────────────────────────────────────

describe('page-canonical directive', () => {
  test('creates <link rel="canonical"> if not present', () => {
    document.body.innerHTML = `<div hidden page-canonical="'/products/sneaker-x'"></div>`;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('/products/sneaker-x');
  });

  test('updates existing <link rel="canonical"> href', () => {
    const existing = document.createElement('link');
    existing.rel = 'canonical';
    existing.href = '/old';
    document.head.appendChild(existing);

    document.body.innerHTML = `<div hidden page-canonical="'/new-path'"></div>`;
    processTree(document.body);
    const links = document.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].href).toContain('/new-path');
  });

  test('evaluates expression with state', () => {
    document.body.innerHTML = `
      <div state='{"slug":"sneaker-x"}'>
        <div hidden page-canonical="'/products/' + slug"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('link[rel="canonical"]').href).toContain('/products/sneaker-x');
  });
});

// ─── page-jsonld ──────────────────────────────────────────────────────────────

// Note: <script> elements are skipped by processTree (registry.js line 71).
// page-jsonld must be placed on a non-script element such as <div hidden>.
describe('page-jsonld directive', () => {
  test('creates <script type="application/ld+json" data-nojs> in head', () => {
    document.body.innerHTML = `
      <div state='{"name":"Sneaker X","price":299}'>
        <div hidden page-jsonld>{"@type":"Product","name":"{name}","price":"{price}"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('Sneaker X');
    expect(script.textContent).toContain('299');
  });

  test('updates existing managed script tag without creating duplicates', () => {
    document.body.innerHTML = `<div hidden page-jsonld>{"@type":"Thing","name":"First"}</div>`;
    processTree(document.body);
    document.head.querySelectorAll('script[data-nojs]'); // sanity
    document.body.innerHTML = `<div hidden page-jsonld>{"@type":"Thing","name":"Second"}</div>`;
    processTree(document.body);
    const scripts = document.querySelectorAll('script[type="application/ld+json"][data-nojs]');
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).toContain('Second');
  });

  test('renders valid JSON-LD from pretty-printed template (documented example)', () => {
    // This is the exact pattern from the head.js header comment (lines 15-17).
    // Before the regex fix, pretty-printed JSON with { "key": ... } was
    // corrupted because the interpolation regex treated { " as a placeholder.
    document.body.innerHTML = `
      <div state='{"product":{"name":"Sneaker X"}}'>
        <div hidden page-jsonld>
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{product.name}"
}
        </div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    const parsed = JSON.parse(script.textContent);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('Product');
    expect(parsed.name).toBe('Sneaker X');
  });

  test('{name} and { name } placeholders still interpolate correctly', () => {
    document.body.innerHTML = `
      <div state='{"title":"Widget","brand":"Acme"}'>
        <div hidden page-jsonld>{"@type":"Product","name":"{title}","brand":"{ brand }"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    const parsed = JSON.parse(script.textContent);
    expect(parsed.name).toBe('Widget');
    expect(parsed.brand).toBe('Acme');
  });

  test('compact JSON-LD {"@type":...} passes through unchanged', () => {
    // No state context — static JSON should pass through verbatim.
    document.body.innerHTML = `
      <div hidden page-jsonld>{"@context":"https://schema.org","@type":"Product","name":"Static"}</div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    const parsed = JSON.parse(script.textContent);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('Product');
    expect(parsed.name).toBe('Static');
  });

  test('nested JSON objects in pretty-printed JSON-LD survive without corruption', () => {
    document.body.innerHTML = `
      <div state='{"productName":"Widget","productPrice":49.99}'>
        <div hidden page-jsonld>
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{productName}",
  "offers": {
    "@type": "Offer",
    "price": "{productPrice}",
    "priceCurrency": "USD"
  }
}
        </div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    const parsed = JSON.parse(script.textContent);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('Product');
    expect(parsed.name).toBe('Widget');
    expect(parsed.offers['@type']).toBe('Offer');
    expect(parsed.offers.price).toBe('49.99');
    expect(parsed.offers.priceCurrency).toBe('USD');
  });

  test('empty braces {} and whitespace-only braces {  } are not treated as interpolation', () => {
    // Empty and whitespace-only braces should pass through verbatim
    // so JSON like {"key": {}} remains valid.
    document.body.innerHTML = `
      <div hidden page-jsonld>{"@type":"Product","extras":{},"meta":{  }}</div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    const parsed = JSON.parse(script.textContent);
    expect(parsed['@type']).toBe('Product');
    expect(parsed.extras).toEqual({});
    expect(parsed.meta).toEqual({});
  });

  test('JSON-LD with array values and mixed structural/interpolated braces', () => {
    document.body.innerHTML = `
      <div state='{"brandName":"Acme","itemUrl":"https://example.com/item"}'>
        <div hidden page-jsonld>
{
  "@context": "https://schema.org",
  "@type": "Product",
  "brand": {
    "@type": "Brand",
    "name": "{brandName}"
  },
  "url": "{itemUrl}",
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "color",
      "value": "red"
    }
  ]
}
        </div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    const parsed = JSON.parse(script.textContent);
    expect(parsed.brand['@type']).toBe('Brand');
    expect(parsed.brand.name).toBe('Acme');
    expect(parsed.url).toBe('https://example.com/item');
    expect(parsed.additionalProperty[0]['@type']).toBe('PropertyValue');
    expect(parsed.additionalProperty[0].value).toBe('red');
  });

  test('does not affect hand-written JSON-LD without data-nojs attribute', () => {
    const manual = document.createElement('script');
    manual.type = 'application/ld+json';
    manual.textContent = '{"@type":"WebSite","name":"My Site"}';
    document.head.appendChild(manual);

    document.body.innerHTML = `<div hidden page-jsonld>{"@type":"Product"}</div>`;
    processTree(document.body);

    const allScripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(allScripts.length).toBe(2);
    // Original untouched
    expect(allScripts[0].textContent).toContain('WebSite');
  });
});

// ─── hardening: XSS guards, null values, disposal cleanup ─────────────────────

describe('page-description — null values and disposal', () => {
  test('does not create meta when expression evaluates to null', () => {
    document.body.innerHTML = `
      <div state="{ desc: null }">
        <div hidden page-description="desc"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  test('removes created meta on disposal', () => {
    document.body.innerHTML = `
      <div state="{ desc: 'Disposable' }">
        <div hidden page-description="desc" id="desc-host"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('meta[name="description"]')).not.toBeNull();

    _disposeTree(document.body);
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});

describe('page-canonical — XSS guards, null values and disposal', () => {
  test('blocks javascript: protocol in canonical URL (XSS guard)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'javascript:alert(1)'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    // Blocked value: either no link created, or href neutered
    expect(link ? link.href : '').not.toContain('javascript:');
  });

  test('blocks vbscript: protocol in canonical URL (XSS guard)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'vbscript:MsgBox(1)'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link ? link.href : '').not.toContain('vbscript:');
  });

  test('blocks data: protocol in canonical URL (XSS guard)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'data:text/html,<h1>XSS</h1>'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link ? link.href : '').not.toContain('data:text/html');
  });

  test('allows https: canonical URLs', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'https://example.com/about'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/about');
  });

  test('does not create link when expression evaluates to null', () => {
    document.body.innerHTML = `
      <div state="{ url: null }">
        <div hidden page-canonical="url"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  test('removes created canonical link on disposal', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'/disposable'"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('link[rel="canonical"]')).not.toBeNull();

    _disposeTree(document.body);
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});

describe('page-jsonld — injection guards, empty values and disposal', () => {
  test('escapes </ sequences to prevent script injection', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld>{"@type":"WebPage","name":"Test</script>"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    // The </ must be escaped to <\\/ so the payload cannot close the script tag
    expect(script ? script.textContent : '').not.toContain('</script>');
  });

  test('does nothing when element body is empty', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('script[type="application/ld+json"][data-nojs]')).toBeNull();
  });

  test('removes created JSON-LD script on disposal', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld>{"@type":"WebPage","name":"Disposable"}</div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('script[type="application/ld+json"][data-nojs]')).not.toBeNull();

    _disposeTree(document.body);
    expect(document.querySelector('script[type="application/ld+json"][data-nojs]')).toBeNull();
  });

  test('handles malformed JSON gracefully (does not throw)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld>{"@type": "WebPage", "name": unclosed</div>
      </div>
    `;
    expect(() => processTree(document.body)).not.toThrow();
  });

  test('handles {placeholder} that evaluates to null (renders empty string)', () => {
    document.body.innerHTML = `
      <div state="{ val: null }">
        <div hidden page-jsonld>{"@type":"WebPage","name":"{val}"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('"name":""');
  });
});

// ─── page-jsonld value escaping: v1.21.1 bytes by default, strictJsonld ─────

describe('page-jsonld value escaping', () => {
  const U = '\\' + 'u';
  const ldText = () =>
    document.querySelector('script[type="application/ld+json"][data-nojs]').textContent;
  const attr = (s) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');

  // v1.21.1 head.js _interpolateRaw plus its "</" post-pass, verbatim.
  function v1211(tpl, data) {
    const ctx = createContext(data);
    return tpl.replace(/\{\s*([^}"'{\s][^}]*)\}/g, (_, expr) => {
      try {
        const val = evaluate(expr.trim(), ctx);
        return val != null ? String(val) : '';
      } catch (_) {
        return '';
      }
    }).replace(/<\//g, '<\\/');
  }

  function emit(tpl, data) {
    document.body.innerHTML =
      `<div state='${attr(JSON.stringify(data))}'><div hidden page-jsonld>${attr(tpl)}</div></div>`;
    processTree(document.body);
    return ldText();
  }

  const isValid = (s) => {
    try { JSON.parse(s); return true; } catch (_) { return false; }
  };

  afterEach(() => {
    _config.strictJsonld = false;
  });

  test('strictJsonld defaults to false', () => {
    expect(_config.strictJsonld).toBe(false);
  });

  // Every output that was valid JSON on v1.21.1 is kept byte-for-byte.
  const parityValid = [
    ['a plain quoted value (documented example)', '{"@type":"Product","name":"{product.name}","price":"{product.price}"}', { product: { name: 'Sneaker X', price: 49.99 } }],
    ['a pre-escaped quoted value', '{"name":"{v}"}', { v: 'Say \\"hi\\"' }],
    ['a quoted value with \\n text', '{"d":"{v}"}', { v: 'line\\nbreak' }],
    ['a quoted value with a unicode escape as text', '{"n":"{v}"}', { v: 'caf' + U + '00e9' }],
    ['a quoted value with \\/ text', '{"u":"{v}"}', { v: 'https:\\/\\/x.example\\/a' }],
    ['a quoted value with an escaped backslash', '{"p":"{v}"}', { v: 'C:\\\\dir' }],
    ['the list.join(\'","\') pattern', '{"sameAs":["{list.join(\'","\')}"]}', { list: ['https://a.example', 'https://b.example'] }],
    ['a raw JSON fragment', '{"@type":"Product","offers":{o}}', { o: '{"price":5,"name":"A \\"B\\""}' }],
    ['a raw JSON.stringify(...) placeholder', '{"@type":"Article","author":{JSON.stringify(author)}}', { author: { '@type': 'Person', name: 'Ana' } }],
    ['raw numbers and booleans', '{"p":{p},"n":{n},"b":{b}}', { p: 5.5, n: 0, b: false }],
    ['a pre-escaped value next to a raw fragment', '{"name":"{v}","offers":{o}}', { v: 'Say \\"hi\\"', o: '[1,2]' }],
    ['a value that injects a property (valid JSON on v1.21.1)', '{"@type":"SearchResultsPage","name":"{q}"}', { q: 'x","@type":"Organization' }],
    ['a quoted value containing </script>', '{"name":"{v}"}', { v: '</script><b>x' }],
    ['a quoted value containing <', '{"name":"{v}"}', { v: 'a < b' }],
    ['a raw fragment containing </script>', '{"o":{o}}', { o: '{"x":"</script><i>"}' }],
    ['null, undefined and failing placeholders', '{"a":"{n}","b":"{missing.deep}","c":"{u}"}', { n: null }],
    ['a pretty-printed template', '{\n  "name": "{v}",\n  "offers": { o }\n}', { v: 'X', o: '{"price":5}' }],
  ];

  test.each(parityValid)('default: %s equals the v1.21.1 output exactly', (_, tpl, data) => {
    const expected = v1211(tpl, data);
    expect(isValid(expected)).toBe(true);
    expect(emit(tpl, data)).toBe(expected);
  });

  test('default: the list.join pattern and pre-escaped values keep their v1.21.1 data', () => {
    expect(JSON.parse(emit('{"sameAs":["{list.join(\'","\')}"]}', { list: ['https://a.example', 'https://b.example'] })))
      .toEqual({ sameAs: ['https://a.example', 'https://b.example'] });
    expect(JSON.parse(emit('{"name":"{v}"}', { v: 'Say \\"hi\\"' }))).toEqual({ name: 'Say "hi"' });
    expect(JSON.parse(emit('{"n":"{v}"}', { v: 'caf' + U + '00e9' }))).toEqual({ n: 'café' });
  });

  test('default: a value can still inject a property, exactly as on v1.21.1', () => {
    const out = emit('{"@type":"SearchResultsPage","name":"{q}"}', { q: 'x","@type":"Organization' });
    expect(out).toBe('{"@type":"SearchResultsPage","name":"x","@type":"Organization"}');
    expect(JSON.parse(out)['@type']).toBe('Organization');
  });

  test('default: </script> in a value never closes the script element (v1.21.1 "<\\/" pass)', () => {
    const out = emit('{"name":"{v}","o":{o}}', { v: 'a</script><b>', o: '{"x":"</script>"}' });
    expect(out).not.toContain('</');
    expect(JSON.parse(out)).toEqual({ name: 'a</script><b>', o: { x: '</script>' } });
  });

  // Invalid JSON on v1.21.1: the default keeps the v1.21.1 bytes; strictJsonld
  // escapes quoted values, which repairs the ones listed with a parsed result.
  const invalidOnV1211 = [
    ['an empty raw placeholder', '{"@type":"Product","offers":{o}}', {}, null],
    ['a raw non-JSON value containing <', '{"n":{v}}', { v: '1</script><img src=x>' }, null],
    ['a template with a trailing comma', '{"name":"{v}",}', { v: 'He said "hi"' }, null],
    ['a raw value with an unescaped quote', '{"o":{o}}', { o: '{"a":"b"c"}' }, null],
    ['an unescaped quote', '{"@type":"Product","name":"{v}"}', { v: '27" Monitor' }, { '@type': 'Product', name: '27" Monitor' }],
    ['a lone backslash', '{"p":"{v}"}', { v: 'C:\\dir' }, { p: 'C:\\dir' }],
    ['a backslash and a real newline', '{"name":"{v}"}', { v: 'a\\b\nc' }, { name: 'a\\b\nc' }],
    ['a value that would leave a dangling key', '{"n":"{v}"}', { v: 'a","b' }, { n: 'a","b' }],
    [
      'a pre-escaped value beside an unescaped one and a raw fragment',
      '{"a":"{p}","b":"{q}","o":{o}}',
      { p: 'Say \\"hi\\"', q: 'He said "hi"', o: '{"k":1}' },
      { a: 'Say \\"hi\\"', b: 'He said "hi"', o: { k: 1 } },
    ],
    ['quoted values after a raw placeholder', '{"count":{n},"name":"{v}","alt":"x {v} y"}', { n: 3, v: 'a"b\\c\nd' }, { count: 3, name: 'a"b\\c\nd', alt: 'x a"b\\c\nd y' }],
    ['escaped quotes in the template text', '{"a":"say \\"hi\\" {v}","b":{n}}', { v: 'q"q', n: 7 }, { a: 'say "hi" q"q', b: 7 }],
    ['quotes inside other placeholders', '{"a":"{v + \'"\'}","b":"{w}"}', { v: 'x', w: 'q"q' }, { a: 'x"', b: 'q"q' }],
    ['a pretty-printed template', '{\n  "name": "{v}",\n  "offers": { o }\n}', { v: '27" \\ Monitor\nPro', o: '{"price":5}' }, { name: '27" \\ Monitor\nPro', offers: { price: 5 } }],
    ['a quoted value with a quote and </script>', '{"name":"{v}"}', { v: 'a"</script><script>alert(1)</script>' }, { name: 'a"</script><script>alert(1)</script>' }],
  ];

  test.each(invalidOnV1211)('default: %s (invalid on v1.21.1) equals the v1.21.1 output', (_, tpl, data) => {
    const expected = v1211(tpl, data);
    expect(isValid(expected)).toBe(false);
    const out = emit(tpl, data);
    expect(out).toBe(expected);
    expect(out).not.toContain('</');
  });

  test.each(invalidOnV1211.filter((c) => c[3]))('strictJsonld: %s (invalid on v1.21.1) yields valid JSON', (_, tpl, data, parsed) => {
    _config.strictJsonld = true;
    const out = emit(tpl, data);
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual(parsed);
  });

  test('default: a raw placeholder re-renders reactively', () => {
    document.body.innerHTML = `
      <div state='{"p":1}'>
        <div hidden page-jsonld>{"price":{p}}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).toBe('{"price":1}');
    findContext(document.querySelector('[page-jsonld]')).p = 42;
    expect(ldText()).toBe('{"price":42}');
  });

  test('strictJsonld: a value cannot inject extra properties', () => {
    _config.strictJsonld = true;
    const data = JSON.parse(emit('{"@type":"SearchResultsPage","name":"{q}"}', { q: 'x","@type":"Organization' }));
    expect(data['@type']).toBe('SearchResultsPage');
    expect(data.name).toBe('x","@type":"Organization');
  });

  test('strictJsonld: a pre-escaped quoted value is escaped as data', () => {
    _config.strictJsonld = true;
    expect(JSON.parse(emit('{"name":"{v}"}', { v: 'Say \\"hi\\"' }))).toEqual({ name: 'Say \\"hi\\"' });
  });

  test('strictJsonld: the list.join pattern stays inside one string', () => {
    _config.strictJsonld = true;
    const out = emit('{"sameAs":["{list.join(\'","\')}"]}', { list: ['https://a.example', 'https://b.example'] });
    expect(JSON.parse(out)).toEqual({ sameAs: ['https://a.example","https://b.example'] });
  });

  test('strictJsonld: raw fragments, numbers and booleans are still emitted as-is', () => {
    _config.strictJsonld = true;
    const out = emit('{"offers":{o},"author":{JSON.stringify(a)},"p":{p},"b":{b}}', { o: '{"price":5}', a: { name: 'Ana' }, p: 1.5, b: true });
    expect(out).toBe('{"offers":{"price":5},"author":{"name":"Ana"},"p":1.5,"b":true}');
  });

  test('strictJsonld: quoted values with ", \\ and newlines yield valid JSON', () => {
    _config.strictJsonld = true;
    const out = emit('{"count":{n},"name":"{v}"}', { n: 3, v: 'a"b\\c\nd' });
    expect(out).toBe('{"count":3,"name":"a\\"b\\\\c\\nd"}');
  });

  test('strictJsonld: "<" in quoted and raw values is escaped as \\u003c without changing the data', () => {
    _config.strictJsonld = true;
    const out = emit('{"name":"{v}","o":{o}}', { v: 'a"</script><b>', o: '{"x":"</script>"}' });
    expect(out).not.toContain('<');
    expect(out).toContain(U + '003c/script>');
    expect(JSON.parse(out)).toEqual({ name: 'a"</script><b>', o: { x: '</script>' } });
  });

  test('strictJsonld: a raw non-JSON value containing < is neutralised', () => {
    _config.strictJsonld = true;
    const out = emit('{"n":{v}}', { v: '1</script><img src=x>' });
    expect(out).toBe('{"n":1' + U + '003c/script>' + U + '003cimg src=x>}');
  });

  test('strictJsonld can be turned on after the first render and applies on the next update', () => {
    const tpl = '{"name":"{v}","p":{p}}';
    document.body.innerHTML =
      `<div state='${attr(JSON.stringify({ v: 'Say \\"hi\\"', p: 1 }))}'><div hidden page-jsonld>${tpl}</div></div>`;
    processTree(document.body);
    expect(JSON.parse(ldText()).name).toBe('Say "hi"');
    _config.strictJsonld = true;
    findContext(document.querySelector('[page-jsonld]')).p = 2;
    expect(JSON.parse(ldText())).toEqual({ name: 'Say \\"hi\\"', p: 2 });
  });

  test.each([false, true])('each placeholder is evaluated once per render (strictJsonld: %s)', (strict) => {
    _config.strictJsonld = strict;
    let calls = 0;
    const tick = () => { calls++; return 'He said "hi"'; };
    document.body.innerHTML = '<div id="h"><div hidden page-jsonld>{"a":"{tick()}"}</div></div>';
    document.getElementById('h').__ctx = createContext({ tick });
    processTree(document.body);
    expect(calls).toBe(1);
    expect(ldText()).toBe(strict ? '{"a":"He said \\"hi\\""}' : '{"a":"He said "hi""}');
  });
});
