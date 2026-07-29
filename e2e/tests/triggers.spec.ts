import { test, expect } from '@playwright/test';

test.describe('Triggers', () => {

  // ── get-trigger="visible" ────────────────────────────────────────────

  test('1 — get-trigger="visible": content loads when scrolled into view', async ({ page }) => {
    await page.route('**/api/content', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Lazy loaded content' }),
      });
    });

    await page.goto('/e2e/examples/trigger-visible.html');

    // Scroll the element into view
    await page.getByTestId('lazy-container').scrollIntoViewIfNeeded();

    // Content should load after scrolling into view
    await expect(page.getByTestId('lazy-content')).toHaveText('Lazy loaded content', { timeout: 5000 });
  });

  test('2 — get-trigger="visible": content does NOT load before scrolling', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/content', (route) => {
      requestCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Lazy loaded content' }),
      });
    });

    await page.goto('/e2e/examples/trigger-visible.html');

    // Wait for page to fully settle — no network requests should fire while off-screen
    await page.waitForLoadState('networkidle');

    // The lazy container should NOT have loaded yet (it's below a 2000px spacer)
    expect(requestCount).toBe(0);
    await expect(page.getByTestId('lazy-content')).not.toBeVisible();
  });

  // ── get-trigger="hover" ──────────────────────────────────────────────

  test('3 — get-trigger="hover": content loads on mouseenter', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/preview', (route) => {
      requestCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'Preview Title' }),
      });
    });

    await page.goto('/e2e/examples/trigger-hover.html');

    // No fetch should happen before hover — wait for page to fully settle
    await page.waitForLoadState('networkidle');
    expect(requestCount).toBe(0);

    // Hover over the container
    await page.getByTestId('hover-container').hover();

    // Content should appear after hover
    await expect(page.getByTestId('hover-content')).toHaveText('Preview Title', { timeout: 5000 });
    expect(requestCount).toBe(1);
  });

  // ── get-trigger="none" ───────────────────────────────────────────────

  test('4 — get-trigger="none": content does NOT load automatically', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/data', (route) => {
      requestCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Fetched data' }),
      });
    });

    await page.goto('/e2e/examples/trigger-none.html');

    // Wait for page to fully settle — no automatic fetch should fire
    await page.waitForLoadState('networkidle');
    expect(requestCount).toBe(0);
    await expect(page.getByTestId('manual-content')).not.toBeVisible();
  });

  test('5 — get-trigger="none": content loads on programmatic refresh()', async ({ page }) => {
    await page.route('**/api/data', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Fetched data' }),
      });
    });

    await page.goto('/e2e/examples/trigger-none.html');

    // Wait for page to fully settle — no automatic fetch should fire
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('manual-content')).not.toBeVisible();

    // Click the fetch button to trigger programmatic refresh
    await page.getByTestId('fetch-btn').click();

    // Content should now appear
    await expect(page.getByTestId('manual-content')).toHaveText('Fetched data', { timeout: 5000 });
  });
});
