/**
 * bind-srcdoc and the opt-in strictBindings flag (nojs#354).
 *
 * `bind-srcdoc="doc"` writes a whole HTML document into an iframe. By default
 * the value is set as-is (v1.21.1 behavior), so state from an API response or
 * a persisted store can run script inside the frame. With strictBindings on,
 * the value goes through _sanitizeHtml — the same sanitizer bind-html uses —
 * before setAttribute.
 */

import { _stores, _storeWatchers, _config } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';

let warnSpy;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
  _config.strictBindings = false;
});

function mountFrame(doc, attr = 'bind-srcdoc') {
  const host = document.createElement('div');
  host.setAttribute('state', JSON.stringify({ doc }));
  const frame = document.createElement('iframe');
  frame.setAttribute(attr, 'doc');
  host.appendChild(frame);
  document.body.appendChild(host);
  processTree(host);
  return { host, frame };
}

// Parse the written srcdoc the way the iframe would, so assertions check
// the resulting document rather than string shapes.
function parsed(frame) {
  return new DOMParser().parseFromString(frame.getAttribute('srcdoc'), 'text/html');
}

const FULL_DOC =
  '<!doctype html><html><head><title>T</title><style>p{color:red}</style></head>' +
  '<body class="b"><p onclick="x()">Hi</p><svg width="1"></svg><form><input name="q"></form>' +
  '<a href="javascript:y()">j</a><script>parent.__frameRan = 1</script></body></html>';

describe('default (strictBindings off) keeps v1.21.1 behavior', () => {
  test('a full document is written byte for byte', () => {
    const { frame } = mountFrame(FULL_DOC);
    expect(frame.getAttribute('srcdoc')).toBe(FULL_DOC);
    const doc = parsed(frame);
    expect(doc.title).toBe('T');
    expect(doc.querySelector('style')).not.toBeNull();
    expect(doc.querySelector('script')).not.toBeNull();
    expect(doc.body.className).toBe('b');
  });

  test('state changes write the new raw value and null removes it', () => {
    const { host, frame } = mountFrame('<p>a</p>');
    findContext(host).doc = '<p>b</p><script>z()</script>';
    expect(frame.getAttribute('srcdoc')).toBe('<p>b</p><script>z()</script>');
    findContext(host).doc = null;
    expect(frame.hasAttribute('srcdoc')).toBe(false);
  });

  test('mixed-case attribute name is written raw too', () => {
    const { frame } = mountFrame('<p>x</p><script>y()</script>', 'bind-SrcDoc');
    expect(frame.getAttribute('srcdoc')).toBe('<p>x</p><script>y()</script>');
  });

  test('a custom sanitizeHtml hook is not applied to srcdoc', () => {
    const prev = _config.sanitizeHtml;
    _config.sanitizeHtml = () => '<p>hooked</p>';
    try {
      const { frame } = mountFrame('<p>raw</p>');
      expect(frame.getAttribute('srcdoc')).toBe('<p>raw</p>');
    } finally {
      _config.sanitizeHtml = prev;
    }
  });
});

