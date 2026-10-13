/**
 * bind-* rejects inline event-handler attributes (nojs#351).
 *
 * `bind-onclick="handler"` used to write a real `onclick` attribute whose
 * value (from state, an API response, a persisted store…) executed as code.
 * Any attribute name starting with "on", in any case, is now refused before
 * a write, with a warning naming the element and the attribute.
 */

import { _stores, _storeWatchers } from '../src/globals.js';
import { processTree } from '../src/registry.js';
import { findContext, _sanitizeHtml } from '../src/dom.js';

import '../src/directives/state.js';
import '../src/directives/binding.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let warnSpy;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  window.__pwned = 0;
});
afterEach(() => {
  warnSpy.mockRestore();
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
  delete window.__pwned;
});

function mountHost(state) {
  const host = document.createElement('div');
  host.setAttribute('state', JSON.stringify(state));
  document.body.appendChild(host);
  return host;
}

function rejectionWarning(attr) {
  return warnSpy.mock.calls.find((args) =>
    args.some((a) => typeof a === 'string' && a.includes(`${attr} rejected`)));
}

describe('bind-on* is rejected', () => {
  test('bind-onclick never sets onclick and warns with element + attribute', () => {
    const host = mountHost({ handler: 'window.__pwned = 1' });
    const btn = document.createElement('button');
    btn.setAttribute('bind-onclick', 'handler');
    host.appendChild(btn);
    processTree(host);

    expect(btn.hasAttribute('onclick')).toBe(false);
    expect(btn.onclick).toBe(null);
    btn.click();
    expect(window.__pwned).toBe(0);

    const call = rejectionWarning('bind-onclick');
    expect(call).toBeTruthy();
    expect(call.join(' ')).toContain('on:click');
    expect(call).toContain(btn);
  });

  test('bind-onerror on <img> never sets onerror', () => {
    const host = mountHost({ h: 'window.__pwned = 1', src: 'x:broken' });
    const img = document.createElement('img');
    img.setAttribute('bind-onerror', 'h');
    img.setAttribute('bind-src', 'src');
    host.appendChild(img);
    processTree(host);

    expect(img.hasAttribute('onerror')).toBe(false);
    expect(img.getAttribute('src')).toBe('x:broken');
    expect(rejectionWarning('bind-onerror')).toBeTruthy();
  });

  test('mixed-case bind-OnClick is rejected (SVG keeps attribute case)', () => {
    const host = mountHost({ h: 'window.__pwned = 1' });
    const svg = document.createElementNS(SVG_NS, 'svg');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('bind-OnClick', 'h');
    svg.appendChild(rect);
    host.appendChild(svg);
    processTree(host);

    expect(rect.hasAttribute('OnClick')).toBe(false);
    expect(rect.hasAttribute('onclick')).toBe(false);
    expect(rejectionWarning('bind-OnClick')).toBeTruthy();
  });

  test('mixed case written in HTML markup is lowercased by the parser and rejected', () => {
    const host = mountHost({ h: 'window.__pwned = 1' });
    host.innerHTML = '<button bind-OnMouseOver="h">x</button>';
    processTree(host);
    const btn = host.querySelector('button');
    expect(btn.hasAttribute('onmouseover')).toBe(false);
    expect(rejectionWarning('bind-onmouseover')).toBeTruthy();
  });

  test('SVG element: bind-onload / bind-onbegin are rejected', () => {
    const host = mountHost({ h: 'window.__pwned = 1' });
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('bind-onload', 'h');
    const anim = document.createElementNS(SVG_NS, 'animate');
    anim.setAttribute('bind-onbegin', 'h');
    svg.appendChild(anim);
    host.appendChild(svg);
    processTree(host);

    expect(svg.hasAttribute('onload')).toBe(false);
    expect(anim.hasAttribute('onbegin')).toBe(false);
    expect(rejectionWarning('bind-onload')).toBeTruthy();
    expect(rejectionWarning('bind-onbegin')).toBeTruthy();
  });

  test('state changes after init never write the handler', () => {
    const host = mountHost({ h: null });
    const btn = document.createElement('button');
    btn.setAttribute('bind-onclick', 'h');
    host.appendChild(btn);
    processTree(host);
    findContext(host).h = 'window.__pwned = 1';
    expect(btn.hasAttribute('onclick')).toBe(false);
  });
});

describe('ordinary bind-* attributes are unaffected', () => {
  test('bind-title, bind-aria-label and SVG bind-fill still write', () => {
    const host = mountHost({ t: 'hello', fill: 'red' });
    const span = document.createElement('span');
    span.setAttribute('bind-title', 't');
    span.setAttribute('bind-aria-label', 't');
    const svg = document.createElementNS(SVG_NS, 'svg');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('bind-fill', 'fill');
    svg.appendChild(rect);
    host.append(span, svg);
    processTree(host);

    expect(span.getAttribute('title')).toBe('hello');
    expect(span.getAttribute('aria-label')).toBe('hello');
    expect(rect.getAttribute('fill')).toBe('red');
    expect(warnSpy.mock.calls.some((a) => a.join(' ').includes('rejected'))).toBe(false);
  });
});

describe('bind-html sanitizer behaviour is unchanged', () => {
  test('_sanitizeHtml still strips on* attributes and keeps safe ones', () => {
    const out = _sanitizeHtml('<img src="a.png" onerror="x()" alt="ok"><b onclick="y()">b</b>');
    expect(out).not.toMatch(/onerror|onclick/i);
    expect(out).toContain('alt="ok"');
    expect(out).toContain('<b>b</b>');
  });

  test('bind-html renders sanitized markup without on* handlers', () => {
    const host = mountHost({ html: '<img src="a.png" onerror="window.__pwned = 1"><i onmouseover="z()">i</i>' });
    const div = document.createElement('div');
    div.setAttribute('bind-html', 'html');
    host.appendChild(div);
    processTree(host);

    expect(div.querySelector('img')).not.toBe(null);
    expect(div.querySelector('img').hasAttribute('onerror')).toBe(false);
    expect(div.querySelector('i').hasAttribute('onmouseover')).toBe(false);
    expect(div.querySelector('i').textContent).toBe('i');
    expect(rejectionWarning('bind-html')).toBeFalsy();
  });
});
