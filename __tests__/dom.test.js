import { _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { findContext, _clearDeclared, _cloneTemplate, _sanitizeHtml, _loadRemoteTemplates, _loadTemplateElement, _loadRemoteTemplatesPhase1, _loadRemoteTemplatesPhase2, _processTemplateIncludes, _templateHtmlCache, _warnIfInsecureTemplateUrl } from '../src/dom.js';

describe('DOM Helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('findContext', () => {
    test('returns context from element', () => {
      const div = document.createElement('div');
      const ctx = createContext({ x: 1 });
      div.__ctx = ctx;
      expect(findContext(div)).toBe(ctx);
    });

    test('walks up to find parent context', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      const ctx = createContext({ x: 1 });
      parent.__ctx = ctx;
      expect(findContext(child)).toBe(ctx);
    });

    test('returns empty context if none found', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      const ctx = findContext(div);
      expect(ctx.__isProxy).toBe(true);
    });
  });

  describe('_clearDeclared', () => {
    test('clears __declared on descendant elements', () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('p');
      child1.__declared = true;
      child2.__declared = true;
      parent.appendChild(child1);
      parent.appendChild(child2);

      _clearDeclared(parent);
      expect(child1.__declared).toBe(false);
      expect(child2.__declared).toBe(false);
    });
  });

  describe('_cloneTemplate', () => {
    test('clones template by ID', () => {
      const tpl = document.createElement('template');
      tpl.id = 'my-tpl';
      tpl.innerHTML = '<p>Hello</p>';
      document.body.appendChild(tpl);

      const clone = _cloneTemplate('my-tpl');
      expect(clone).not.toBeNull();
      expect(clone.querySelector('p').textContent).toBe('Hello');
    });

    test('handles # prefix in ID', () => {
      const tpl = document.createElement('template');
      tpl.id = 'my-tpl2';
      tpl.innerHTML = '<span>World</span>';
      document.body.appendChild(tpl);

      const clone = _cloneTemplate('#my-tpl2');
      expect(clone).not.toBeNull();
      expect(clone.querySelector('span').textContent).toBe('World');
    });

    test('returns null for non-existent template', () => {
      expect(_cloneTemplate('nonexistent')).toBeNull();
    });
  });

  describe('_sanitizeHtml', () => {
    test('removes script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('<script');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    test('removes event handlers', () => {
      const html = '<div onclick="alert(1)" onmouseover="hack()">content</div>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
    });

    test('removes javascript: protocol', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    test('passes through safe HTML', () => {
      const html = '<p class="safe">Hello <strong>World</strong></p>';
      expect(_sanitizeHtml(html)).toBe(html);
    });

    test('skips sanitization when sanitize is false (backwards compat) and warns', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.sanitize = false;
      const html = '<script>alert(1)</script>';
      expect(_sanitizeHtml(html)).toBe(html);
      expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('sanitization is DISABLED'));
      warnSpy.mockRestore();
      _config.sanitize = true;
    });

    test('skips sanitization when dangerouslyDisableSanitize is true and warns', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.dangerouslyDisableSanitize = true;
      const html = '<script>alert(1)</script>';
      expect(_sanitizeHtml(html)).toBe(html);
      expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('XSS attacks'));
      warnSpy.mockRestore();
      _config.dangerouslyDisableSanitize = false;
    });

    test('warns every time sanitization runs with it disabled', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      _config.dangerouslyDisableSanitize = true;
      _sanitizeHtml('<b>a</b>');
      _sanitizeHtml('<b>b</b>');
      _sanitizeHtml('<b>c</b>');
      const xssWarnings = warnSpy.mock.calls.filter(
        (args) => args.some((a) => typeof a === 'string' && a.includes('DISABLED'))
      );
      expect(xssWarnings).toHaveLength(3);
      warnSpy.mockRestore();
      _config.dangerouslyDisableSanitize = false;
    });

    test('default config has sanitization enabled', () => {
      expect(_config.sanitize).toBe(true);
      expect(_config.dangerouslyDisableSanitize).toBe(false);
    });

    // ── Vectors that bypass regex sanitizers but are caught by DOMParser ──

    test('removes onerror on img tag (regex-bypass vector)', () => {
      // A naive `on\w+=` regex can be fooled by extra whitespace or newlines.
      // DOMParser always parses the attribute properly before cleaning.
      const html = '<img src="x" onerror="alert(1)">';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('onerror');
    });

    test('removes SVG event handlers (onbegin, onend, etc.)', () => {
      const html = '<svg><animate onbegin="alert(1)"></animate></svg>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('onbegin');
    });

    test('removes iframe tags (srcdoc nesting vector)', () => {
      const html = '<div>Safe<iframe srcdoc="<script>evil()</script>"></iframe></div>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('iframe');
      expect(result).toContain('Safe');
    });

    test('removes base tags (URL rewrite vector)', () => {
      const html = '<base href="http://evil.com"><p>Content</p>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('<base');
      expect(result).toContain('Content');
    });

    test('removes HTML-entity-encoded javascript: href', () => {
      // DOMParser resolves &#x6A;avascript: to javascript: before the walk.
      const html = '<a href="&#x6A;avascript:alert(1)">Link</a>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    test('removes vbscript: protocol', () => {
      const html = '<a href="vbscript:msgbox(1)">Link</a>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('vbscript:');
    });

    test('preserves safe nested elements and class attributes', () => {
      const html = '<div class="card"><h2>Title</h2><p>Body <strong>text</strong></p></div>';
      const result = _sanitizeHtml(html);
      expect(result).toContain('class="card"');
      expect(result).toContain('<h2>Title</h2>');
      expect(result).toContain('<strong>text</strong>');
    });

    test('calls custom sanitizeHtml hook and returns its output', () => {
      const mock = jest.fn().mockReturnValue('<p>sanitized</p>');
      _config.sanitizeHtml = mock;
      const result = _sanitizeHtml('<script>evil()</script>');
      expect(mock).toHaveBeenCalledWith('<script>evil()</script>');
      expect(result).toBe('<p>sanitized</p>');
      _config.sanitizeHtml = null;
    });

    test('custom hook is bypassed when sanitize is false', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mock = jest.fn();
      _config.sanitizeHtml = mock;
      _config.sanitize = false;
      _sanitizeHtml('<b>hi</b>');
      expect(mock).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      _config.sanitize = true;
      _config.sanitizeHtml = null;
    });

    test('strips non-image data: URIs from href (e.g. data:text/html)', () => {
      const html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('data:text/html');
      expect(result).toContain('Click');
    });

    test('strips non-image data: URIs from src', () => {
      const html = '<img src="data:text/javascript,alert(1)">';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('data:text/javascript');
    });

    test('preserves safe image data: URIs in src', () => {
      const html = '<img src="data:image/png;base64,abc123" alt="pic">';
      const result = _sanitizeHtml(html);
      expect(result).toContain('data:image/png;base64,abc123');
    });

    // ── H5: formaction, poster, data URL attrs + SVG data URI sanitization ──

    test('strips javascript: from formaction attribute', () => {
      const html = '<button formaction="javascript:alert(1)">Submit</button>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Submit');
    });

    test('strips javascript: from poster attribute', () => {
      const html = '<video poster="javascript:alert(1)"></video>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    test('strips javascript: from data attribute', () => {
      const html = '<object data="javascript:alert(1)"></object>';
      const result = _sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    test('deep-sanitizes data:image/svg+xml URIs containing script tags', () => {
      const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
      const dataUri = 'data:image/svg+xml,' + encodeURIComponent(maliciousSvg);
      const html = '<img src="' + dataUri + '">';
      const result = _sanitizeHtml(html);
      // The sanitized result should still have the src with a data:image/svg+xml URI
      expect(result).toContain('data:image/svg+xml');
      // But the <script> tag must be removed from the SVG content
      const srcMatch = result.match(/src="([^"]+)"/);
      expect(srcMatch).not.toBeNull();
      const decodedSvg = decodeURIComponent(srcMatch[1].split(',')[1]);
      expect(decodedSvg).not.toContain('<script');
      expect(decodedSvg).toContain('rect');
    });

    test('deep-sanitizes base64 data:image/svg+xml URIs containing onload attributes', () => {
      const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>';
      const dataUri = 'data:image/svg+xml;base64,' + btoa(maliciousSvg);
      const html = '<img src="' + dataUri + '">';
      const result = _sanitizeHtml(html);
      expect(result).toContain('data:image/svg+xml;base64,');
      // Decode the base64 SVG and verify onload is stripped
      const srcMatch = result.match(/src="data:image\/svg\+xml;base64,([^"]+)"/);
      expect(srcMatch).not.toBeNull();
      const decodedSvg = atob(srcMatch[1]);
      expect(decodedSvg).not.toContain('onload');
      expect(decodedSvg).toContain('rect');
    });

    test('allows safe data:image/png URIs unchanged', () => {
      const safeUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      const html = '<img src="' + safeUri + '" alt="safe">';
      const result = _sanitizeHtml(html);
      expect(result).toContain(safeUri);
      expect(result).toContain('alt="safe"');
    });
  });
});