describe('strictBindings: bind-srcdoc sanitization', () => {
  beforeEach(() => {
    _config.strictBindings = true;
  });

  test('a full document keeps only sanitized body content', () => {
    const { frame } = mountFrame(FULL_DOC);
    const doc = parsed(frame);
    expect(doc.title).toBe('');
    expect(doc.querySelector('style, script, svg, form')).toBeNull();
    expect(doc.querySelector('p').hasAttribute('onclick')).toBe(false);
    expect(doc.querySelector('a').hasAttribute('href')).toBe(false);
    expect(doc.querySelector('p').textContent).toBe('Hi');
  });

  test('script tags are removed', () => {
    const { frame } = mountFrame('<p>hi</p><script>parent.__pwned = 1</script>');
    const doc = parsed(frame);
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('p').textContent).toBe('hi');
    expect(frame.getAttribute('srcdoc')).not.toMatch(/script/i);
  });

  test('on* attributes are removed', () => {
    const { frame } = mountFrame(
      '<img src="x.png" onerror="parent.__pwned = 1"><div OnMouseOver="x()">t</div>'
    );
    const doc = parsed(frame);
    const img = doc.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('x.png');
    expect(img.hasAttribute('onerror')).toBe(false);
    expect(doc.querySelector('div').hasAttribute('onmouseover')).toBe(false);
    expect(frame.getAttribute('srcdoc')).not.toMatch(/on(error|mouseover)/i);
  });

  test('javascript: links are removed', () => {
    const { frame } = mountFrame(
      '<a href="javascript:parent.__pwned=1">a</a><a href="java&#x09;script:x()">b</a><a href="/ok">c</a>'
    );
    const links = parsed(frame).querySelectorAll('a');
    expect(links).toHaveLength(3);
    expect(links[0].hasAttribute('href')).toBe(false);
    expect(links[1].hasAttribute('href')).toBe(false);
    expect(links[2].getAttribute('href')).toBe('/ok');
  });

  test('<meta http-equiv=refresh> is removed, leading or in body', () => {
    const { frame } = mountFrame(
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">' +
        '<p>x</p><meta http-equiv="refresh" content="0;url=https://evil.test">'
    );
    expect(parsed(frame).querySelector('meta')).toBeNull();
    expect(frame.getAttribute('srcdoc')).not.toMatch(/refresh|meta/i);
  });

  test('nested <iframe srcdoc> inside the value is removed', () => {
    const { frame } = mountFrame(
      '<p>outer</p><iframe srcdoc="<script>parent.parent.__pwned=1</script>"></iframe>'
    );
    const doc = parsed(frame);
    expect(doc.querySelector('iframe')).toBeNull();
    expect(doc.querySelector('p').textContent).toBe('outer');
    expect(frame.getAttribute('srcdoc')).not.toMatch(/srcdoc|script/i);
  });

  test('entity-encoded &lt;script&gt; stays inert text', () => {
    const { frame } = mountFrame('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    const doc = parsed(frame);
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('p').textContent).toBe('<script>alert(1)</script>');
  });

  test('a benign document keeps its markup', () => {
    const benign =
      '<h1 class="title">Report</h1><p>Total: <strong>42</strong></p>' +
      '<ul><li>a</li><li>b</li></ul><a href="https://example.com">link</a>' +
      '<img src="data:image/png;base64,AAAA" alt="pic">';
    const { frame } = mountFrame(benign);
    expect(frame.getAttribute('srcdoc')).toBe(benign);
  });

  test('state change re-sanitizes', () => {
    const { host, frame } = mountFrame('<p>first</p>');
    expect(frame.getAttribute('srcdoc')).toBe('<p>first</p>');

    findContext(host).doc = '<p>second</p><script>parent.__pwned=1</script>';
    let doc = parsed(frame);
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('p').textContent).toBe('second');

    findContext(host).doc = '<a href="javascript:x()" onclick="y()">third</a>';
    doc = parsed(frame);
    const a = doc.querySelector('a');
    expect(a.textContent).toBe('third');
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.hasAttribute('onclick')).toBe(false);
  });

  test('null removes the attribute and a later value re-sanitizes', () => {
    const { host, frame } = mountFrame('<p>a</p>');
    findContext(host).doc = null;
    expect(frame.hasAttribute('srcdoc')).toBe(false);
    findContext(host).doc = '<p>a</p><script>x()</script>';
    expect(frame.getAttribute('srcdoc')).toBe('<p>a</p>');
  });

  test('attribute name match is case-insensitive', () => {
    const { frame } = mountFrame('<p>x</p><script>y()</script>', 'bind-SrcDoc');
    expect(frame.getAttribute('srcdoc')).toBe('<p>x</p>');
  });

  test('custom sanitizeHtml hook is honored', () => {
    const prev = _config.sanitizeHtml;
    _config.sanitizeHtml = () => '<p>hooked</p>';
    try {
      const { frame } = mountFrame('<script>x()</script>');
      expect(frame.getAttribute('srcdoc')).toBe('<p>hooked</p>');
    } finally {
      _config.sanitizeHtml = prev;
    }
  });

  test('non-srcdoc attributes keep the URL-only path', () => {
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ t: '<b>x</b>' }));
    const el = document.createElement('div');
    el.setAttribute('bind-title', 't');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);
    expect(el.getAttribute('title')).toBe('<b>x</b>');
  });
});
