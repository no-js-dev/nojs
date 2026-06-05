import { test, expect } from '@playwright/test';

test.describe('Insert Modes', () => {

  // Return HTML fragments directly inserted by the framework
  function htmlPage(pageNum: number) {
    return `<div data-test="item" data-page="${pageNum}">Page ${pageNum} Item A</div>` +
           `<div data-test="item" data-page="${pageNum}">Page ${pageNum} Item B</div>`;
  }

  // ── get-insert="append" ──────────────────────────────────────────────

  test('1 — get-insert="append": new content appended after existing', async ({ page }) => {
    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 2) {
        route.fulfill({ status: 200, contentType: 'text/html', body: '' });
      } else {
        route.fulfill({ status: 200, contentType: 'text/html', body: htmlPage(p) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Page 1 loads
    await expect(page.getByTestId('item').first()).toBeVisible({ timeout: 5000 });
    const firstPageTexts = await page.getByTestId('item').allTextContents();
    expect(firstPageTexts).toEqual(['Page 1 Item A', 'Page 1 Item B']);

    // Load page 2
    const loadMoreBtn = page.getByTestId('button-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();
    await expect(page.getByTestId('item')).toHaveCount(4, { timeout: 5000 });

    // Verify order: page 1 items first (original position), then page 2 items (appended)
    const allItems = await page.getByTestId('item').allTextContents();
    expect(allItems[0]).toBe('Page 1 Item A');
    expect(allItems[1]).toBe('Page 1 Item B');
    expect(allItems[2]).toBe('Page 2 Item A');
    expect(allItems[3]).toBe('Page 2 Item B');
  });

  // ── get-insert="prepend" ─────────────────────────────────────────────

  test('2 — get-insert="prepend": new content prepended before existing', async ({ page }) => {
    await page.route('**/api/feed*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 2) {
        route.fulfill({ status: 200, contentType: 'text/html', body: '' });
      } else {
        route.fulfill({ status: 200, contentType: 'text/html', body: htmlPage(p) });
      }
    });

    await page.goto('/e2e/examples/insert-prepend.html');

    // Page 1 loads
    await expect(page.getByTestId('item').first()).toBeVisible({ timeout: 5000 });
    const firstPageTexts = await page.getByTestId('item').allTextContents();
    expect(firstPageTexts).toEqual(['Page 1 Item A', 'Page 1 Item B']);

    // Load page 2
    const loadMoreBtn = page.getByTestId('prepend-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();
    await expect(page.getByTestId('item')).toHaveCount(4, { timeout: 5000 });

    // Verify order: page 2 items first (prepended), then page 1 items
    const allItems = await page.getByTestId('item').allTextContents();
    expect(allItems[0]).toBe('Page 2 Item A');
    expect(allItems[1]).toBe('Page 2 Item B');
    expect(allItems[2]).toBe('Page 1 Item A');
    expect(allItems[3]).toBe('Page 1 Item B');
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
        route.fulfill({ status: 200, contentType: 'text/html', body: '' });
      } else {
        route.fulfill({ status: 200, contentType: 'text/html', body: htmlPage(1) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Wait for page 1 to load
    await expect(page.getByTestId('item').first()).toBeVisible({ timeout: 5000 });

    // Check that the sentinel element exists within the container
    const sentinel = page.getByTestId('button-container').locator('[data-nojs-sentinel]');
    await expect(sentinel).toBeAttached();

    // Sentinel should be zero-height and hidden from accessibility
    await expect(sentinel).toHaveAttribute('aria-hidden', 'true');
    const height = await sentinel.evaluate((el) => getComputedStyle(el).height);
    expect(height).toBe('0px');
  });
});