describe('_loadRemoteTemplates', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
    _templateHtmlCache.clear();
  });

  test('loads HTML into template with src', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Remote Content</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/partials/header.html');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/partials/header.html'),
    );
    expect(wrapper.innerHTML).toBe('<p>Remote Content</p>');
  });

  test('handles fetch failure gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/partials/fail.html');
    document.body.appendChild(tpl);

    await expect(_loadRemoteTemplates()).resolves.not.toThrow();
  });

  test('loads multiple templates in parallel', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<p>A</p>'),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<p>B</p>'),
      });

    const wrapper = document.createElement('div');
    const tpl1 = document.createElement('template');
    tpl1.setAttribute('src', '/a.html');
    const tpl2 = document.createElement('template');
    tpl2.setAttribute('src', '/b.html');
    wrapper.appendChild(tpl1);
    wrapper.appendChild(tpl2);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(wrapper.innerHTML).toBe('<p>A</p><p>B</p>');
  });

  test('resolves ./ paths relative to parent template folder', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<template src="./sidebar.tpl"></template>'),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<nav>Sidebar</nav>'),
      });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'templates/docs.tpl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(global.fetch).toHaveBeenCalledWith('templates/docs.tpl');
    expect(global.fetch).toHaveBeenCalledWith('templates/sidebar.tpl');
    expect(wrapper.innerHTML).toContain('<nav>Sidebar</nav>');
  });

  test('./ resolution works with nested levels', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<template src="./child.tpl"></template>'),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<p>child</p>'),
      });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'a/b/parent.tpl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(global.fetch).toHaveBeenCalledWith('a/b/parent.tpl');
    expect(global.fetch).toHaveBeenCalledWith('a/b/child.tpl');
    expect(wrapper.innerHTML).toContain('<p>child</p>');
  });
});

