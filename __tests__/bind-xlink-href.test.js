/**
 * bind-xlink:href and the opt-in strictBindings flag.
 *
 * SVG's legacy xlink:href is a URL attribute. By default bind-xlink:href is
 * written as-is (v1.21.1 behavior); with strictBindings on it goes through
 * the same scheme check as bind-href (javascript:, vbscript: and non-image
 * data: URIs become "#").
 */

import { _stores, _storeWatchers, _config } from '../src/globals.js';
import { processTree } from '../src/registry.js';

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

describe('bind-xlink:href and strictBindings', () => {
  function mount(url, tag = 'a', attr = 'bind-xlink:href') {
    const host = document.createElement('div');
    host.setAttribute('state', JSON.stringify({ url }));
    host.innerHTML = `<svg><${tag} ${attr}="url"></${tag}></svg>`;
    document.body.appendChild(host);
    processTree(host);
    return host.querySelector(tag);
  }
  const attrOf = (el, name) => el.getAttribute(name);

  test('default: written as-is (v1.21.1 behavior)', () => {
    expect(attrOf(mount('javascript:alert(1)'), 'xlink:href')).toBe('javascript:alert(1)');
    expect(attrOf(mount('data:text/html,<b>', 'use'), 'xlink:href')).toBe('data:text/html,<b>');
  });

  test('strictBindings: javascript:/vbscript:/non-image data: blocked', () => {
    _config.strictBindings = true;
    expect(attrOf(mount('javascript:alert(1)'), 'xlink:href')).toBe('#');
    expect(attrOf(mount(' JaVa\tScRiPt:alert(1)'), 'xlink:href')).toBe('#');
    expect(attrOf(mount('vbscript:x', 'use'), 'xlink:href')).toBe('#');
    expect(attrOf(mount('data:text/html,<b>', 'use'), 'xlink:href')).toBe('#');
  });

  test('strictBindings: safe values pass through', () => {
    _config.strictBindings = true;
    expect(attrOf(mount('#icon', 'use'), 'xlink:href')).toBe('#icon');
    expect(attrOf(mount('/sprite.svg#a', 'use'), 'xlink:href')).toBe('/sprite.svg#a');
    expect(attrOf(mount('data:image/png;base64,AAAA'), 'xlink:href')).toBe('data:image/png;base64,AAAA');
  });

  test('SVG href on <a>/<use> is checked with or without the flag', () => {
    expect(attrOf(mount('javascript:alert(1)', 'a', 'bind-href'), 'href')).toBe('#');
    expect(attrOf(mount('javascript:alert(1)', 'use', 'bind-href'), 'href')).toBe('#');
    _config.strictBindings = true;
    expect(attrOf(mount('javascript:alert(1)', 'a', 'bind-href'), 'href')).toBe('#');
  });

  test('other attributes are unaffected by the flag', () => {
    _config.strictBindings = true;
    expect(attrOf(mount('javascript:x', 'a', 'bind-title'), 'title')).toBe('javascript:x');
  });
});
