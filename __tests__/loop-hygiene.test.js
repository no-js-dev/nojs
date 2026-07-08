// ═══════════════════════════════════════════════════════════════════════
//  Loop hygiene: HTTP guard, else ownership, page-* strip, else-if defenses
//  NOJS-257
// ═══════════════════════════════════════════════════════════════════════

import { _stores, _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { processTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/head.js';
import '../src/directives/http.js';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.title = '';
  _config.retries = 0;
  _config.timeout = 10000;
  _config.baseApiUrl = '';
});

afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.title = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
});

// ─── Finding 4: HTTP verb on loop element ────────────────────────────────────

describe('HTTP verb on loop element guard', () => {
  let originalFetch;
  let warnSpy;

  beforeEach(() => {
    originalFetch = global.fetch;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    warnSpy.mockRestore();
  });

  test('warns and does not fetch when GET is on a foreach element (empty array)', () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve([]),
    });

    document.body.innerHTML = `
      <div state='{"items": []}'>
        <div foreach="item in items" get="/api/data" as="result">
          <span bind="item.name"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    // The GET directive should warn and NOT fire any fetch
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('HTTP verb directive on a loop element'),
      expect.anything(),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('warns and does not fetch when GET is on each element (populated array)', () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({ name: 'test' }),
    });

    document.body.innerHTML = `
      <div state='{"users": [{"name":"A"},{"name":"B"},{"name":"C"}]}'>
        <div each="user in users" get="/api/user" as="detail">
          <span bind="user.name"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    // Should warn once (on the template element, before cloning)
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('HTTP verb directive on a loop element'),
      expect.anything(),
    );
    // No fetch should fire — not even once
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('HTTP verb attrs are stripped from loop clones', () => {
    document.body.innerHTML = `
      <div state='{"items": [{"id":1},{"id":2}]}'>
        <span each="item in items" get="/api/data" post="/api/save"
              put="/api/update" patch="/api/patch" delete="/api/remove">
          <span bind="item.id"></span>
        </span>
      </div>
    `;
    // Suppress the expected warnings
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    processTree(document.body);

    // Verify clones do not carry HTTP verb attrs
    const clones = document.querySelectorAll('span[bind]');
    const parents = new Set();
    clones.forEach((c) => parents.add(c.parentElement));
    for (const clone of parents) {
      expect(clone.hasAttribute('get')).toBe(false);
      expect(clone.hasAttribute('post')).toBe(false);
      expect(clone.hasAttribute('put')).toBe(false);
      expect(clone.hasAttribute('patch')).toBe(false);
      expect(clone.hasAttribute('delete')).toBe(false);
    }
  });
});

// ─── Finding 8: else ownership when loop + if coexist ────────────────────────

describe('else ownership on loop + if element', () => {
  test('else template renders under same-element if (conditional else, not loop empty-state)', () => {
    document.body.innerHTML = `
      <div state='{"show": false, "items": ["a","b"]}'>
        <span each="item in items" if="show" else="fallbackTpl">
          <span bind="item"></span>
        </span>
        <template id="fallbackTpl"><p class="fallback">Hidden content</p></template>
      </div>
    `;
    processTree(document.body);

    // if="show" is false, so the if directive should render the else template
    // inside each clone. The loop's empty-state should NOT consume the else attr
    // because `if` owns it.
    // Since show=false, the if directive hides the element content and shows the
    // else template. The items array is populated so the loop does create clones.
    // Each clone should have the if directive render its else branch.
    const fallbacks = document.querySelectorAll('.fallback');
    expect(fallbacks.length).toBeGreaterThan(0);
  });

  test('loop empty state does not use else attr when if is present', () => {
    document.body.innerHTML = `
      <div state='{"show": true, "items": []}'>
        <span each="item in items" if="show" else="emptyTpl">
          <span bind="item"></span>
        </span>
        <template id="emptyTpl"><p class="empty-state">No items</p></template>
      </div>
    `;
    processTree(document.body);

    // items is empty, but the else attr belongs to `if`, not the loop.
    // The loop should NOT render the else template as empty state.
    // Instead, the if directive on the clone would render it (but there are
    // no clones because the list is empty). So no .empty-state should appear
    // as loop empty content.
    const emptyNodes = document.querySelectorAll('.empty-state');
    expect(emptyNodes.length).toBe(0);
  });
});