describe('_loadRemoteTemplates — uncovered branches', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('./ path with no ancestor __srcBase strips prefix (L56)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Orphan</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', './orphan.tpl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(global.fetch).toHaveBeenCalledWith('orphan.tpl');
    expect(wrapper.innerHTML).toContain('Orphan');
  });

  test('route template is NOT inlined into parent (route branch)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Route content</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/pages/home.html');
    tpl.setAttribute('route', '/home');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(wrapper.querySelector('template[route]')).not.toBeNull();
    expect(wrapper.querySelector('p')).toBeNull();
  });
});

describe('dom.js — _loadRemoteTemplates with scoped root parameter (L67)', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = origFetch;
    document.body.innerHTML = '';
  });

  test('loads templates scoped to a specific root element (not document)', async () => {
    global.fetch = jest.fn(() => ({
      ok: true,
      text: () => Promise.resolve('<p>scoped content</p>'),
    }));

    const root = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/scoped.html');
    root.appendChild(tpl);
    document.body.appendChild(root);

    await _loadRemoteTemplates(root);

    expect(global.fetch).toHaveBeenCalledWith('/scoped.html');
  });

  test('returns early when scoped root has no template[src] elements', async () => {
    global.fetch = jest.fn();

    const root = document.createElement('div');
    root.innerHTML = '<p>no templates here</p>';
    document.body.appendChild(root);

    await _loadRemoteTemplates(root);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('dom.js — non-route template inline expansion (L95)', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = origFetch;
    document.body.innerHTML = '';
  });

  test('non-route template is replaced with its content inline', async () => {
    global.fetch = jest.fn(() => ({
      ok: true,
      text: () => Promise.resolve('<span class="included">hello</span>'),
    }));

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/include.html');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(wrapper.querySelector('template[src]')).toBeNull();
    expect(wrapper.querySelector('.included')).not.toBeNull();
  });

  test('route template is NOT replaced inline', async () => {
    global.fetch = jest.fn(() => ({
      ok: true,
      text: () => Promise.resolve('<span class="route-content">page</span>'),
    }));

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/page.html');
    tpl.setAttribute('route', '/page');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(wrapper.querySelector('template[route]')).not.toBeNull();
  });
});

