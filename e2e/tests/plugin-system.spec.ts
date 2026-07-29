import { test, expect } from '@playwright/test';

test.describe('Plugin System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/plugin-system.html');
  });

  test('1 — Plugin lifecycle: install registers global + filter, init hook runs', async ({ page }) => {
    // Global $demo.message rendered via bind
    await expect(page.getByTestId('global-value')).toHaveText('Plugin loaded!');
    // Custom filter "shout" applied
    await expect(page.getByTestId('filtered')).toHaveText('HELLO!!!');
    // Init hook sets data-init attribute after init completes
    await expect(page.locator('#test-plugin')).toHaveAttribute('data-init', 'true');
  });

  test('2 — Global reactivity: $demo.count updates on click', async ({ page }) => {
    await expect(page.getByTestId('counter')).toHaveText('0');
    await page.getByTestId('inc-btn').click();
    await expect(page.getByTestId('counter')).toHaveText('1');
    await page.getByTestId('inc-btn').click();
    await expect(page.getByTestId('counter')).toHaveText('2');
  });

  test('3 — Interceptor RESPOND: cached data rendered without network', async ({ page }) => {
    // RESPOND interceptor short-circuits /api/cached with { value: 'from-cache' }
    await expect(page.getByTestId('cached-data')).toHaveText('from-cache');
  });

  test('4 — Interceptor CANCEL: request blocked, status unchanged', async ({ page }) => {
    // Verify initial state
    await expect(page.getByTestId('cancel-status')).toHaveText('idle');
    // Click to trigger the POST — interceptor will CANCEL it (AbortError)
    await page.getByTestId('cancel-trigger').click();
    // Status should remain 'idle' because the CANCEL interceptor aborts the request
    await expect(page.getByTestId('cancel-status')).toHaveText('idle');
    // Error template should NOT be visible (AbortError is silently swallowed)
    await expect(page.getByTestId('cancel-error')).not.toBeVisible();
  });
});
