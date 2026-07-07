import { _stores, _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree } from '../src/registry.js';
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

  test('does not throw when expression evaluates to null', () => {
    document.body.innerHTML = `<div hidden page-title="missingVar"></div>`;
    expect(() => processTree(document.body)).not.toThrow();
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
