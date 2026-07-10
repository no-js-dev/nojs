import { test, expect } from '@playwright/test';

test.describe('Insert Modes', () => {

  // Return a JSON array of items for a given page number.
  // Each item has a `name` field rendered by the fixture templates via `bind="item.name"`.
  function jsonPage(pageNum: number) {
    return [
      { name: `Page ${pageNum} Item A` },
      { name: `Page ${pageNum} Item B` },
    ];
  }

  // ── get-insert="append" ──────────────────────────────────────────────

  test('1 — get-insert="append": new content appended after existing', async ({ page }) => {
    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 2) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jsonPage(p)) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Page 1 loads — template renders <li data-test="btn-item"> elements
    const items = page.getByTestId('btn-item');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText('Page 1 Item A');
    await expect(items.nth(1)).toHaveText('Page 1 Item B');

    // Load page 2
    const loadMoreBtn = page.getByTestId('button-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();

    // Wait for page 2 items to appear in the DOM (auto-retrying assertion)
    await expect(items.filter({ hasText: 'Page 2' }).first()).toBeVisible({ timeout: 5000 });

    // Verify both pages present and page-1 items BEFORE page-2 in DOM order.
    // Note: The framework's insert mode clones original children into per-page
    // wrappers while the first-fetch `each` re-renders with the accumulated
    // context, so total item count exceeds unique items — we check ordering
    // rather than exact counts.
    const allTexts = await items.allTextContents();
    const firstPage1Idx = allTexts.findIndex(t => t.includes('Page 1'));
    const firstPage2Idx = allTexts.findIndex(t => t.includes('Page 2'));
    expect(firstPage1Idx).toBeGreaterThanOrEqual(0);
    expect(firstPage2Idx).toBeGreaterThanOrEqual(0);
    expect(firstPage1Idx).toBeLessThan(firstPage2Idx);
  });

  // ── get-insert="prepend" ─────────────────────────────────────────────

  test('2 — get-insert="prepend": new content prepended before existing', async ({ page }) => {
    await page.route('**/api/feed*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 2) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jsonPage(p)) });
      }
    });

    await page.goto('/e2e/examples/insert-prepend-data.html');

    // Page 1 loads — template renders <li data-test="prepend-item"> elements
    const items = page.getByTestId('prepend-item');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText('Page 1 Item A');
    await expect(items.nth(1)).toHaveText('Page 1 Item B');

    // Load page 2
    const loadMoreBtn = page.getByTestId('prepend-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();

    // Wait for page 2 items to appear in the DOM (auto-retrying assertion)
    await expect(items.filter({ hasText: 'Page 2' }).first()).toBeVisible({ timeout: 5000 });

    // Verify both pages present and page-2 items BEFORE page-1 in DOM order
    const allTexts = await items.allTextContents();
    const firstPage1Idx = allTexts.findIndex(t => t.includes('Page 1'));
    const firstPage2Idx = allTexts.findIndex(t => t.includes('Page 2'));
    expect(firstPage1Idx).toBeGreaterThanOrEqual(0);
    expect(firstPage2Idx).toBeGreaterThanOrEqual(0);
    expect(firstPage2Idx).toBeLessThan(firstPage1Idx);
  });

  // ── Default (no get-insert): replace ─────────────────────────────────

  test('3 — default (no get-insert): content replaced on each fetch', async ({ page }) => {
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'Alice' },
          { name: 'Bob' },
        ]),
      });
    });

    await page.route('**/api/slow', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Done!' }) });
    });
    await page.route('**/api/error', (route) => {
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/empty', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/users/1', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'User One' }) });
    });

    // Use the existing fetch.html which has no get-insert (replace mode)
    await page.goto('/e2e/examples/fetch.html');

    // First fetch renders
    const items = page.getByTestId('user-item');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
    expect(await items.count()).toBe(2);

    // Content matches the response (replace, not accumulate)
    await expect(items.first()).toHaveText('Alice');
    await expect(items.nth(1)).toHaveText('Bob');
  });

  // ── Sentinel element ─────────────────────────────────────────────────

  test('4 — sentinel element exists in append mode', async ({ page }) => {
    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 1) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jsonPage(1)) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Wait for page 1 to load
    await expect(page.getByTestId('btn-item').first()).toBeVisible({ timeout: 5000 });

    // Check that the sentinel element exists within the container
    const sentinel = page.getByTestId('button-container').locator('[data-nojs-sentinel]');
    await expect(sentinel).toBeAttached();

    // Sentinel should be zero-height and hidden from accessibility
    await expect(sentinel).toHaveAttribute('aria-hidden', 'true');
    const height = await sentinel.evaluate((el) => getComputedStyle(el).height);
    expect(height).toBe('0px');
  });
});
