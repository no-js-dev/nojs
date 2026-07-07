import { _stores, _onDispose } from '../src/globals.js';
import { _i18n, _notifyI18n } from '../src/i18n.js';
import { processTree, _disposeTree } from '../src/registry.js';

// Side-effect imports: register built-in directives needed for tests
import '../src/directives/state.js';
import '../src/directives/conditionals.js';
import '../src/directives/binding.js';
import '../src/directives/events.js';
import '../src/directives/i18n.js';

// ═══════════════════════════════════════════════════════════════════════
//  GATE FLAGS TESTS (NOJS-252)
//
//  Verifies that bind, bind-html, model, on:*, and t directives are
//  correctly gated by a same-element `if` directive via the B1
//  infrastructure (`gated: true` flag).
// ═══════════════════════════════════════════════════════════════════════

describe('Gate Flags — bind, bind-html, model, on:*, t', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Finding 2 repro: if + bind same element ──────────────────────────

  describe('bind gated by same-element if', () => {
    test('1 — bind shows empty while if is falsy, correct text after flip', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, msg: "Hello" }');
      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('bind', 'msg');
      el.textContent = 'initial';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // if is falsy → element content cleared by if, bind deferred
      expect(el.textContent).toBe('');

      // Flip to true → bind activates and renders the bound value
      wrapper.__ctx.show = true;
      expect(el.textContent).toBe('Hello');
    });

    test('2 — bind-html gated: no HTML injected while falsy, renders on flip', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, html: "<b>Bold</b>" }');
      const el = document.createElement('div');
      el.setAttribute('if', 'show');
      el.setAttribute('bind-html', 'html');
      el.textContent = 'placeholder';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // bind-html deferred — if cleared the content
      expect(el.innerHTML).toBe('');

      // Flip to true → bind-html renders sanitized HTML
      wrapper.__ctx.show = true;
      expect(el.innerHTML).toBe('<b>Bold</b>');
    });
  });

  // ── Finding 15 repros: model + on:* gated ────────────────────────────

  describe('model gated by same-element if', () => {
    test('3 — hidden input ignores model binding', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, val: "secret" }');
      const input = document.createElement('input');
      input.setAttribute('if', 'show');
      input.setAttribute('model', 'val');
      input.type = 'text';
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // model deferred — input value not set
      expect(input.value).toBe('');

      // Flip to true → model binds and sets value
      wrapper.__ctx.show = true;
      expect(input.value).toBe('secret');
    });

    test('4 — model is inert while hidden: DOM changes do not write back', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, text: "original" }');
      const input = document.createElement('input');
      input.setAttribute('if', 'show');
      input.setAttribute('model', 'text');
      input.type = 'text';
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Simulate user typing while gated — no listener attached
      input.value = 'tampered';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Context value unchanged because model was gated
      expect(wrapper.__ctx.text).toBe('original');
    });
  });

  describe('on:* events gated by same-element if', () => {
    test('5 — hidden button click is a no-op', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, count: 0 }');
      const btn = document.createElement('button');
      btn.setAttribute('if', 'show');
      btn.setAttribute('on:click', 'count++');
      btn.textContent = 'Click me';
      wrapper.appendChild(btn);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Click while gated — no listener attached
      btn.click();
      expect(wrapper.__ctx.count).toBe(0);

      // Flip to true → listener attached
      wrapper.__ctx.show = true;
      btn.click();
      expect(wrapper.__ctx.count).toBe(1);
    });

    test('6 — both model and on:click live after flip-true', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, val: "", clicks: 0 }');

      const input = document.createElement('input');
      input.setAttribute('if', 'show');
      input.setAttribute('model', 'val');
      input.setAttribute('on:click', 'clicks++');
      input.type = 'text';
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Both gated
      expect(input.value).toBe('');
      input.click();
      expect(wrapper.__ctx.clicks).toBe(0);

      // Flip to true — both activate
      wrapper.__ctx.show = true;

      // model writes value
      wrapper.__ctx.val = 'hello';
      expect(input.value).toBe('hello');

      // on:click fires
      input.click();
      expect(wrapper.__ctx.clicks).toBe(1);
    });

    test('7 — dead again after flip-false: listeners removed', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, count: 0 }');
      const btn = document.createElement('button');
      btn.setAttribute('if', 'show');
      btn.setAttribute('on:click', 'count++');
      btn.textContent = 'Click';
      wrapper.appendChild(btn);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Activate
      wrapper.__ctx.show = true;
      btn.click();
      expect(wrapper.__ctx.count).toBe(1);

      // Deactivate — listener torn down via gate disposers
      wrapper.__ctx.show = false;
      btn.click();
      // Count should not increase after deactivation
      expect(wrapper.__ctx.count).toBe(1);

      // Re-activate — fresh listener
      wrapper.__ctx.show = true;
      btn.click();
      expect(wrapper.__ctx.count).toBe(2);
    });

    test('8 — model dead after flip-false: input changes ignored', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, text: "start" }');
      const input = document.createElement('input');
      input.setAttribute('if', 'show');
      input.setAttribute('model', 'text');
      input.type = 'text';
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Activate
      wrapper.__ctx.show = true;
      expect(input.value).toBe('start');

      // Deactivate
      wrapper.__ctx.show = false;

      // Simulate user typing while deactivated
      input.value = 'changed';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(wrapper.__ctx.text).toBe('start');
    });
  });

  // ── t directive gated ────────────────────────────────────────────────

  describe('t directive gated by same-element if', () => {
    beforeEach(() => {
      _i18n.locale = 'en';
      _i18n.locales = {
        en: {
          hello: 'Hello, World!',
          greet: 'Hi, {name}!',
        },
      };
    });

    test('9 — translation not applied while falsy, applied on flip-true', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false }');
      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('t', 'hello');
      el.textContent = 'placeholder';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // t directive deferred — if cleared the content
      expect(el.textContent).toBe('');

      // Flip to true → translation applied
      wrapper.__ctx.show = true;
      expect(el.textContent).toBe('Hello, World!');
    });

    test('10 — t with params gated correctly', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, user: "Alice" }');
      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('t', 'greet');
      el.setAttribute('t-name', 'user');
      el.textContent = 'placeholder';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      expect(el.textContent).toBe('');

      wrapper.__ctx.show = true;
      expect(el.textContent).toBe('Hi, Alice!');
    });

    test('11 — t deactivated on flip-false, reactivated on next flip-true', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false }');
      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('t', 'hello');
      el.textContent = 'placeholder';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // Flip true → translated
      wrapper.__ctx.show = true;
      expect(el.textContent).toBe('Hello, World!');

      // Flip false → content cleared by if
      wrapper.__ctx.show = false;
      expect(el.textContent).toBe('');

      // Flip true again → re-translated
      wrapper.__ctx.show = true;
      expect(el.textContent).toBe('Hello, World!');
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('12 — bind without if attribute runs normally (no regression)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ msg: "works" }');
      const el = document.createElement('span');
      el.setAttribute('bind', 'msg');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // No if → bind runs immediately
      expect(el.textContent).toBe('works');
    });

    test('13 — on:click without if runs normally (no regression)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ count: 0 }');
      const btn = document.createElement('button');
      btn.setAttribute('on:click', 'count++');
      wrapper.appendChild(btn);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      btn.click();
      expect(wrapper.__ctx.count).toBe(1);
    });

    test('14 — model without if runs normally (no regression)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ name: "test" }');
      const input = document.createElement('input');
      input.setAttribute('model', 'name');
      input.type = 'text';
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      expect(input.value).toBe('test');
    });

    test('15 — initially-true if: gated directives run immediately', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: true, msg: "visible" }');
      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('bind', 'msg');
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // if starts truthy → bind runs immediately
      expect(el.textContent).toBe('visible');
    });
  });
});
