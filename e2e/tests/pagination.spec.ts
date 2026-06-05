import { test, expect } from '@playwright/test';

test.describe('Pagination', () => {

  // ── Helpers ──────────────────────────────────────────────────────────
  function itemsPage(pageNum: number) {
    return JSON.stringify([
      { name: `Page ${pageNum} Item A` },
      { name: `Page ${pageNum} Item B` },
    ]);
  }

  function jsonCursorResponse(items: { name: string }[], cursor: string | null) {
    return JSON.stringify({ data: items, cursor });
  }

  // Note: The framework's insert mode clones original children into per-page
  // wrappers. When using `each`, the first-fetch `each` re-renders with
  // accumulated context, so visible item counts differ from unique-page counts.
  // Tests use the load-more button locator as a synchronization point since
  // button presence/absence is the reliable pagination state indicator.

  // ── Load more button ─────────────────────────────────────────────────

  test('1 — load more button appears and appends on click', async ({ page }) => {
    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 3) {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: itemsPage(p) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');
    const container = page.getByTestId('button-container');

    // Page 1 loads automatically
    await expect(page.getByTestId('btn-item').first()).toBeVisible({ timeout: 5000 });
    expect(await page.getByTestId('btn-item').count()).toBe(2);

    // Load More button should be visible after first page
    const loadMoreBtn = container.locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });

    // Click to load page 2 — items increase
    await loadMoreBtn.click();
    // Wait for button to reappear (fetch completed)
    await expect(container.locator('[data-nojs-load-more]')).toBeVisible({ timeout: 5000 });
    // Items should have increased beyond the initial 2
    const countAfterPage2 = await page.getByTestId('btn-item').count();
    expect(countAfterPage2).toBeGreaterThan(2);
  });

  // ── Infinite scroll ──────────────────────────────────────────────────

  test('2 — infinite scroll appends pages on scroll', async ({ page }) => {
    await page.route('**/api/items*', async (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      // Small delay to prevent observer rapid-fire
      await new Promise(r => setTimeout(r, 100));
      if (p > 3) {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: itemsPage(p) });
      }
    });

    await page.goto('/e2e/examples/pagination-scroll.html');
    const container = page.getByTestId('scroll-container');

    // Page 1 loads automatically
    await expect(page.getByTestId('scroll-item').first()).toBeVisible({ timeout: 5000 });
    const initialCount = await page.getByTestId('scroll-item').count();
    expect(initialCount).toBe(2);

    // Scroll to bottom — more items should appear
    await container.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    // Wait for items to increase beyond the initial count
    await expect(async () => {
      const count = await page.getByTestId('scroll-item').count();
      expect(count).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 5000 });
  });

  // ── End-of-data: empty response ──────────────────────────────────────

  test('3 — end-of-data: empty response hides button and shows empty template', async ({ page }) => {
    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      if (p > 1) {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: itemsPage(1) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Page 1 loads
    await expect(page.getByTestId('btn-item').first()).toBeVisible({ timeout: 5000 });
    const page1Count = await page.getByTestId('btn-item').count();

    // Click load more for page 2 (empty response)
    const loadMoreBtn = page.getByTestId('button-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();

    // Empty template should appear
    await expect(page.getByTestId('empty')).toBeVisible({ timeout: 5000 });

    // Load more button should be gone
    await expect(page.getByTestId('button-container').locator('[data-nojs-load-more]')).toBeHidden({ timeout: 5000 });

    // Existing items should still be present (not removed)
    const afterCount = await page.getByTestId('btn-item').count();
    expect(afterCount).toBeGreaterThanOrEqual(page1Count);
  });

  // ── End-of-data: X-NoJS-Last-Page header ─────────────────────────────

  test('4 — end-of-data via X-NoJS-Last-Page header', async ({ page }) => {
    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: p >= 2 ? { 'X-NoJS-Last-Page': 'true' } : {},
        body: itemsPage(p),
      });
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Page 1 loads
    await expect(page.getByTestId('btn-item').first()).toBeVisible({ timeout: 5000 });

    // Click load more for page 2 (last page via header)
    const loadMoreBtn = page.getByTestId('button-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();

    // Load more button should be gone after last-page header
    await expect(page.getByTestId('button-container').locator('[data-nojs-load-more]')).toBeHidden({ timeout: 5000 });

    // Items should have increased
    const totalCount = await page.getByTestId('btn-item').count();
    expect(totalCount).toBeGreaterThan(2);
  });

  // ── Cursor pagination: cursor from body ──────────────────────────────

  test('5 — cursor pagination: cursor extracted from response body, URL updated', async ({ page }) => {
    const cursors: string[] = [];

    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const cursor = url.searchParams.get('cursor') || '';
      cursors.push(cursor);

      if (cursor === 'page3-cursor') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: jsonCursorResponse([{ name: 'Item C1' }], null),
        });
      } else if (cursor === 'page2-cursor') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: jsonCursorResponse([{ name: 'Item B1' }], 'page3-cursor'),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: jsonCursorResponse([{ name: 'Item A1' }], 'page2-cursor'),
        });
      }
    });

    await page.goto('/e2e/examples/pagination-cursor.html');

    // Wait for first fetch to complete (button appears)
    const loadMoreBtn = page.getByTestId('cursor-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });

    // Click to fetch page 2
    await loadMoreBtn.click();
    // Wait for button to reappear (page 2 loaded)
    await expect(page.getByTestId('cursor-container').locator('[data-nojs-load-more]')).toBeVisible({ timeout: 5000 });
    expect(cursors).toContain('page2-cursor');

    // Click to fetch page 3 (last page, null cursor)
    await page.getByTestId('cursor-container').locator('[data-nojs-load-more]').click();
    // Button should disappear (cursor exhausted = end of data)
    await expect(page.getByTestId('cursor-container').locator('[data-nojs-load-more]')).toBeHidden({ timeout: 5000 });

    // All cursors should have been used in order
    expect(cursors).toEqual(['', 'page2-cursor', 'page3-cursor']);
  });

  // ── Cursor pagination: cursor from header ────────────────────────────

  test('6 — cursor pagination: cursor extracted from X-NoJS-Cursor header', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/items*', (route) => {
      requestCount++;
      if (requestCount >= 3) {
        // No cursor header means end of data
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [{ name: 'Item Final' }] }),
        });
      } else if (requestCount === 2) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'X-NoJS-Cursor': 'header-cursor-3' },
          body: JSON.stringify({ data: [{ name: 'Item Two' }] }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'X-NoJS-Cursor': 'header-cursor-2' },
          body: JSON.stringify({ data: [{ name: 'Item One' }] }),
        });
      }
    });

    await page.goto('/e2e/examples/pagination-cursor.html');

    // First page — wait for button
    const loadMoreBtn = page.getByTestId('cursor-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });

    // Click to fetch page 2
    await loadMoreBtn.click();
    await expect(page.getByTestId('cursor-container').locator('[data-nojs-load-more]')).toBeVisible({ timeout: 5000 });

    // Click to fetch page 3 (no cursor header = end)
    await page.getByTestId('cursor-container').locator('[data-nojs-load-more]').click();
    await expect(page.getByTestId('cursor-container').locator('[data-nojs-load-more]')).toBeHidden({ timeout: 5000 });

    // All 3 requests were made
    expect(requestCount).toBe(3);
  });

  // ── Error during pagination ──────────────────────────────────────────

  test('7 — error during pagination shows error template without removing existing content', async ({ page }) => {
    await page.route('**/api/items*', async (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      await new Promise(r => setTimeout(r, 50));
      if (p >= 2) {
        route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Server error"}' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: itemsPage(1) });
      }
    });

    await page.goto('/e2e/examples/pagination-scroll.html');

    // Page 1 loads
    await expect(page.getByTestId('scroll-item').first()).toBeVisible({ timeout: 5000 });
    const page1Count = await page.getByTestId('scroll-item').count();
    expect(page1Count).toBe(2);

    // Scroll to trigger page 2 (which errors)
    const container = page.getByTestId('scroll-container');
    await container.evaluate((el) => { el.scrollTop = el.scrollHeight; });

    // Error template should appear
    await expect(page.getByTestId('error')).toBeVisible({ timeout: 5000 });

    // Existing items from page 1 should still be present
    const afterErrorCount = await page.getByTestId('scroll-item').count();
    expect(afterErrorCount).toBeGreaterThanOrEqual(page1Count);
  });

  // ── Page auto-increment ──────────────────────────────────────────────

  test('8 — page auto-increments on each fetch', async ({ page }) => {
    const requestedPages: number[] = [];

    await page.route('**/api/items*', (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const p = parseInt(url.searchParams.get('page') || '1');
      requestedPages.push(p);
      if (p > 3) {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: itemsPage(p) });
      }
    });

    await page.goto('/e2e/examples/pagination-button.html');

    // Page 1 auto-loads
    await expect(page.getByTestId('btn-item').first()).toBeVisible({ timeout: 5000 });

    // Load page 2
    const loadMoreBtn = page.getByTestId('button-container').locator('[data-nojs-load-more]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
    await loadMoreBtn.click();
    // Wait for button to reappear
    await expect(page.getByTestId('button-container').locator('[data-nojs-load-more]')).toBeVisible({ timeout: 5000 });

    // Load page 3
    await page.getByTestId('button-container').locator('[data-nojs-load-more]').click();
    // Wait for button to reappear
    await expect(page.getByTestId('button-container').locator('[data-nojs-load-more]')).toBeVisible({ timeout: 5000 });

    // Verify pages were requested in order: 1, 2, 3
    expect(requestedPages).toEqual([1, 2, 3]);
  });
});