describe('_loadTemplateElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>content</p>'),
    });
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('skips already-loaded templates', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/test.html');
    tpl.__srcLoaded = true;
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('marks tpl.__srcLoaded before fetching', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/test.html');
    tpl.setAttribute('route', '/test'); 
    document.body.appendChild(tpl);

    let flagDuringFetch = false;
    global.fetch = jest.fn().mockImplementation(() => {
      flagDuringFetch = tpl.__srcLoaded;
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<p>content</p>') });
    });

    await _loadTemplateElement(tpl);

    expect(flagDuringFetch).toBe(true);
    expect(tpl.__srcLoaded).toBe(true);
  });

  test('loads a template and populates content', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/test.html');
    tpl.setAttribute('route', '/test'); 
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);

    expect(global.fetch).toHaveBeenCalledWith('/test.html');
    expect(tpl.innerHTML).toBe('<p>content</p>');
  });

  test('injects non-route template content into DOM', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Injected</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/include.html');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadTemplateElement(tpl);

    expect(wrapper.querySelector('template')).toBeNull();
    expect(wrapper.querySelector('p')).not.toBeNull();
    expect(wrapper.querySelector('p').textContent).toBe('Injected');
  });

  test('does not inject route templates', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>About</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/about.html');
    tpl.setAttribute('route', '/about');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadTemplateElement(tpl);

    expect(wrapper.querySelector('template[route]')).not.toBeNull();
    expect(wrapper.querySelector('p')).toBeNull();
  });

  test('loading: inserts placeholder synchronously before fetch and removes it after', async () => {
    let resolveText;
    global.fetch = jest.fn().mockReturnValue(
      new Promise(resolve => { resolveText = () => resolve({ ok: true, text: () => Promise.resolve('<p>Real</p>') }); })
    );

    const skeleton = document.createElement('template');
    skeleton.id = 'skl';
    skeleton.innerHTML = '<div class="skeleton">Loading...</div>';
    document.body.appendChild(skeleton);

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/heavy.html');
    tpl.setAttribute('loading', '#skl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    const loadPromise = _loadTemplateElement(tpl);

    expect(wrapper.querySelector('.skeleton')).not.toBeNull();

    resolveText();
    await loadPromise;

    expect(wrapper.querySelector('.skeleton')).toBeNull();
    expect(wrapper.querySelector('p').textContent).toBe('Real');
  });

  test('loading: removes placeholder even when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const skeleton = document.createElement('template');
    skeleton.id = 'err-skl';
    skeleton.innerHTML = '<div class="err-skeleton">Loading...</div>';
    document.body.appendChild(skeleton);

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/fail.html');
    tpl.setAttribute('loading', 'err-skl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadTemplateElement(tpl);

    expect(wrapper.querySelector('.err-skeleton')).toBeNull();
  });

  test('loading: no-op when referenced template does not exist', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>ok</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/ok.html');
    tpl.setAttribute('loading', '#ghost');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await expect(_loadTemplateElement(tpl)).resolves.not.toThrow();
    expect(wrapper.querySelector('p').textContent).toBe('ok');
  });

  test('route template does NOT recursively load nested <template src> in content', async () => {
    
    
    global.fetch = jest.fn()
      .mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<template src="./section.tpl"></template>'),
      });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/page.tpl');
    tpl.setAttribute('route', '/page');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadTemplateElement(tpl);
    // Wait for background cache warming
    await new Promise((r) => setTimeout(r, 50));

    // Route template fetched + subtemplate cache-warmed (but not processed)
    expect(global.fetch).toHaveBeenCalledWith('/page.tpl');
    
    expect(tpl.content.querySelector('template[src="./section.tpl"]')).not.toBeNull();
  });

  test('caches fetched HTML and skips re-fetch on second call (same URL, new element)', async () => {
    
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Cached</p>'),
    });

    
    const wrapper1 = document.createElement('div');
    const tpl1 = document.createElement('template');
    tpl1.setAttribute('src', '/cached-page.tpl');
    tpl1.setAttribute('route', '/cached-page');
    wrapper1.appendChild(tpl1);
    document.body.appendChild(wrapper1);
    await _loadTemplateElement(tpl1);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    
    const wrapper2 = document.createElement('div');
    const tpl2 = document.createElement('template');
    tpl2.setAttribute('src', '/cached-page.tpl');
    tpl2.setAttribute('route', '/cached-page');
    wrapper2.appendChild(tpl2);
    document.body.appendChild(wrapper2);
    await _loadTemplateElement(tpl2);

    
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(tpl2.innerHTML).toBe('<p>Cached</p>');
  });

  test('re-fetches when _config.templates.cache is false', async () => {
    _config.templates.cache = false;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>Fresh</p>'),
    });

    
    const wrapper1 = document.createElement('div');
    const tpl1 = document.createElement('template');
    tpl1.setAttribute('src', '/uncached.tpl');
    tpl1.setAttribute('route', '/uncached');
    wrapper1.appendChild(tpl1);
    document.body.appendChild(wrapper1);
    await _loadTemplateElement(tpl1);

    
    const wrapper2 = document.createElement('div');
    const tpl2 = document.createElement('template');
    tpl2.setAttribute('src', '/uncached.tpl');
    tpl2.setAttribute('route', '/uncached');
    wrapper2.appendChild(tpl2);
    document.body.appendChild(wrapper2);
    await _loadTemplateElement(tpl2);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    _config.templates.cache = true;
  });
});




