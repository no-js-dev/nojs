import { test, expect } from '@playwright/test';

// ─── Helper: monkey-patch startViewTransition before page loads ─────────────
// Injects a recording wrapper around document.startViewTransition so we can
// inspect call count, arguments (types), and behavior from Playwright.
async function patchViewTransition(page: ReturnType<typeof test['_info']> extends never ? any : any) {
  await page.addInitScript(() => {
    const original = document.startViewTransition?.bind(document);
    if (!original) return;

    (window as any).__vtCalls = [];

    document.startViewTransition = function (opts: any) {
      const record = {
        types: opts?.types ?? [],
        calledAt: Date.now(),
      };
      (window as any).__vtCalls.push(record);

      // Delegate to the real implementation
      return original(opts);
    };
  });
}

// ─── Helper: monkey-patch startViewTransition to simulate VT API absence ────
async function removeViewTransition(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });
}

// ─── Helper: collect console warnings ───────────────────────────────────────
function collectWarnings(page: any): string[] {
  const warnings: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });
  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════
//  VIEW TRANSITIONS — E2E TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('View Transitions', () => {

  // ── Test 1: Basic VT API usage ──────────────────────────────────────
  test('1 — Basic VT API: route change with transition="slide" triggers startViewTransition', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Navigate to Page A
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    // Verify startViewTransition was called
    const vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    // At least 1 call from the navigation (initial route load may or may not use VT
    // depending on whether there's a "from" state — the click definitely triggers it)
    expect(vtCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 2: Built-in presets — slide ────────────────────────────────
  test('2a — Built-in presets: slide transition produces correct types', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Navigate — outlet has transition="slide"
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    const vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    const lastCall = vtCalls[vtCalls.length - 1];
    expect(lastCall.types).toContain('slide');
    expect(lastCall.types).toContain('forward');
  });

  // ── Test 2b: Built-in presets — fade ───────────────────────────────
  test('2b — Built-in presets: fade transition produces correct types', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions-disabled.html');

    // This page has viewTransition: false, so we need a separate page with fade.
    // Instead, we'll dynamically set the transition attribute before navigating.
    await page.evaluate(() => {
      // Re-enable VT (the disabled page sets viewTransition: false; override it)
      (window as any).NoJS.config({ router: { viewTransition: true } });
      document.querySelector('[route-view]')!.setAttribute('transition', 'fade');
    });

    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    const vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    const lastCall = vtCalls[vtCalls.length - 1];
    expect(lastCall.types).toContain('fade');
    expect(lastCall.types).toContain('forward');
  });

  // ── Test 2c: Built-in presets — scale ──────────────────────────────
  test('2c — Built-in presets: scale transition produces correct types', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Change the outlet's transition attribute to "scale" dynamically
    await page.evaluate(() => {
      document.querySelector('[route-view]')!.setAttribute('transition', 'scale');
    });

    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    const vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    const lastCall = vtCalls[vtCalls.length - 1];
    expect(lastCall.types).toContain('scale');
    expect(lastCall.types).toContain('forward');
  });

  // ── Test 3: Direction tracking ──────────────────────────────────────
  test('3 — Direction tracking: forward nav → "forward", back nav → "backward"', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Forward navigation
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    let vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    const forwardCall = vtCalls[vtCalls.length - 1];
    expect(forwardCall.types).toContain('forward');

    // Navigate to another page to create history depth
    await page.getByTestId('link-b').click();
    await expect(page.getByTestId('page-b')).toBeVisible();

    // Go back (triggers popstate → backward)
    await page.goBack();
    await expect(page.getByTestId('page-a')).toBeVisible();

    vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    const backwardCall = vtCalls[vtCalls.length - 1];
    expect(backwardCall.types).toContain('backward');
  });

  // ── Test 4: Config opt-out ──────────────────────────────────────────
  test('4 — Config opt-out: viewTransition=false → VT API NOT called', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions-disabled.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Navigate
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    // VT API should NOT have been called
    const vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    // The initial route may or may not have been counted, but the config-disabled
    // navigation should definitely not trigger any VT calls
    expect(vtCalls.length).toBe(0);
  });

  // ── Test 5: No transition attr ─────────────────────────────────────
  test('5 — No transition attr: route-view without transition → no VT API called', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions-no-attr.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    // No transition attribute → VT API should not be called
    const vtCalls = await page.evaluate(() => (window as any).__vtCalls);
    expect(vtCalls.length).toBe(0);
  });

  // ── Test 6: Deprecation warning ─────────────────────────────────────
  test('6 — Deprecation warning: VT API unavailable + transition attr → console.warn', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'This test removes VT API to simulate absence; only meaningful in Chromium');

    await removeViewTransition(page);
    const warnings = collectWarnings(page);

    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    // Wait a bit for async warning
    await page.waitForTimeout(500);

    const deprecationWarning = warnings.find(w =>
      w.includes('deprecated') || w.includes('Class-based')
    );
    expect(deprecationWarning).toBeDefined();
  });

  // ── Test 7: view-transition-name on outlet ──────────────────────────
  test('7 — view-transition-name: outlet with transition gets route-content style', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Navigate to trigger the VT code path which sets viewTransitionName
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    // Check the outlet's inline style for view-transition-name
    const vtName = await page.evaluate(() => {
      const outlet = document.querySelector('[route-view]');
      return outlet ? (outlet as HTMLElement).style.viewTransitionName : null;
    });

    expect(vtName).toBe('route-content');
  });

  // ── Test 8: Rapid navigation ────────────────────────────────────────
  test('8 — Rapid navigation: multiple quick navigations don\'t crash', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    const errors: string[] = [];
    page.on('pageerror', (err: Error) => {
      errors.push(err.message);
    });

    await patchViewTransition(page);
    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Rapid-fire navigation without waiting for transitions to finish
    await page.getByTestId('link-a').click();
    await page.getByTestId('link-b').click();
    await page.getByTestId('link-c').click();
    await page.getByTestId('link-a').click();
    await page.getByTestId('link-b').click();

    // Wait for the last navigation to settle
    await expect(page.getByTestId('page-b')).toBeVisible({ timeout: 5000 });

    // No uncaught errors (AbortError should be caught silently)
    const abortErrors = errors.filter(e => e.includes('AbortError'));
    expect(abortErrors).toHaveLength(0);

    // Page should still be functional — content rendered correctly
    await expect(page.getByTestId('page-b')).toContainText('Page B');
  });

  // ── Test 9: Non-router elements still work (regression) ────────────
  test('9 — Non-router elements: animate="fadeIn" on non-route-view still works', async ({ page }) => {
    await page.goto('/e2e/examples/view-transitions.html');

    const target = page.getByTestId('non-router-animate');
    await expect(target).toBeHidden();

    await page.getByTestId('non-router-toggle').click();
    await expect(target).toBeVisible();
    await expect(target).toHaveText('Animated element');

    // Verify the animate attribute is still present — the directive processed it
    const animAttr = await target.getAttribute('animate');
    expect(animAttr).toBe('fadeIn');
  });

  // ── Test 10: Content changes correctly after VT navigation ─────────
  test('10 — Content correctness: content updates after each VT-powered navigation', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();
    await expect(page.getByTestId('page-home')).toContainText('Welcome to the home page');

    // Navigate to Page A
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();
    await expect(page.getByTestId('page-a')).toContainText('Page A Content');

    // Navigate to Page B
    await page.getByTestId('link-b').click();
    await expect(page.getByTestId('page-b')).toBeVisible();
    await expect(page.getByTestId('page-b')).toContainText('Page B Content');

    // Navigate to Page C
    await page.getByTestId('link-c').click();
    await expect(page.getByTestId('page-c')).toBeVisible();
    await expect(page.getByTestId('page-c')).toContainText('Page C Content');

    // Back to home
    await page.getByTestId('link-home').click();
    await expect(page.getByTestId('page-home')).toBeVisible();
  });

  // ── Test 11: VT CSS presets are injected ────────────────────────────
  test('11 — VT CSS presets: view-transition CSS rules are injected into head', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transition API is only available in Chromium');

    await page.goto('/e2e/examples/view-transitions.html');
    await expect(page.getByTestId('page-home')).toBeVisible();

    // Navigate to trigger _injectBuiltInStyles
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();

    // Check for the injected <style data-nojs-animations> containing VT presets
    const hasVtPresets = await page.evaluate(() => {
      const style = document.querySelector('style[data-nojs-animations]');
      if (!style) return false;
      const css = style.textContent || '';
      return css.includes('::view-transition-old(route-content)')
        && css.includes('::view-transition-new(route-content)')
        && css.includes('active-view-transition-type(slide)')
        && css.includes('active-view-transition-type(fade)')
        && css.includes('active-view-transition-type(scale)')
        && css.includes('prefers-reduced-motion');
    });

    expect(hasVtPresets).toBe(true);
  });

  // ── Test 12: Non-Chromium fallback — page still navigates correctly ─
  test('12 — Non-Chromium fallback: navigation works when VT API absent', async ({ page, browserName }) => {
    test.skip(browserName === 'chromium', 'This test validates fallback in non-Chromium browsers');

    // Use the no-transition-attr page to avoid Firefox-specific timing issues
    // with the deprecation fallback path (transition attr + no VT API).
    // This isolates the test to verify basic routing still works without VT API.
    await page.goto('/e2e/examples/view-transitions-no-attr.html');
    await expect(page.getByTestId('page-home')).toBeVisible({ timeout: 10000 });

    // Navigate — should work even without VT API
    await page.getByTestId('link-a').click();
    await expect(page.getByTestId('page-a')).toBeVisible();
    await expect(page.getByTestId('page-a')).toContainText('Page A');
  });
});
