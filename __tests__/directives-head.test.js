import { _stores, _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree, _disposeTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

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

// ─── page-jsonld value escaping ───────────────────────────────────────────────

describe('page-jsonld value escaping', () => {
  const ldText = () =>
    document.querySelector('script[type="application/ld+json"][data-nojs]').textContent;

  test('a value containing a double quote still yields valid JSON-LD', () => {
    document.body.innerHTML = `
      <div state='{"name":"27\\" Monitor"}'>
        <div hidden page-jsonld>{"@type":"Product","name":"{name}"}</div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText())).toEqual({ '@type': 'Product', name: '27" Monitor' });
  });

  test('a value cannot inject extra properties', () => {
    document.body.innerHTML = `
      <div state='{"q":"x\\",\\"@type\\":\\"Organization"}'>
        <div hidden page-jsonld>{"@type":"SearchResultsPage","name":"{q}"}</div>
      </div>
    `;
    processTree(document.body);
    const data = JSON.parse(ldText());
    expect(data['@type']).toBe('SearchResultsPage');
    expect(data.name).toBe('x","@type":"Organization');
  });

  test('backslashes and newlines in a value are escaped', () => {
    document.body.innerHTML = `
      <div state='{"v":"a\\\\b\\nc"}'>
        <div hidden page-jsonld>{"name":"{v}"}</div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText()).name).toBe('a\\b\nc');
  });

  test('a value containing </script> cannot terminate the script element', () => {
    document.body.innerHTML = `
      <div state='{"v":"</script><b>x"}'>
        <div hidden page-jsonld>{"name":"{v}"}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).not.toContain('<');
    expect(JSON.parse(ldText()).name).toBe('</script><b>x');
  });
});

// ─── page-jsonld context-aware escaping (raw vs quoted placeholders) ─────────

describe('page-jsonld context-aware escaping', () => {
  const ldText = () =>
    document.querySelector('script[type="application/ld+json"][data-nojs]').textContent;

  test('a raw (unquoted) JSON fragment is emitted verbatim, as in v1.21.1', () => {
    document.body.innerHTML = `
      <div state='{"o":"{\\"price\\":5}"}'>
        <div hidden page-jsonld>{"@type":"Product","offers":{o}}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).toBe('{"@type":"Product","offers":{"price":5}}');
    expect(JSON.parse(ldText())).toEqual({ '@type': 'Product', offers: { price: 5 } });
  });

  test('a raw array fragment containing escaped strings stays valid JSON', () => {
    document.body.innerHTML = `
      <div state='{"o":"[{\\"@type\\":\\"Offer\\",\\"name\\":\\"A \\\\\\"B\\\\\\"\\"}]"}'>
        <div hidden page-jsonld>{"offers":{o}}</div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText())).toEqual({ offers: [{ '@type': 'Offer', name: 'A "B"' }] });
  });

  test('raw numbers and booleans are unchanged', () => {
    document.body.innerHTML = `
      <div state='{"p":5.5,"s":true,"n":0}'>
        <div hidden page-jsonld>{"price":{p},"inStock":{s},"count":{n}}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).toBe('{"price":5.5,"inStock":true,"count":0}');
  });

  test('pretty-printed template with raw and quoted placeholders', () => {
    document.body.innerHTML = `
      <div state='{"o":"{\\"price\\":5}","name":"27\\" \\\\ Monitor\\nPro"}'>
        <div hidden page-jsonld>
          {
            "name": "{name}",
            "offers": { o }
          }
        </div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText())).toEqual({ name: '27" \\ Monitor\nPro', offers: { price: 5 } });
  });

  test('quoted values containing ", \\ and newlines produce valid JSON after a raw placeholder', () => {
    document.body.innerHTML = `
      <div state='{"n":3,"v":"a\\"b\\\\c\\nd"}'>
        <div hidden page-jsonld>{"count":{n},"name":"{v}","alt":"x {v} y"}</div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText())).toEqual({ count: 3, name: 'a"b\\c\nd', alt: 'x a"b\\c\nd y' });
  });

  test('escaped quotes in the template text do not flip the string context', () => {
    document.body.innerHTML = `
      <div state='{"v":"q\\"q","n":7}'>
        <div hidden page-jsonld>{"a":"say \\"hi\\" {v}","b":{n}}</div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText())).toEqual({ a: 'say "hi" q"q', b: 7 });
  });

  test('quotes inside other placeholders are ignored when detecting context', () => {
    document.body.innerHTML = `
      <div state='{"v":"x","w":"q\\"q"}'>
        <div hidden page-jsonld>{"a":"{v + '"'}","b":"{w}"}</div>
      </div>
    `;
    processTree(document.body);
    expect(JSON.parse(ldText())).toEqual({ a: 'x"', b: 'q"q' });
  });

  test('a raw value containing </script> cannot terminate the script element', () => {
    document.body.innerHTML = `
      <div state='{"v":"\\"</script><b>x\\""}'>
        <div hidden page-jsonld>{"name":{v}}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).not.toContain('<');
    expect(JSON.parse(ldText()).name).toBe('</script><b>x');
  });

  test('a raw non-JSON value containing < is still neutralised', () => {
    document.body.innerHTML = `
      <div state='{"v":"1</script><img src=x>"}'>
        <div hidden page-jsonld>{"n":{v}}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).not.toContain('<');
    expect(ldText()).toBe('{"n":1\\u003c/script>\\u003cimg src=x>}');
  });

  test('a quoted value containing a quote and </script> cannot terminate the script element', () => {
    document.body.innerHTML = `
      <div state='{"v":"a\\"</script><script>alert(1)</script>"}'>
        <div hidden page-jsonld>{"name":"{v}"}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).not.toContain('<');
    expect(JSON.parse(ldText()).name).toBe('a"</script><script>alert(1)</script>');
  });

  test('a raw placeholder re-renders reactively', () => {
    document.body.innerHTML = `
      <div state='{"p":1}'>
        <div hidden page-jsonld>{"price":{p}}</div>
      </div>
    `;
    processTree(document.body);
    expect(ldText()).toBe('{"price":1}');
    const ctx = findContext(document.querySelector('[page-jsonld]'));
    ctx.p = 42;
    expect(ldText()).toBe('{"price":42}');
  });
});