describe('_processTemplateIncludes', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  test('replaces template[include] with a clone of the referenced template', () => {
    const source = document.createElement('template');
    source.id = 'my-skeleton';
    source.innerHTML = '<div class="skeleton">Loading...</div>';
    document.body.appendChild(source);

    const wrapper = document.createElement('div');
    const inc = document.createElement('template');
    inc.setAttribute('include', 'my-skeleton');
    wrapper.appendChild(inc);
    document.body.appendChild(wrapper);

    _processTemplateIncludes();

    expect(wrapper.querySelector('template[include]')).toBeNull();
    expect(wrapper.querySelector('.skeleton')).not.toBeNull();
    expect(wrapper.querySelector('.skeleton').textContent).toBe('Loading...');
  });

  test('supports # prefix on include id', () => {
    const source = document.createElement('template');
    source.id = 'hash-tpl';
    source.innerHTML = '<span class="hash-content">ok</span>';
    document.body.appendChild(source);

    const wrapper = document.createElement('div');
    const inc = document.createElement('template');
    inc.setAttribute('include', '#hash-tpl');
    wrapper.appendChild(inc);
    document.body.appendChild(wrapper);

    _processTemplateIncludes();

    expect(wrapper.querySelector('.hash-content')).not.toBeNull();
  });

  test('silently skips unknown include ids', () => {
    const wrapper = document.createElement('div');
    const inc = document.createElement('template');
    inc.setAttribute('include', 'nonexistent');
    wrapper.appendChild(inc);
    document.body.appendChild(wrapper);

    expect(() => _processTemplateIncludes()).not.toThrow();
    
    expect(wrapper.querySelector('template[include]')).not.toBeNull();
  });

  test('clones independently — multiple includes of same template are separate nodes', () => {
    const source = document.createElement('template');
    source.id = 'multi-tpl';
    source.innerHTML = '<p class="item">A</p>';
    document.body.appendChild(source);

    const wrapper = document.createElement('div');
    for (let i = 0; i < 3; i++) {
      const inc = document.createElement('template');
      inc.setAttribute('include', 'multi-tpl');
      wrapper.appendChild(inc);
    }
    document.body.appendChild(wrapper);

    _processTemplateIncludes();

    const items = wrapper.querySelectorAll('.item');
    expect(items).toHaveLength(3);
    items[0].textContent = 'modified';
    expect(items[1].textContent).toBe('A'); 
  });

  test('scoped to a root element when provided', () => {
    const source = document.createElement('template');
    source.id = 'scoped-tpl';
    source.innerHTML = '<b>scoped</b>';
    document.body.appendChild(source);

    const inside = document.createElement('div');
    const inc = document.createElement('template');
    inc.setAttribute('include', 'scoped-tpl');
    inside.appendChild(inc);

    const outside = document.createElement('div');
    const inc2 = document.createElement('template');
    inc2.setAttribute('include', 'scoped-tpl');
    outside.appendChild(inc2);

    document.body.appendChild(inside);
    document.body.appendChild(outside);

    _processTemplateIncludes(inside);

    expect(inside.querySelector('b')).not.toBeNull();
    expect(outside.querySelector('template[include]')).not.toBeNull(); 
  });
});





