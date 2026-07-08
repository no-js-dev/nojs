// ═══════════════════════════════════════════════════════════════════════
//  NOJS-258: i18n-ns + if children-snapshot handoff
// ═══════════════════════════════════════════════════════════════════════

import { _i18n, _notifyI18n, _loadI18nNamespace } from '../src/i18n.js';
import { _config, _i18nListeners } from '../src/globals.js';
import { processTree, _disposeChildren } from '../src/registry.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/i18n.js';

// ─── Helpers ────────────────────────────────────────────────────────────
const flush = () => new Promise((r) => setTimeout(r, 0));

const originalFetch = global.fetch;

// ─── Setup / teardown ──────────────────────────────────────────────────
beforeEach(() => {
  _i18n.locales = {};
  _i18n._locale = 'en';
  _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
  _config.i18n.fallbackLocale = 'en';
  _config.i18n.cache = false;
  _config.i18n.ns = [];
  _i18nListeners.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  _i18n.locales = {};
  _i18n._locale = 'en';
  _config.i18n.loadPath = null;
  _config.i18n.fallbackLocale = 'en';
  _config.i18n.cache = true;
  _config.i18n.ns = [];
  _i18nListeners.clear();
  document.body.innerHTML = '';
  global.fetch = originalFetch;
});

// ═══════════════════════════════════════════════════════════════════════
//  1. i18n-ns + if same element: toggle off/on preserves translated content
// ═══════════════════════════════════════════════════════════════════════

describe('i18n-ns + if on the same element', () => {
  test('toggle off then on preserves translated content', async () => {
    // Mock fetch to return namespace translations (top-level key = namespace)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dashboard: { title: 'Hello World' } }),
    });

    // Set up: parent with state, element with i18n-ns + if
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: true }');

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'dashboard');
    el.setAttribute('if', 'visible');
    const span = document.createElement('span');
    span.setAttribute('t', 'dashboard.title');
    el.appendChild(span);
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    // Wait for namespace to load
    await flush();

    // Namespace loaded — data should be merged into locales
    expect(_i18n.locales.en?.dashboard?.title).toBe('Hello World');

    // The if directive is true; content should be rendered with translations
    // (t directives re-render after _notifyI18n in the callback)
    const renderedSpan = el.querySelector('span[t]');
    expect(renderedSpan).toBeTruthy();
    expect(renderedSpan.textContent).toBe('Hello World');

    // Toggle off
    const ctx = parent.__ctx;
    ctx.visible = false;
    expect(el.innerHTML).toBe('');
    expect(el.__ifState).toBe(false);

    // Toggle back on — should restore translated content
    ctx.visible = true;
    const restoredSpan = el.querySelector('span[t]');
    expect(restoredSpan).toBeTruthy();
    expect(restoredSpan.textContent).toBe('Hello World');
  });

  test('multiple toggle cycles preserve content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ buttons: { label: 'Click Me' } }),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'buttons');
    el.setAttribute('if', 'show');
    const btn = document.createElement('span');
    btn.setAttribute('t', 'buttons.label');
    el.appendChild(btn);
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    const ctx = parent.__ctx;

    // Cycle 1: off then on
    ctx.show = false;
    expect(el.innerHTML).toBe('');
    ctx.show = true;
    expect(el.querySelector('span[t]').textContent).toBe('Click Me');

    // Cycle 2: off then on
    ctx.show = false;
    expect(el.innerHTML).toBe('');
    ctx.show = true;
    expect(el.querySelector('span[t]').textContent).toBe('Click Me');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. Falsy at load: shows nothing until flip-true, then correct content
// ═══════════════════════════════════════════════════════════════════════

describe('i18n-ns + if falsy at load', () => {
  test('shows nothing until flip-true, then displays translated content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ greet: { msg: 'Welcome' } }),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ active: false }');

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'greet');
    el.setAttribute('if', 'active');
    const p = document.createElement('p');
    p.setAttribute('t', 'greet.msg');
    el.appendChild(p);
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    // if is false — element should be empty
    expect(el.innerHTML).toBe('');
    expect(el.__ifState).toBe(false);

    // Wait for namespace to load
    await flush();

    // Still empty — namespace loaded but if is false
    expect(el.innerHTML).toBe('');

    // Flip to true — should show translated content
    const ctx = parent.__ctx;
    ctx.active = true;
    expect(el.__ifState).toBe(true);

    const renderedP = el.querySelector('p[t]');
    expect(renderedP).toBeTruthy();
    expect(renderedP.textContent).toBe('Welcome');
  });

  test('namespace loads after if is false — no content appended prematurely', async () => {
    // Use a deferred promise to control when namespace resolves
    let resolveNamespace;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNamespace = () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ lazy: { info: 'Deferred Content' } }),
            });
        }),
    );

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ on: false }');

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'lazy');
    el.setAttribute('if', 'on');
    const span = document.createElement('span');
    span.setAttribute('t', 'lazy.info');
    el.appendChild(span);
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    // if is false, namespace hasn't loaded yet
    expect(el.innerHTML).toBe('');

    // Resolve namespace — should NOT append because __ifState is false
    resolveNamespace();
    await flush();

    expect(el.innerHTML).toBe('');

    // Now flip to true
    const ctx = parent.__ctx;
    ctx.on = true;
    expect(el.querySelector('span[t]')).toBeTruthy();
    expect(el.querySelector('span[t]').textContent).toBe('Deferred Content');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. Normal i18n-ns without if — regression check
