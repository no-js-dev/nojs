import { _stores } from '../src/globals.js';
import { processTree, _disposeTree } from '../src/registry.js';

// Side-effect imports: register built-in directives needed for tests
import '../src/directives/state.js';
import '../src/directives/conditionals.js';
import '../src/directives/head.js';

// ═══════════════════════════════════════════════════════════════════════
//  GATE HEAD TESTS (NOJS-254)
//
//  Verifies that page-title, page-description, page-canonical, and
//  page-jsonld directives are correctly gated by a same-element `if`
//  directive via the B1 infrastructure (`gated: true` flag).
// ═══════════════════════════════════════════════════════════════════════

describe('Gate Flags — page-title, page-description, page-canonical, page-jsonld', () => {
  let originalTitle;

  beforeEach(() => {
    originalTitle = document.title;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.title = originalTitle;
    // Clean up any meta/link/script elements added by head directives
    document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
    document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
    document.querySelectorAll('script[type="application/ld+json"][data-nojs]').forEach((el) => el.remove());
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── page-title gated ──────────────────────────────────────────────────

  describe('page-title gated by same-element if', () => {
    test('1 — document.title unchanged while if is falsy, applied on flip-true', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, name: "My App" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-title', "'Home | ' + name");
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // page-title deferred — document.title unchanged
      expect(document.title).toBe(originalTitle);

      // Flip to true → page-title activates
      wrapper.__ctx.show = true;
      expect(document.title).toBe('Home | My App');
    });

    test('2 — page-title without if runs normally (no regression)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ name: "Direct" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('page-title', "name");
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // No if → page-title runs immediately
      expect(document.title).toBe('Direct');
    });
  });

  // ── page-description gated ────────────────────────────────────────────

  describe('page-description gated by same-element if', () => {
    test('3 — meta description unchanged while if is falsy', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, desc: "A great product" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-description', 'desc');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // page-description deferred — no meta element created
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).toBeNull();

      // Flip to true → meta description created and set
      wrapper.__ctx.show = true;
      const metaAfter = document.querySelector('meta[name="description"]');
      expect(metaAfter).not.toBeNull();
      expect(metaAfter.content).toBe('A great product');
    });

    test('4 — meta description not created while falsy, correct on flip', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, desc: "SEO text" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-description', 'desc');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // No meta tag should exist
      expect(document.querySelector('meta[name="description"]')).toBeNull();

      // Flip true → meta created
      wrapper.__ctx.show = true;
      expect(document.querySelector('meta[name="description"]').content).toBe('SEO text');
    });
  });

  // ── page-canonical gated ──────────────────────────────────────────────

  describe('page-canonical gated by same-element if', () => {
    test('5 — canonical link unchanged while if is falsy', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, slug: "my-product" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-canonical', "'/products/' + slug");
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // page-canonical deferred — no link element created
      const link = document.querySelector('link[rel="canonical"]');
      expect(link).toBeNull();

      // Flip to true → canonical link created and set
      wrapper.__ctx.show = true;
      const linkAfter = document.querySelector('link[rel="canonical"]');
      expect(linkAfter).not.toBeNull();
      expect(linkAfter.href).toContain('/products/my-product');
    });
  });

  // ── page-jsonld gated ─────────────────────────────────────────────────

  describe('page-jsonld gated by same-element if', () => {
    test('6 — JSON-LD script unchanged while if is falsy', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, name: "Widget" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-jsonld', '');
      el.textContent = '{"@context":"https://schema.org","@type":"Product","name":"{name}"}';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // page-jsonld deferred — no script element created
      const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
      expect(script).toBeNull();

      // Flip to true → JSON-LD script created
      wrapper.__ctx.show = true;
      const scriptAfter = document.querySelector('script[type="application/ld+json"][data-nojs]');
      expect(scriptAfter).not.toBeNull();
      expect(scriptAfter.textContent).toContain('"Widget"');
    });
  });

  // ── Flip-false: no NEW mutations ──────────────────────────────────────

  describe('no new mutations after flip-false', () => {
    test('7 — page-title stops updating after flip-false', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, name: "App" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-title', 'name');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Activate
      wrapper.__ctx.show = true;
      expect(document.title).toBe('App');

      // Deactivate — title remains as-is (no reset), but further changes to
      // the context should NOT update the title
      wrapper.__ctx.show = false;

      // Mutate context while gated — page-title watcher should be torn down
      wrapper.__ctx.name = 'Changed';
      // Title should still be 'App' (the last value before deactivation),
      // not 'Changed'
      expect(document.title).toBe('App');
    });

    test('8 — page-description stops updating after flip-false', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, desc: "First" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-description', 'desc');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Activate
      wrapper.__ctx.show = true;
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta.content).toBe('First');

      // Deactivate
      wrapper.__ctx.show = false;

      // Mutate while gated — meta should not update
      wrapper.__ctx.desc = 'Second';
      // If the meta still exists, its content must not have changed
      const metaAfter = document.querySelector('meta[name="description"]');
      if (metaAfter) {
        expect(metaAfter.content).not.toBe('Second');
      }
    });

    test('9 — page-canonical stops updating after flip-false', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, slug: "first" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-canonical', "'/products/' + slug");
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Activate
      wrapper.__ctx.show = true;
      const link = document.querySelector('link[rel="canonical"]');
      expect(link).not.toBeNull();
      expect(link.href).toContain('/products/first');

      // Deactivate
      wrapper.__ctx.show = false;

      // Mutate while gated — canonical should not update
      wrapper.__ctx.slug = 'second';
      const linkAfter = document.querySelector('link[rel="canonical"]');
      if (linkAfter) {
        expect(linkAfter.href).not.toContain('/products/second');
      }
    });

    test('10 — page-jsonld stops updating after flip-false', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, name: "Alpha" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-jsonld', '');
      el.textContent = '{"@context":"https://schema.org","@type":"Product","name":"{name}"}';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Activate
      wrapper.__ctx.show = true;
      const script = document.querySelector('script[type="application/ld+json"][data-nojs]');
      expect(script).not.toBeNull();
      expect(script.textContent).toContain('"Alpha"');

      // Deactivate
      wrapper.__ctx.show = false;

      // Mutate while gated — JSON-LD should not update
      wrapper.__ctx.name = 'Beta';
      const scriptAfter = document.querySelector('script[type="application/ld+json"][data-nojs]');
      if (scriptAfter) {
        expect(scriptAfter.textContent).not.toContain('"Beta"');
      }
    });

    test('11 — page-title re-activates on second flip-true', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, name: "V1" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-title', 'name');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // First activation
      wrapper.__ctx.show = true;
      expect(document.title).toBe('V1');

      // Deactivate
      wrapper.__ctx.show = false;
      wrapper.__ctx.name = 'V2';
      expect(document.title).toBe('V1');

      // Re-activate — should pick up the current context value
      wrapper.__ctx.show = true;
      expect(document.title).toBe('V2');
    });

    test('12 — initially-true if: page-title runs immediately', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: true, name: "Immediate" }');
      const el = document.createElement('div');
      el.setAttribute('hidden', '');
      el.setAttribute('if', 'show');
      el.setAttribute('page-title', 'name');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // if starts truthy → page-title runs immediately
      expect(document.title).toBe('Immediate');
    });
  });
});
