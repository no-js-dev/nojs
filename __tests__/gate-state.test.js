import { _stores } from '../src/globals.js';
import { processTree, _disposeTree } from '../src/registry.js';

// Side-effect imports: register built-in directives needed for tests
import '../src/directives/state.js';
import '../src/directives/conditionals.js';
import '../src/directives/binding.js';
import '../src/directives/events.js';

// ═══════════════════════════════════════════════════════════════════════
//  GATE-STATE TESTS — computed + watch under same-element if
//
//  Verifies that `computed` and `watch` directives (registered with
//  `gated: true`) are deferred while a same-element `if` is falsy,
//  activate on flip-true, and dispose on flip-false.
//
//  Repros Finding 24: computed on a falsy-if element must stay inert.
// ═══════════════════════════════════════════════════════════════════════

describe('Gate: computed + watch (state.js)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  function buildComputedFixture(stateObj, computedName, expr) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', JSON.stringify(stateObj));
    const el = document.createElement('span');
    el.setAttribute('if', Object.keys(stateObj)[0]);
    el.setAttribute('computed', computedName);
    el.setAttribute('expr', expr);
    el.textContent = 'computed-content';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    return { wrapper, el };
  }

  function buildWatchFixture(stateObj, watchExpr, onChangeExpr) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', JSON.stringify(stateObj));
    const el = document.createElement('span');
    el.setAttribute('if', Object.keys(stateObj)[0]);
    el.setAttribute('watch', watchExpr);
    if (onChangeExpr) el.setAttribute('on:change', onChangeExpr);
    el.textContent = 'watch-content';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    return { wrapper, el };
  }

  // ── computed tests ────────────────────────────────────────────────────

  describe('computed gating', () => {
    test('1 — Finding 24 repro: computed on falsy-if element stays inert (no recomputes)', () => {
      const { wrapper, el } = buildComputedFixture(
        { show: false, a: 10, b: 20 },
        'total',
        'a + b'
      );

      processTree(wrapper);

      // computed must NOT have been initialized — no "total" in context
      const ctx = wrapper.__ctx;
      expect(ctx.total).toBeUndefined();

      // Change a dependency — computed must NOT recompute
      ctx.a = 100;
      expect(ctx.total).toBeUndefined();
    });

    test('2 — computed activates on flip-true and computes correctly', () => {
      const { wrapper, el } = buildComputedFixture(
        { show: false, a: 10, b: 20 },
        'total',
        'a + b'
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;
      expect(ctx.total).toBeUndefined();

      // Flip to true — computed initializes
      ctx.show = true;
      expect(ctx.total).toBe(30);
    });

    test('3 — computed reacts to dependency changes after activation', () => {
      const { wrapper } = buildComputedFixture(
        { show: false, a: 10, b: 20 },
        'total',
        'a + b'
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Activate
      ctx.show = true;
      expect(ctx.total).toBe(30);

      // Change dependency — computed should recompute
      ctx.a = 50;
      expect(ctx.total).toBe(70);
    });

    test('4 — computed disposed after flip-false (no recomputes)', () => {
      const { wrapper } = buildComputedFixture(
        { show: false, a: 10, b: 20 },
        'total',
        'a + b'
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Activate
      ctx.show = true;
      expect(ctx.total).toBe(30);

      // Deactivate
      ctx.show = false;

      // Change dependency — computed must NOT recompute (disposed)
      ctx.a = 999;
      // total retains its last value (30) but is no longer reactive
      expect(ctx.total).toBe(30);
    });

    test('5 — computed re-initializes on second flip-true', () => {
      const { wrapper } = buildComputedFixture(
        { show: false, a: 10, b: 20 },
        'total',
        'a + b'
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Cycle 1: activate, verify, deactivate
      ctx.show = true;
      expect(ctx.total).toBe(30);
      ctx.show = false;

      // Change dependency while hidden
      ctx.a = 50;
      // total should NOT have updated (gated)
      expect(ctx.total).toBe(30);

      // Cycle 2: re-activate — computed picks up current values
      ctx.show = true;
      expect(ctx.total).toBe(70);
    });
  });

  // ── watch tests ───────────────────────────────────────────────────────

  describe('watch gating', () => {
    test('6 — watch on falsy-if element does not fire on dependency change', () => {
      const { wrapper } = buildWatchFixture(
        { show: false, count: 0, log: '' },
        'count',
        "log = log + 'fired;'"
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Change the watched value — watch must NOT fire
      ctx.count = 5;
      expect(ctx.log).toBe('');

      ctx.count = 10;
      expect(ctx.log).toBe('');
    });

    test('7 — watch activates on flip-true', () => {
      const { wrapper } = buildWatchFixture(
        { show: false, count: 0, log: '' },
        'count',
        "log = log + 'fired;'"
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Activate
      ctx.show = true;

      // Watch should now be live — change the watched value
      ctx.count = 1;
      expect(ctx.log).toBe('fired;');

      ctx.count = 2;
      expect(ctx.log).toBe('fired;fired;');
    });

    test('8 — watch disposed after flip-false (dependency changes ignored)', () => {
      const { wrapper } = buildWatchFixture(
        { show: false, count: 0, log: '' },
        'count',
        "log = log + 'fired;'"
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Activate and verify
      ctx.show = true;
      ctx.count = 1;
      expect(ctx.log).toBe('fired;');

      // Deactivate
      ctx.show = false;

      // Change watched value — watch must NOT fire
      ctx.count = 99;
      expect(ctx.log).toBe('fired;');
    });

    test('9 — watch re-initializes on second flip-true', () => {
      const { wrapper } = buildWatchFixture(
        { show: false, count: 0, log: '' },
        'count',
        "log = log + 'fired;'"
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Cycle 1
      ctx.show = true;
      ctx.count = 1;
      expect(ctx.log).toBe('fired;');

      ctx.show = false;
      ctx.count = 2; // should not fire
      expect(ctx.log).toBe('fired;');

      // Cycle 2
      ctx.show = true;
      ctx.count = 3;
      expect(ctx.log).toBe('fired;fired;');
    });
  });

  // ── both together ─────────────────────────────────────────────────────

  describe('computed + watch together', () => {
    test('10 — both live after flip-true', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, a: 1, b: 2, log: "" }');

      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('computed', 'sum');
      el.setAttribute('expr', 'a + b');
      el.setAttribute('watch', 'sum');
      el.setAttribute('on:change', "log = log + $new + ';'");
      el.textContent = 'both';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Both deferred
      expect(ctx.sum).toBeUndefined();
      expect(ctx.log).toBe('');

      // Activate — computed initializes, watch starts
      ctx.show = true;
      expect(ctx.sum).toBe(3);

      // Change dependency — computed recomputes, watch fires
      ctx.a = 10;
      expect(ctx.sum).toBe(12);
      expect(ctx.log).toContain('12');
    });

    test('11 — both disposed after flip-back (flip-false)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ show: false, a: 1, b: 2, log: "" }');

      const el = document.createElement('span');
      el.setAttribute('if', 'show');
      el.setAttribute('computed', 'sum');
      el.setAttribute('expr', 'a + b');
      el.setAttribute('watch', 'sum');
      el.setAttribute('on:change', "log = log + $new + ';'");
      el.textContent = 'both';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Activate
      ctx.show = true;
      expect(ctx.sum).toBe(3);

      // Deactivate
      ctx.show = false;

      // Reset log to detect any new firings
      ctx.log = '';

      // Change dependency — neither should react
      ctx.a = 100;
      expect(ctx.sum).toBe(3); // last computed value, no update
      expect(ctx.log).toBe(''); // watch did not fire
    });
  });

  // ── cycle / leak tests ────────────────────────────────────────────────

  describe('cycle and leak tests', () => {
    test('12 — multiple true/false cycles: no listener leaks', () => {
      const { wrapper } = buildComputedFixture(
        { show: false, a: 1, b: 2 },
        'total',
        'a + b'
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;
      const el = wrapper.querySelector('[computed]');

      // Snapshot the if disposer count
      const ifDisposerCount = (el.__disposers || []).length;

      for (let cycle = 1; cycle <= 5; cycle++) {
        // Activate
        ctx.show = true;
        expect(ctx.total).toBe(3);
        // Gate disposers should be populated (exactly 1 for computed's watcher)
        expect(el.__gateDisposers.length).toBeGreaterThan(0);
        const gateDisposerCount = el.__gateDisposers.length;
        // if disposers unchanged
        expect(el.__disposers.length).toBe(ifDisposerCount);

        // Deactivate
        ctx.show = false;
        // Gate disposers cleared
        expect(el.__gateDisposers).toEqual([]);
        // if disposers still intact
        expect(el.__disposers.length).toBe(ifDisposerCount);
      }
    });

    test('13 — watch cycle: no listener leaks across 5 cycles', () => {
      const { wrapper } = buildWatchFixture(
        { show: false, count: 0, log: '' },
        'count',
        "log = log + 'x;'"
      );

      processTree(wrapper);
      const ctx = wrapper.__ctx;
      const el = wrapper.querySelector('[watch]');

      const ifDisposerCount = (el.__disposers || []).length;

      for (let cycle = 1; cycle <= 5; cycle++) {
        ctx.show = true;
        expect(el.__gateDisposers.length).toBeGreaterThan(0);
        expect(el.__disposers.length).toBe(ifDisposerCount);

        ctx.show = false;
        expect(el.__gateDisposers).toEqual([]);
        expect(el.__disposers.length).toBe(ifDisposerCount);
      }

      // After 5 cycles, changing count should have NO effect (watch is gated)
      ctx.count = 999;
      expect(ctx.log).toBe('');
    });

    test('14 — computed without if: runs normally (no gate)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ a: 10, b: 20 }');
      const el = document.createElement('span');
      el.setAttribute('computed', 'total');
      el.setAttribute('expr', 'a + b');
      el.textContent = 'no-if';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);

      // No if — computed runs immediately
      expect(wrapper.__ctx.total).toBe(30);
      // No gated dirs recorded
      expect(el.__gatedDirs).toBeUndefined();
    });

    test('15 — watch without if: runs normally (no gate)', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('state', '{ count: 0, log: "" }');
      const el = document.createElement('span');
      el.setAttribute('watch', 'count');
      el.setAttribute('on:change', "log = log + 'fired;'");
      el.textContent = 'no-if';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      processTree(wrapper);
      const ctx = wrapper.__ctx;

      // Watch runs immediately — changing count fires the handler
      ctx.count = 1;
      expect(ctx.log).toBe('fired;');
    });
  });
});
