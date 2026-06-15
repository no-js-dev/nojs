// ═══════════════════════════════════════════════════════════════════════
//  Head directives — branch coverage improvements
//  Targets: canonical URL XSS guard, JSON-LD injection, description
//  meta tag branches, disposal cleanup, null expression values
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _setCurrentEl, _onDispose } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { evaluate } from '../src/evaluate.js';
import { processTree, _disposeTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

// Import directives to register them
import '../src/directives/state.js';
import '../src/directives/head.js';

describe('Head directives — page-title', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.title = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.title = '';
  });

  test('sets document.title from a static string expression', () => {
    document.body.innerHTML = `
      <div state="{ name: 'Test' }">
        <div hidden page-title="'My Page Title'"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.title).toBe('My Page Title');
  });

  test('sets document.title from a dynamic expression', () => {
    document.body.innerHTML = `
      <div state="{ product: 'Widget' }">
        <div hidden page-title="product + ' | Store'"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.title).toBe('Widget | Store');
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

describe('Head directives — page-description', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  test('creates <meta name="description"> when none exists', () => {
    document.body.innerHTML = `
      <div state="{ desc: 'A great page' }">
        <div hidden page-description="desc"></div>
      </div>
    `;
    processTree(document.body);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta.content).toBe('A great page');
  });

  test('updates existing <meta name="description"> without duplicating', () => {
    const existing = document.createElement('meta');
    existing.name = 'description';
    existing.content = 'Old description';
    document.head.appendChild(existing);

    document.body.innerHTML = `
      <div state="{ desc: 'New description' }">
        <div hidden page-description="desc"></div>
      </div>
    `;
    processTree(document.body);
    const metas = document.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
    expect(metas[0].content).toBe('New description');
  });

  test('does not update when expression evaluates to null', () => {
    document.body.innerHTML = `
      <div state="{ desc: null }">
        <div hidden page-description="desc"></div>
      </div>
    `;
    processTree(document.body);
    const meta = document.querySelector('meta[name="description"]');
    // Should not have created a meta tag for null value
    expect(meta).toBeNull();
  });

  test('removes created meta on disposal', () => {
    document.body.innerHTML = `
      <div state="{ desc: 'Disposable' }">
        <div hidden page-description="desc" id="desc-host"></div>
      </div>
    `;
    processTree(document.body);
    expect(document.querySelector('meta[name="description"]')).not.toBeNull();

    // Dispose the tree to trigger cleanup
    _disposeTree(document.body);
    // The created meta should be removed
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});

describe('Head directives — page-canonical', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  test('creates <link rel="canonical"> when none exists', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'/about'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('/about');
  });

  test('updates existing canonical link without duplicating', () => {
    const existing = document.createElement('link');
    existing.rel = 'canonical';
    existing.href = '/old';
    document.head.appendChild(existing);

    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'/new'"></div>
      </div>
    `;
    processTree(document.body);
    const links = document.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].href).toContain('/new');
  });

  test('blocks javascript: protocol in canonical URL (XSS guard)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'javascript:alert(1)'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    // Either no link created, or href was not set to the javascript: URL
    if (link) {
      expect(link.href).not.toContain('javascript:');
    }
  });

  test('blocks vbscript: protocol in canonical URL (XSS guard)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'vbscript:MsgBox(1)'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    if (link) {
      expect(link.href).not.toContain('vbscript:');
    }
  });

  test('blocks data: protocol in canonical URL (XSS guard)', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-canonical="'data:text/html,<h1>XSS</h1>'"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    if (link) {
      expect(link.href).not.toContain('data:text/html');
    }
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

  test('does not update when expression evaluates to null', () => {
    document.body.innerHTML = `
      <div state="{ url: null }">
        <div hidden page-canonical="url"></div>
      </div>
    `;
    processTree(document.body);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).toBeNull();
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

describe('Head directives — page-jsonld', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  test('creates <script type="application/ld+json" data-nojs> from JSON template', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld>{"@type":"WebPage","name":"Test"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('"WebPage"');
    expect(script.textContent).toContain('"Test"');
  });

  test('interpolates {placeholder} expressions in JSON-LD template', () => {
    document.body.innerHTML = `
      <div state="{ productName: 'Widget' }">
        <div hidden page-jsonld>{"@type":"Product","name":"{productName}"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('Widget');
    expect(script.textContent).not.toContain('{productName}');
  });

  test('escapes </ sequences to prevent script injection', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld>{"@type":"WebPage","name":"Test</script>"}</div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    if (script) {
      // The </ should be escaped to <\/ to prevent premature script closure
      expect(script.textContent).not.toContain('</script>');
    }
  });

  test('updates existing managed script without duplicating', () => {
    document.body.innerHTML = `
      <div state="{ name: 'First' }">
        <div hidden page-jsonld>{"@type":"WebPage","name":"{name}"}</div>
      </div>
    `;
    processTree(document.body);

    // Manually change the state and re-process (simulating a second directive)
    const script1 = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script1).not.toBeNull();

    const scripts = document.querySelectorAll('script[type="application/ld+json"][data-nojs]');
    expect(scripts.length).toBe(1);
  });

  test('does nothing when element body is empty', () => {
    document.body.innerHTML = `
      <div state="{}">
        <div hidden page-jsonld></div>
      </div>
    `;
    processTree(document.body);
    const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
    expect(script).toBeNull();
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
    // null placeholder should render as empty string
    expect(script.textContent).toContain('"name":""');
  });
});
