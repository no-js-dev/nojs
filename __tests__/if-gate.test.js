import { _stores, _setCurrentEl, _onDispose } from '../src/globals.js';
import { registerDirective, processTree, _disposeTree, _activateGated, _deactivateGated } from '../src/registry.js';

// Side-effect imports: register built-in directives needed for tests
import '../src/directives/state.js';
import '../src/directives/conditionals.js';

// ═══════════════════════════════════════════════════════════════════════
//  IF-GATE INFRASTRUCTURE TESTS
//
//  Verifies the registry-level gating system for directives registered
//  with `gated: true`.  Uses a synthetic test directive — no real
//  directives receive the flag in this task (that lands in B2–B5).
// ═══════════════════════════════════════════════════════════════════════

describe('If-Gate Infrastructure', () => {
  let gatedInitCalls;
  let gatedDisposeCalls;

  beforeAll(() => {
    gatedInitCalls = [];
    gatedDisposeCalls = [];

    // Synthetic gated directive at priority 1 (runs BEFORE if at 10).
    // This lets us verify order-independence — the gate evaluates the if
    // attribute directly, before the priority-sorted directive loop.
    registerDirective('test-gated', {
      priority: 1,
      gated: true,
      init(el, name, value) {
        gatedInitCalls.push({ el, name, value });
        const cleanup = () => gatedDisposeCalls.push({ el, name, value });
        _onDispose(cleanup);
      },
    });
  });

  beforeEach(() => {
    gatedInitCalls = [];
    gatedDisposeCalls = [];
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  function buildFixture(stateObj) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', JSON.stringify(stateObj));
    const el = document.createElement('span');
    el.setAttribute('if', Object.keys(stateObj)[0]);
    el.setAttribute('test-gated', 'data');
    el.textContent = 'content';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    return { wrapper, el };
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test('1 — gated directive init is deferred while if is falsy', () => {
    const { wrapper, el } = buildFixture({ show: false });

    processTree(wrapper);

    // Gated directive must NOT have been initialized
    expect(gatedInitCalls).toHaveLength(0);
    // Descriptors recorded for later activation
    expect(el.__gatedDirs).toBeDefined();
    expect(el.__gatedDirs).toHaveLength(1);
    expect(el.__gatedDirs[0].name).toBe('test-gated');
    expect(el.__gatedDirs[0].value).toBe('data');
    // Persistent metadata saved for re-gating after deactivation
    expect(el.__gatedDirsMeta).toBeDefined();
    expect(el.__gatedDirsMeta).toHaveLength(1);
  });

  test('2 — gated directive activates when if flips to true', () => {
    const { wrapper, el } = buildFixture({ show: false });

    processTree(wrapper);
    expect(gatedInitCalls).toHaveLength(0);

    // Flip to true — if renders, then _activateGated runs
    wrapper.__ctx.show = true;

    expect(gatedInitCalls).toHaveLength(1);
    expect(gatedInitCalls[0].el).toBe(el);
    expect(gatedInitCalls[0].name).toBe('test-gated');
    expect(gatedInitCalls[0].value).toBe('data');
    // __gatedDirs consumed after activation
    expect(el.__gatedDirs).toEqual([]);
    // Gate disposers populated (not in __disposers)
    expect(el.__gateDisposers).toBeDefined();
    expect(el.__gateDisposers.length).toBeGreaterThan(0);
    // el.__ifState exposed
    expect(el.__ifState).toBe(true);
  });

  test('3 — deactivation runs gate disposers without touching if watcher', () => {
    const { wrapper, el } = buildFixture({ show: false });

    processTree(wrapper);

    // Snapshot if's own disposer count before activation
    const ifDisposersBefore = (el.__disposers || []).length;

    // Activate
    wrapper.__ctx.show = true;
    expect(gatedInitCalls).toHaveLength(1);
    expect(gatedDisposeCalls).toHaveLength(0);

    // Gate disposers are separate from if's own disposers
    expect(el.__gateDisposers.length).toBeGreaterThan(0);
    // if's disposers unchanged by activation
    expect(el.__disposers.length).toBe(ifDisposersBefore);

    // Deactivate
    wrapper.__ctx.show = false;

    // Gate disposer callback fired
    expect(gatedDisposeCalls).toHaveLength(1);
    // if's own disposers still intact (watcher is alive)
    expect(el.__disposers.length).toBe(ifDisposersBefore);
    // Gate disposers cleared
    expect(el.__gateDisposers).toEqual([]);
    // Gated dirs re-captured for next truthy flip
    expect(el.__gatedDirs).toHaveLength(1);
    expect(el.__gatedDirs[0].name).toBe('test-gated');
    // el.__ifState updated
    expect(el.__ifState).toBe(false);
  });

  test('4 — if watcher survives multiple gate activate/deactivate cycles', () => {
    const { wrapper, el } = buildFixture({ show: false });

    processTree(wrapper);

    // Cycle 1
    wrapper.__ctx.show = true;
    expect(gatedInitCalls).toHaveLength(1);
    expect(el.__ifState).toBe(true);

    wrapper.__ctx.show = false;
    expect(gatedDisposeCalls).toHaveLength(1);
    expect(el.__ifState).toBe(false);

    // Cycle 2
    wrapper.__ctx.show = true;
    expect(gatedInitCalls).toHaveLength(2);
    expect(el.__ifState).toBe(true);

    wrapper.__ctx.show = false;
    expect(gatedDisposeCalls).toHaveLength(2);
    expect(el.__ifState).toBe(false);

    // Cycle 3 — if's watcher still alive after two full cycles
    wrapper.__ctx.show = true;
    expect(gatedInitCalls).toHaveLength(3);
    expect(el.__ifState).toBe(true);

    // Each cycle produced exactly one init and one dispose
    // (no double-init, no leaked disposers)
    wrapper.__ctx.show = false;
    expect(gatedDisposeCalls).toHaveLength(3);
  });

  test('5 — order independence: priority-1 gated directive is gated by if at priority 10', () => {
    // test-gated has priority 1, if has priority 10.
    // Without the gate, test-gated would init BEFORE if even evaluates.
    // The gate check in processElement evaluates the if attribute directly
    // before the priority-sorted loop, making priority irrelevant.
    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ active: false }');
    const el = document.createElement('div');
    el.setAttribute('if', 'active');
    el.setAttribute('test-gated', 'priority-test');
    el.textContent = 'content';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);

    // Even though test-gated runs at priority 1 (before if at 10),
    // it must be deferred because the if expression is falsy
    expect(gatedInitCalls).toHaveLength(0);
    expect(el.__gatedDirs).toHaveLength(1);

    // Activating if also activates the gated directive
    wrapper.__ctx.active = true;
    expect(gatedInitCalls).toHaveLength(1);
    expect(gatedInitCalls[0].value).toBe('priority-test');
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  test('6 — non-gated directives on the same element run normally', () => {
    const normalInitCalls = [];
    registerDirective('test-normal', {
      priority: 1,
      init(el, name, value) {
        normalInitCalls.push({ el, name, value });
      },
    });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('state', '{ show: false }');
    const el = document.createElement('span');
    el.setAttribute('if', 'show');
    el.setAttribute('test-gated', 'gated-val');
    el.setAttribute('test-normal', 'normal-val');
    el.textContent = 'content';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);

    // Non-gated directive ran immediately
    expect(normalInitCalls).toHaveLength(1);
    expect(normalInitCalls[0].value).toBe('normal-val');
    // Gated directive was deferred
    expect(gatedInitCalls).toHaveLength(0);
  });

  test('7 — gated directive without if attribute runs normally', () => {
    const wrapper = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('test-gated', 'no-if');
    el.textContent = 'content';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    processTree(wrapper);

    // No if attribute — gate does not apply, directive runs immediately
    expect(gatedInitCalls).toHaveLength(1);
    expect(gatedInitCalls[0].value).toBe('no-if');
  });

  test('8 — full disposal cleans up both __disposers and __gateDisposers', () => {
    const { wrapper, el } = buildFixture({ show: false });

    processTree(wrapper);

    // Activate gated directive
    wrapper.__ctx.show = true;
    expect(el.__gateDisposers.length).toBeGreaterThan(0);
    expect(el.__disposers.length).toBeGreaterThan(0);

    // Full teardown via _disposeTree
    _disposeTree(el);

    // Both buckets cleaned up
    expect(el.__disposers).toBeNull();
    expect(el.__gateDisposers).toBeNull();
    // Gate disposer callback fired
    expect(gatedDisposeCalls).toHaveLength(1);
  });
});