describe('_loadRemoteTemplatesPhase1', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>content</p>'),
    });
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
  });

  test('loads priority templates first', async () => {
    
    const tplPriority = document.createElement('template');
    tplPriority.setAttribute('src', '/priority.html');
    tplPriority.setAttribute('lazy', 'priority');
    tplPriority.setAttribute('route', '/priority');
    document.body.appendChild(tplPriority);

    
    const wrapper = document.createElement('div');
    const tplNonRoute = document.createElement('template');
    tplNonRoute.setAttribute('src', '/header.html');
    wrapper.appendChild(tplNonRoute);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplatesPhase1('/home');

    expect(global.fetch).toHaveBeenCalledWith('/priority.html');
    expect(global.fetch).toHaveBeenCalledWith('/header.html');
  });

  test('skips ondemand templates', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/about.html');
    tpl.setAttribute('route', '/about');
    tpl.setAttribute('lazy', 'ondemand');
    document.body.appendChild(tpl);

    await _loadRemoteTemplatesPhase1('/home');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('loads default route template in phase 1', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/home.html');
    tpl.setAttribute('route', '/home');
    document.body.appendChild(tpl);

    await _loadRemoteTemplatesPhase1('/home');

    expect(global.fetch).toHaveBeenCalledWith('/home.html');
  });

  test('skips non-default route templates in phase 1', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/about.html');
    tpl.setAttribute('route', '/about');
    document.body.appendChild(tpl);

    await _loadRemoteTemplatesPhase1('/home');

    expect(global.fetch).not.toHaveBeenCalled();
  });
});





describe('_loadRemoteTemplatesPhase2', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>content</p>'),
    });
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
  });

  test('loads non-default route templates', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/about.html');
    tpl.setAttribute('route', '/about');
    document.body.appendChild(tpl);

    await _loadRemoteTemplatesPhase2();

    expect(global.fetch).toHaveBeenCalledWith('/about.html');
  });

  test('skips ondemand templates', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/about.html');
    tpl.setAttribute('route', '/about');
    tpl.setAttribute('lazy', 'ondemand');
    document.body.appendChild(tpl);

    await _loadRemoteTemplatesPhase2();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('skips already-loaded templates', async () => {
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/about.html');
    tpl.setAttribute('route', '/about');
    tpl.__srcLoaded = true;
    document.body.appendChild(tpl);

    await _loadRemoteTemplatesPhase2();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});




describe('_loadTemplateElement — subtemplate cache warming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('route template pre-warms HTML cache for nested subtemplates', async () => {
    global.fetch = jest.fn((url) => {
      if (url === 'templates/docs.html') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<template src="./docs/sidebar.tpl"></template><template src="./docs/getting-started.tpl"></template>'),
        });
      }
      if (url === 'templates/docs/sidebar.tpl') {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('<nav>Sidebar</nav>') });
      }
      if (url === 'templates/docs/getting-started.tpl') {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('<section>Getting Started</section>') });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('') });
    });

    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'templates/docs.html');
    tpl.setAttribute('route', '/docs');
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);
    // Wait for background cache warming
    await new Promise((r) => setTimeout(r, 50));

    expect(_templateHtmlCache.has('templates/docs/sidebar.tpl')).toBe(true);
    expect(_templateHtmlCache.has('templates/docs/getting-started.tpl')).toBe(true);
    expect(_templateHtmlCache.get('templates/docs/sidebar.tpl')).toBe('<nav>Sidebar</nav>');
  });

  test('does not re-fetch subtemplates already in cache', async () => {
    _templateHtmlCache.set('templates/docs/sidebar.tpl', '<nav>Cached</nav>');

    global.fetch = jest.fn((url) => {
      if (url === 'templates/docs.html') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<template src="./docs/sidebar.tpl"></template>'),
        });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('') });
    });

    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'templates/docs.html');
    tpl.setAttribute('route', '/docs');
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);
    await new Promise((r) => setTimeout(r, 50));

    // Only the route template itself should be fetched, not the cached subtemplate
    expect(global.fetch).toHaveBeenCalledWith('templates/docs.html');
    expect(global.fetch).not.toHaveBeenCalledWith('templates/docs/sidebar.tpl');
    expect(_templateHtmlCache.get('templates/docs/sidebar.tpl')).toBe('<nav>Cached</nav>');
  });

  test('non-route templates do not trigger cache warming (they use _loadRemoteTemplates)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('<p>content</p>'),
    }));

    const parent = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'components/header.html');
    // No route attribute
    parent.appendChild(tpl);
    document.body.appendChild(parent);

    await _loadTemplateElement(tpl);
    await new Promise((r) => setTimeout(r, 50));

    // Should have been fetched and processed via _loadRemoteTemplates, not cache warming
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('_loadTemplateElement — HTTP error handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('should set __loadFailed and leave innerHTML empty on HTTP 404', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    });

    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/missing.tpl');
    tpl.setAttribute('route', '/missing');
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);

    expect(tpl.innerHTML).toBe('');
    expect(tpl.__loadFailed).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]', 'Failed to load template:', '/missing.tpl', 'HTTP', 404
    );

    warnSpy.mockRestore();
  });

  test('should set __loadFailed and leave innerHTML empty on HTTP 500', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/error.tpl');
    tpl.setAttribute('route', '/error');
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);

    expect(tpl.innerHTML).toBe('');
    expect(tpl.__loadFailed).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]', 'Failed to load template:', '/error.tpl', 'HTTP', 500
    );

    warnSpy.mockRestore();
  });

  test('should not cache failed HTTP responses', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    });

    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/not-cached.tpl');
    tpl.setAttribute('route', '/not-cached');
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);

    expect(_templateHtmlCache.has('/not-cached.tpl')).toBe(false);

    console.warn.mockRestore();
  });

  test('should load and cache content normally on HTTP 200', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>OK</p>'),
    });

    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/success.tpl');
    tpl.setAttribute('route', '/success');
    document.body.appendChild(tpl);

    await _loadTemplateElement(tpl);

    expect(tpl.innerHTML).toBe('<p>OK</p>');
    expect(tpl.__loadFailed).toBeUndefined();
    expect(_templateHtmlCache.has('/success.tpl')).toBe(true);
    expect(_templateHtmlCache.get('/success.tpl')).toBe('<p>OK</p>');
  });
});