// ─── Finding 25: page-* × loop ──────────────────────────────────────────────

describe('page-* directives on loop elements', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('document.title stays stable across loop clones (page-title stripped)', () => {
    document.title = 'Original Title';
    document.body.innerHTML = `
      <div state='{"items": [{"name":"A"},{"name":"B"},{"name":"C"}]}'>
        <div each="item in items" page-title="item.name">
          <span bind="item.name"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    // page-title on a loop element should warn and be stripped from clones.
    // document.title should NOT be set to any item's name.
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('head directive on a loop element'),
      expect.anything(),
    );
    expect(document.title).toBe('Original Title');
  });

  test('page-description is not duplicated across clones', () => {
    document.body.innerHTML = `
      <div state='{"items": [{"desc":"A"},{"desc":"B"}]}'>
        <div each="item in items" page-description="item.desc">
          <span bind="item.desc"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    // Should warn and bail — no meta description created per clone
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('head directive on a loop element'),
      expect.anything(),
    );
    const metas = document.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(0);
  });

  test('page-* attrs are stripped from loop clones', () => {
    document.body.innerHTML = `
      <div state='{"items": [{"name":"A"},{"name":"B"}]}'>
        <div each="item in items"
             page-title="item.name"
             page-description="item.name"
             page-canonical="'/items/' + item.name"
             page-jsonld>
          <span bind="item.name"></span>
        </div>
      </div>
    `;
    processTree(document.body);

    // Verify clones do not carry page-* attrs
    const clones = document.querySelectorAll('div[bind] , div:not([state])');
    for (const clone of clones) {
      if (clone.querySelector('[bind]')) {
        expect(clone.hasAttribute('page-title')).toBe(false);
        expect(clone.hasAttribute('page-description')).toBe(false);
        expect(clone.hasAttribute('page-canonical')).toBe(false);
        expect(clone.hasAttribute('page-jsonld')).toBe(false);
      }
    }
  });
});

// ─── Finding 26: else-if + loop ──────────────────────────────────────────────

describe('else-if on loop element', () => {
  test('else-if chain works when sibling is a loop', () => {
    document.body.innerHTML = `
      <div state='{"mode": "list", "items": ["x","y"]}'>
        <p if="mode === 'grid'">Grid mode</p>
        <div else-if="mode === 'list'" each="item in items">
          <span bind="item"></span>
        </div>
        <p else>Unknown mode</p>
      </div>
    `;
    processTree(document.body);

    // mode === 'list' is true, and the element also has each="item in items".
    // The else-if should early-return for loop elements (the attribute is
    // stripped from clones), and the loop should render its items.
    // The <p if> should be hidden, the <p else> should be hidden.
    const ifEl = document.querySelector('p[if]');
    expect(ifEl.style.display === 'none' || ifEl.innerHTML === '').toBe(true);

    // The loop should have rendered items
    const spans = document.querySelectorAll('span[bind]');
    // Loop clones are siblings of the original element (which is removed).
    // Just check that the loop rendered at least 2 items.
    expect(spans.length).toBe(2);
  });

  test('else-if attr is stripped from loop clones', () => {
    document.body.innerHTML = `
      <div state='{"show": false, "items": ["a","b","c"]}'>
        <p if="show">Shown</p>
        <span else-if="!show" each="item in items">
          <span bind="item"></span>
        </span>
      </div>
    `;
    processTree(document.body);

    // Verify clones do not carry else-if attr
    const clones = document.body.querySelectorAll('span:not([state])');
    for (const clone of clones) {
      if (clone.querySelector('[bind]')) {
        expect(clone.hasAttribute('else-if')).toBe(false);
      }
    }
  });
});