// ═══════════════════════════════════════════════════════════════════════

describe('i18n-ns without if (regression)', () => {
  test('children are appended and processed after namespace loads', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ main: { heading: 'Dashboard' } }),
    });

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'main');
    const h1 = document.createElement('h1');
    h1.setAttribute('t', 'main.heading');
    el.appendChild(h1);
    document.body.appendChild(el);

    processTree(el);

    // Children detached during init
    expect(el.children.length).toBe(0);

    // Wait for namespace to load
    await flush();

    // Children restored and processed
    expect(el.querySelector('h1[t]')).toBeTruthy();
    expect(el.querySelector('h1[t]').textContent).toBe('Dashboard');
  });

  test('__ifState is not set when if is absent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ solo: { key: 'value' } }),
    });

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'solo');
    const span = document.createElement('span');
    span.setAttribute('t', 'solo.key');
    el.appendChild(span);
    document.body.appendChild(el);

    processTree(el);
    await flush();

    expect(el.__ifState).toBeUndefined();
    expect(el.querySelector('span[t]').textContent).toBe('value');
  });

  test('empty ns attribute is skipped (no fetch)', async () => {
    global.fetch = jest.fn();

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', '');
    const span = document.createElement('span');
    span.textContent = 'static';
    el.appendChild(span);
    document.body.appendChild(el);

    processTree(el);
    await flush();

    // fetch should not have been called
    expect(global.fetch).not.toHaveBeenCalled();
    // Children remain intact
    expect(el.querySelector('span').textContent).toBe('static');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. Mixed child nodes (text + elements) survive the handoff
// ═══════════════════════════════════════════════════════════════════════

describe('i18n-ns + if with mixed child nodes', () => {
  test('text nodes and elements are preserved through toggle cycle', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mix: { label: 'Translated' } }),
    });

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ on: true }');

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'mix');
    el.setAttribute('if', 'on');
    // Add a text node, an element, and another text node
    el.appendChild(document.createTextNode('Before '));
    const span = document.createElement('span');
    span.setAttribute('t', 'mix.label');
    el.appendChild(span);
    el.appendChild(document.createTextNode(' After'));
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);
    await flush();

    // All three child nodes should be present
    expect(el.childNodes.length).toBe(3);
    expect(el.childNodes[0].textContent).toBe('Before ');
    expect(el.querySelector('span[t]').textContent).toBe('Translated');
    expect(el.childNodes[2].textContent).toBe(' After');

    // Toggle off then on
    const ctx = parent.__ctx;
    ctx.on = false;
    expect(el.innerHTML).toBe('');

    ctx.on = true;
    expect(el.childNodes.length).toBe(3);
    expect(el.childNodes[0].textContent).toBe('Before ');
    expect(el.querySelector('span[t]').textContent).toBe('Translated');
    expect(el.childNodes[2].textContent).toBe(' After');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. Rapid toggle during async namespace load
// ═══════════════════════════════════════════════════════════════════════

describe('i18n-ns + if rapid toggle during namespace load', () => {
  test('if toggles true→false→true while namespace is in-flight', async () => {
    let resolveNamespace;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNamespace = () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ rapid: { msg: 'Loaded' } }),
            });
        }),
    );

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ vis: true }');

    const el = document.createElement('div');
    el.setAttribute('i18n-ns', 'rapid');
    el.setAttribute('if', 'vis');
    const span = document.createElement('span');
    span.setAttribute('t', 'rapid.msg');
    el.appendChild(span);
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = parent.__ctx;

    // if starts true — children cleared by i18n-ns, but if snapshot is correct
    // Toggle rapidly: true → false → true before namespace loads
    ctx.vis = false;
    expect(el.innerHTML).toBe('');
    ctx.vis = true;
    // Content restored from snapshot (namespace not loaded yet, so t shows key)
    expect(el.querySelector('span[t]')).toBeTruthy();

    // Now resolve the namespace
    resolveNamespace();
    await flush();

    // __ifState is true — i18n-ns callback should just call _notifyI18n()
    // which re-renders the active t directives with the loaded translations
    expect(el.__ifState).toBe(true);
    expect(el.querySelector('span[t]').textContent).toBe('Loaded');
  });
});