describe('_loadRemoteTemplates — HTTP error handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('should not cache template and should warn on HTTP error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', '/forbidden.tpl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(_templateHtmlCache.has('/forbidden.tpl')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]', 'Failed to load template:', '/forbidden.tpl', 'HTTP', 403
    );
    // Template was not inlined — wrapper should still have the template element
    // (or be empty since the template content was never set)
    expect(wrapper.textContent).toBe('');

    warnSpy.mockRestore();
  });
});

describe('Template integrity — insecure HTTP warning', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('warns when http:// URL is loaded from an https: page', () => {
    _warnIfInsecureTemplateUrl('http://cdn.example.com/header.tpl', 'http://cdn.example.com/header.tpl', 'https:');
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      'Template "http://cdn.example.com/header.tpl" is loaded over insecure HTTP from an HTTPS page. Use HTTPS to prevent tampering.'
    );
  });

  test('does NOT warn when https:// URL is loaded from an https: page', () => {
    _warnIfInsecureTemplateUrl('https://cdn.example.com/header.tpl', 'https://cdn.example.com/header.tpl', 'https:');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('does NOT warn when loading a relative URL from an https: page', () => {
    _warnIfInsecureTemplateUrl('/partials/header.tpl', '/partials/header.tpl', 'https:');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('does NOT warn when page itself is on http: (not cross-protocol)', () => {
    _warnIfInsecureTemplateUrl('http://cdn.example.com/header.tpl', 'http://cdn.example.com/header.tpl', 'http:');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('_loadRemoteTemplates does not warn for http:// from http: page (same protocol)', async () => {
    // jsdom defaults to http: protocol, so loading http:// URLs should not warn
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>content</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'http://cdn.example.com/header.tpl');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadRemoteTemplates();

    expect(warnSpy).not.toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('insecure HTTP')
    );

    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('_loadTemplateElement does not warn for https:// URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<p>content</p>'),
    });

    const wrapper = document.createElement('div');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', 'https://cdn.example.com/page.tpl');
    tpl.setAttribute('route', '/page');
    wrapper.appendChild(tpl);
    document.body.appendChild(wrapper);

    await _loadTemplateElement(tpl);

    expect(warnSpy).not.toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('insecure HTTP')
    );

    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });
});

