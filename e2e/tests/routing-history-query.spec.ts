import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

const FIXTURE = path.resolve(__dirname, '../examples/routing-history-query.html');

test.describe('Routing — history mode keeps ?query and #hash', () => {
  test.beforeEach(async ({ page }) => {
    // SPA fallback: every /history-query/* URL serves the fixture (history mode, base "/history-query")
    await page.route(/\/history-query(\/|\?|$)/, (route) =>
      route.fulfill({ path: FIXTURE, contentType: 'text/html' }),
    );
  });

  test('1 — Initial load of /search?x=1#frag keeps the URL and fills $route.query', async ({ page }) => {
    await page.goto('/history-query/search?x=1#frag');

    await expect(page.getByTestId('page-search')).toBeVisible();
    await expect(page.getByTestId('query-x')).toHaveText('1');
    await expect(page.getByTestId('route-hash')).toHaveText('#frag');
    await expect(page).toHaveURL(/\/history-query\/search\?x=1#frag$/);
  });

  test('2 — Navigate away then Back restores the query and hash', async ({ page }) => {
    await page.goto('/history-query/');
    await expect(page.getByTestId('page-home')).toBeVisible();

    await page.getByTestId('nav-search').click();
    await expect(page.getByTestId('query-x')).toHaveText('1');

    await page.getByTestId('nav-other').click();
    await expect(page.getByTestId('page-other')).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('page-search')).toBeVisible();
    await expect(page.getByTestId('query-x')).toHaveText('1');
    await expect(page.getByTestId('route-hash')).toHaveText('#frag');
    await expect(page).toHaveURL(/\/history-query\/search\?x=1#frag$/);
  });

  test('3 — No critical or serious accessibility violations (axe)', async ({ page }) => {
    await page.goto('/history-query/search?x=1#frag');
    await expect(page.getByTestId('page-search')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(serious).toEqual([]);
  });
});
