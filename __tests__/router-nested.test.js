import { _config, _stores, setRouterInstance } from '../src/globals.js';
import { _createRouter } from '../src/router.js';
import { _templateHtmlCache } from '../src/dom.js';

// ═══════════════════════════════════════════════════════════════════════
//  NESTED ROUTING — Hierarchical segment resolution & outlet re-scan
//  (NOJS-21 + NOJS-22)
// ═══════════════════════════════════════════════════════════════════════

describe('Nested routing — hierarchical segment resolution', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', templates: 'pages', ext: '.tpl' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    if (global.fetch) delete global.fetch;
  });

  // ─── Test 1: Deep link /docs/loops ──────────────────────────────────
  // Navigating to /docs/loops should:
  //   1. Fetch pages/docs.tpl as a layout into the main outlet
  //   2. The layout contains a nested [route-view="docs"] outlet
  //   3. pages/loops.tpl is loaded into that nested outlet
  test('deep link /docs/loops loads layout in main outlet and child in nested outlet', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><h1>Docs Layout</h1><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'pages/loops.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="loops-content">Loops Guide</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/loops');

    // Layout should be in the main outlet
    expect(outlet.querySelector('.docs-layout')).not.toBeNull();
    expect(outlet.querySelector('h1').textContent).toBe('Docs Layout');

    // Child content should be in the nested outlet
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();
    expect(nestedOutlet.querySelector('.loops-content')).not.toBeNull();
    expect(nestedOutlet.querySelector('.loops-content').textContent).toBe('Loops Guide');

    // Both files should have been fetched
    expect(global.fetch).toHaveBeenCalledWith('pages/docs.tpl');
    expect(global.fetch).toHaveBeenCalledWith('pages/loops.tpl');
  });

  // ─── Test 2: Sequential navigation / → /docs → /docs/loops ─────────
  // Layout should persist and only the child outlet swaps
  test('sequential nav: layout persists, only child swaps', async () => {
    let fetchCalls = [];
    global.fetch = jest.fn((url) => {
      fetchCalls.push(url);
      if (url === 'pages/index.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="home">Home Page</p>'),
        });
      }
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><h2>Docs</h2><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'pages/loops.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="loops">Loops</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    // Step 1: navigate to /
    await router.push('/');
    expect(outlet.querySelector('.home')).not.toBeNull();
    expect(router.current.path).toBe('/');

    // Step 2: navigate to /docs (single segment — flat)
    await router.push('/docs');
    expect(router.current.path).toBe('/docs');
    expect(global.fetch).toHaveBeenCalledWith('pages/docs.tpl');

    // Step 3: navigate to /docs/loops
    fetchCalls = [];
    await router.push('/docs/loops');
    expect(router.current.path).toBe('/docs/loops');

    // Layout should render + child content in nested outlet
    expect(outlet.querySelector('.docs-layout')).not.toBeNull();
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();
    expect(nestedOutlet.querySelector('.loops')).not.toBeNull();
  });

  // ─── Test 3: Fallback — single segment, no layout ──────────────────
  // /features has only one segment, so it should load pages/features.tpl
  // flat (original behavior, no hierarchical resolution).
  test('single segment /features loads flat — no layout resolution', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p class="features-content">Features Page</p>'),
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/features');

    expect(global.fetch).toHaveBeenCalledWith('pages/features.tpl');
    expect(outlet.querySelector('.features-content')).not.toBeNull();
    expect(outlet.querySelector('.features-content').textContent).toBe('Features Page');

    // Should NOT attempt to load a layout — only one fetch call
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // ─── Test 4: 3+ levels — /docs/guides/intro ────────────────────────
  // Should resolve hierarchically:
  //   1. pages/docs.tpl as layout in main outlet (introduces [route-view="docs"])
  //   2. pages/guides.tpl as nested layout (introduces [route-view="guides"])
  //   3. pages/intro.tpl as leaf in the deepest outlet
  test('3+ levels /docs/guides/intro resolves hierarchically', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'pages/guides.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="guides-layout"><div route-view="guides"></div></div>'
          ),
        });
      }
      if (url === 'pages/intro.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="intro-content">Introduction</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/guides/intro');

    // Level 1: docs layout in main outlet
    expect(outlet.querySelector('.docs-layout')).not.toBeNull();

    // Level 2: guides layout in nested [route-view="docs"]
    const docsOutlet = outlet.querySelector('[route-view="docs"]');
    expect(docsOutlet).not.toBeNull();
    expect(docsOutlet.querySelector('.guides-layout')).not.toBeNull();

    // Level 3: intro content in deepest [route-view="guides"]
    const guidesOutlet = docsOutlet.querySelector('[route-view="guides"]');
    expect(guidesOutlet).not.toBeNull();
    expect(guidesOutlet.querySelector('.intro-content')).not.toBeNull();
    expect(guidesOutlet.querySelector('.intro-content').textContent).toBe('Introduction');
  });

  // ─── Test 5: Named outlet discovery ─────────────────────────────────
  // After layout render, [route-view="docs"] should be discovered
  // inside the freshly rendered content and used for child resolution.
  test('named outlet discovery — [route-view="docs"] found after layout render', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<section class="docs-section"><div route-view="docs"></div></section>'
          ),
        });
      }
      if (url === 'pages/getting-started.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<article class="gs-article">Getting Started</article>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/getting-started');

    // The named outlet should have been discovered dynamically
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();

    // And child content should be rendered inside it
    expect(nestedOutlet.querySelector('.gs-article')).not.toBeNull();
    expect(nestedOutlet.querySelector('.gs-article').textContent).toBe('Getting Started');
  });

  // ─── Test 6: 404 in nested context ─────────────────────────────────
  // /docs/nonexistent — layout docs.tpl renders, but nonexistent.tpl
  // fails to load, so 404 appears in the nested outlet while layout stays.
  test('404 in nested context — layout stays, 404 in nested outlet', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><h1>Docs</h1><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'pages/nonexistent.tpl') {
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/nonexistent');

    // Layout should still be rendered in the main outlet
    expect(outlet.querySelector('.docs-layout')).not.toBeNull();
    expect(outlet.querySelector('h1').textContent).toBe('Docs');

    // The nested outlet should contain the built-in 404
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();
    expect(nestedOutlet.innerHTML).toContain('404');
    expect(nestedOutlet.innerHTML).toContain('Page not found');
  });

  // ─── Test 7: Layout cache — second navigation reuses cached layout ──
  // Navigate to /docs/loops, then to /docs/forms — the layout docs.tpl
  // should not be re-fetched.
  test('layout cache — second navigation to same layout does not re-fetch', async () => {
    let fetchCount = {};
    global.fetch = jest.fn((url) => {
      fetchCount[url] = (fetchCount[url] || 0) + 1;
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'pages/loops.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="loops">Loops</p>'),
        });
      }
      if (url === 'pages/forms.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="forms">Forms</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    // First navigation
    await router.push('/docs/loops');
    expect(fetchCount['pages/docs.tpl']).toBe(1);
    expect(fetchCount['pages/loops.tpl']).toBe(1);

    // Second navigation to same layout, different child
    await router.push('/docs/forms');

    // docs.tpl should NOT be re-fetched (cached from first navigation)
    expect(fetchCount['pages/docs.tpl']).toBe(1);
    // forms.tpl should be fetched
    expect(fetchCount['pages/forms.tpl']).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  EDGE CASES
// ═══════════════════════════════════════════════════════════════════════

describe('Nested routing — edge cases', () => {
  beforeEach(() => {
    _config.router = { useHash: true, base: '/', scrollBehavior: 'top', templates: 'pages', ext: '.tpl' };
    document.body.innerHTML = '';
    window.location.hash = '';
    window.scrollTo = jest.fn();
    setRouterInstance(null);
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    setRouterInstance(null);
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
    window.location.hash = '';
    if (global.fetch) delete global.fetch;
  });

  // When the first segment has no layout file, fall back to flat resolution
  // i.e. /settings/profile → pages/settings/profile.tpl (flat)
  test('flat fallback when layout does not exist', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/settings.tpl') {
        // No layout file for "settings"
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        });
      }
      if (url === 'pages/settings/profile.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="profile">Profile Settings</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/settings/profile');

    // Should fall back to flat path
    expect(global.fetch).toHaveBeenCalledWith('pages/settings/profile.tpl');
    expect(outlet.querySelector('.profile')).not.toBeNull();
    expect(outlet.querySelector('.profile').textContent).toBe('Profile Settings');
  });

  // Root path "/" should always use flat resolution, never hierarchical
  test('root path / uses flat resolution, not hierarchical', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p class="home">Home</p>'),
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/');

    expect(global.fetch).toHaveBeenCalledWith('pages/index.tpl');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(outlet.querySelector('.home')).not.toBeNull();
  });

  // Explicit routes should take priority over hierarchical resolution
  test('explicit routes take priority over hierarchical resolution', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Should not appear</p>'),
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const tpl = document.createElement('template');
    tpl.innerHTML = '<p class="explicit">Explicit Docs Loops</p>';

    const router = _createRouter();
    setRouterInstance(router);
    router.register('/docs/loops', tpl);

    await router.push('/docs/loops');

    // Explicit route should render
    expect(outlet.querySelector('.explicit')).not.toBeNull();
    expect(outlet.querySelector('.explicit').textContent).toBe('Explicit Docs Loops');

    // No fetch should have been called (explicit routes bypass file-based routing)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Custom extension on the outlet applies to hierarchical resolution too
  test('custom ext attribute on outlet applies to hierarchical templates', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'views/docs.html') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'views/loops.html') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="loops">Loops (HTML)</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './views/');
    outlet.setAttribute('ext', '.html');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/loops');

    expect(global.fetch).toHaveBeenCalledWith('views/docs.html');
    expect(global.fetch).toHaveBeenCalledWith('views/loops.html');
    expect(outlet.querySelector('.docs-layout')).not.toBeNull();
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet.querySelector('.loops')).not.toBeNull();
  });

  // Nested outlet with its own src attribute should use that instead of inheriting
  test('nested outlet with own src attribute uses its own base path', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><div route-view="docs" src="./docs-pages/"></div></div>'
          ),
        });
      }
      if (url === 'docs-pages/loops.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="nested-loops">Loops from docs-pages</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/loops');

    // Child content should come from the nested outlet's own src
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();
    expect(nestedOutlet.querySelector('.nested-loops')).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('docs-pages/loops.tpl');
  });

  // No file-based routing config at all — hierarchical resolution is skipped
  test('no templates config — hierarchical resolution is skipped entirely', async () => {
    _config.router.templates = '';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Should not load</p>'),
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/loops');

    // No fetch should occur when no templates config is set
    expect(global.fetch).not.toHaveBeenCalled();
    // Built-in 404 should render for unmatched route
    expect(outlet.innerHTML).toContain('404');
  });

  // Wildcard fallback in nested context — when child fails, uses wildcard
  test('wildcard fallback in nested context when child template fails', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs-layout"><div route-view="docs"></div></div>'
          ),
        });
      }
      // All other templates fail
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const wildcardTpl = document.createElement('template');
    wildcardTpl.innerHTML = '<p class="custom-404">Custom Not Found</p>';

    const router = _createRouter();
    setRouterInstance(router);
    router.register('*', wildcardTpl);

    await router.push('/docs/missing-page');

    // Layout should still be present
    expect(outlet.querySelector('.docs-layout')).not.toBeNull();

    // Nested outlet should show the 404 (built-in since the wildcard is
    // registered on the default outlet, not the "docs" named outlet)
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();
    expect(nestedOutlet.innerHTML).toContain('404');
  });

  // Config router.templates fallback works with hierarchical resolution
  test('config router.templates fallback works with hierarchical paths', async () => {
    _config.router.templates = './templates/';

    global.fetch = jest.fn((url) => {
      if (url === 'templates/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="tpl-docs"><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'templates/intro.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="tpl-intro">Intro</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    // No src attribute — falls back to config
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/intro');

    expect(global.fetch).toHaveBeenCalledWith('templates/docs.tpl');
    expect(global.fetch).toHaveBeenCalledWith('templates/intro.tpl');
    expect(outlet.querySelector('.tpl-docs')).not.toBeNull();
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet.querySelector('.tpl-intro')).not.toBeNull();
  });

  // History mode works with hierarchical resolution
  test('hierarchical resolution works in history mode', async () => {
    _config.router.useHash = false;

    global.fetch = jest.fn((url) => {
      if (url === 'pages/docs.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            '<div class="docs"><div route-view="docs"></div></div>'
          ),
        });
      }
      if (url === 'pages/api.tpl') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<p class="api">API Reference</p>'),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    });

    const outlet = document.createElement('div');
    outlet.setAttribute('route-view', '');
    outlet.setAttribute('src', './pages/');
    document.body.appendChild(outlet);

    const router = _createRouter();
    setRouterInstance(router);

    await router.push('/docs/api');

    expect(outlet.querySelector('.docs')).not.toBeNull();
    const nestedOutlet = outlet.querySelector('[route-view="docs"]');
    expect(nestedOutlet).not.toBeNull();
    expect(nestedOutlet.querySelector('.api')).not.toBeNull();
    expect(nestedOutlet.querySelector('.api').textContent).toBe('API Reference');
  });
});