describe('dom.js — template HTML cache LRU eviction (NOJS-64 #26)', () => {
  const realMax = _config.templates.maxSize;

  beforeEach(() => {
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
    if (realMax === undefined) delete _config.templates.maxSize;
    else _config.templates.maxSize = realMax;
  });

  test('evicts the least-recently-used entry once capacity is exceeded', async () => {
    _config.templates.maxSize = 2;
    let counter = 0;
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('<p>' + (++counter) + '</p>') })
    );

    const load = async (url) => {
      const tpl = document.createElement('template');
      tpl.setAttribute('src', url);
      document.body.appendChild(tpl);
      await _loadTemplateElement(tpl);
    };

    await load('/a.tpl');
    await load('/b.tpl');
    expect(_templateHtmlCache.has('/a.tpl')).toBe(true);
    expect(_templateHtmlCache.has('/b.tpl')).toBe(true);

    // Loading a third URL must evict the oldest (/a.tpl)
    await load('/c.tpl');
    expect(_templateHtmlCache.has('/a.tpl')).toBe(false);
    expect(_templateHtmlCache.has('/b.tpl')).toBe(true);
    expect(_templateHtmlCache.has('/c.tpl')).toBe(true);
    expect(_templateHtmlCache.size).toBe(2);
  });

  test('cache never grows beyond the default cap', async () => {
    _config.templates.maxSize = 3;
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('<p>x</p>') })
    );
    for (let i = 0; i < 10; i++) {
      const tpl = document.createElement('template');
      tpl.setAttribute('src', '/t' + i + '.tpl');
      document.body.appendChild(tpl);
      await _loadTemplateElement(tpl);
    }
    expect(_templateHtmlCache.size).toBe(3);
  });
});

describe('dom.js — SVG data URI sanitization with non-Latin1 content (NOJS-64 #27)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  test('base64 SVG with UTF-8 multibyte chars is sanitized, not replaced with "#"', () => {
    // SVG containing a non-Latin1 character (é / emoji) that would make btoa throw.
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>café 😀</text></svg>';
    const b64 = Buffer.from(svg, 'utf-8').toString('base64');
    const html = '<img src="data:image/svg+xml;base64,' + b64 + '">';

    const out = _sanitizeHtml(html);
    expect(out).toContain('data:image/svg+xml;base64,');
    // Must NOT have been collapsed to the "#" failure sentinel
    expect(out).not.toContain('src="#"');

    // The re-encoded base64 must round-trip back to UTF-8 containing the text
    const m = out.match(/data:image\/svg\+xml;base64,([^"]+)/);
    expect(m).not.toBeNull();
    const decoded = Buffer.from(m[1], 'base64').toString('utf-8');
    expect(decoded).toContain('café');
    expect(decoded).toContain('😀');
  });

  test('strips on* handlers from a non-Latin1 base64 SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><text>náo</text></svg>';
    const b64 = Buffer.from(svg, 'utf-8').toString('base64');
    const out = _sanitizeHtml('<img src="data:image/svg+xml;base64,' + b64 + '">');
    const m = out.match(/data:image\/svg\+xml;base64,([^"]+)/);
    expect(m).not.toBeNull();
    const decoded = Buffer.from(m[1], 'base64').toString('utf-8');
    expect(decoded).not.toContain('onload');
    expect(decoded).toContain('náo');
  });
});

describe('dom.js — concurrent template load dedup (NOJS-64 #64)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });
  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('two simultaneous loads of the same URL issue a single fetch', async () => {
    let resolveFetch;
    global.fetch = jest.fn(() => new Promise((res) => {
      resolveFetch = () => res({ ok: true, text: () => Promise.resolve('<p>shared</p>') });
    }));

    const make = () => {
      const tpl = document.createElement('template');
      tpl.setAttribute('src', '/shared.tpl');
      document.body.appendChild(tpl);
      return tpl;
    };
    const t1 = make();
    const t2 = make();

    const p1 = _loadTemplateElement(t1);
    const p2 = _loadTemplateElement(t2);
    // Resolve the single in-flight fetch
    await new Promise((r) => setTimeout(r, 0));
    resolveFetch();
    await Promise.all([p1, p2]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(_templateHtmlCache.get('/shared.tpl')).toBe('<p>shared</p>');
  });
});

describe('dom.js — "./" template path resolves to absolute for insecure-URL check (NOJS-64 #78)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });
  afterEach(() => {
    delete global.fetch;
    document.body.innerHTML = '';
    _templateHtmlCache.clear();
  });

  test('"./" path with an http:// base ancestor triggers the mixed-content warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const prevDebug = _config.debug;
    _config.debug = false;

    global.fetch = jest.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('<p>x</p>') }));

    // Container carries an http:// base so resolveUrl makes "./foo.tpl" absolute http://
    const container = document.createElement('div');
    container.setAttribute('base', 'http://example.com/templates');
    const tpl = document.createElement('template');
    tpl.setAttribute('src', './foo.tpl');
    container.appendChild(tpl);
    document.body.appendChild(container);

    // Simulate an HTTPS page so the cross-protocol warning condition holds.
    _warnIfInsecureTemplateUrl('http://example.com/templates/foo.tpl', './foo.tpl', 'https:');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    _config.debug = prevDebug;
  });
});
