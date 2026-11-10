import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

const INLINE = path.resolve(__dirname, '../examples/routing-spa-fallback-inline.html');
const FILE = path.resolve(__dirname, '../examples/routing-spa-fallback-file.html');

const PAGES: Record<string, string> = {
  '/spa-file/pages/index.tpl': '<p data-test="page-index">Index from file</p>',
  '/spa-file/pages/about.tpl': '<p data-test="page-about">About from file</p>',
  '/spa-file/pages/p/hello.tpl': '<p data-test="page-hello">Hello from file</p>',
};

// SPA fallback server: known .tpl files are served, every other URL under the
// base answers 200 with the app's index.html (like try_files ... /index.html).
async function spaServer(page: Page, base: string, fixture: string) {
  const tplRequests: string[] = [];
  await page.route(new RegExp('^[^?#]*' + base + '(/|$)'), (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.endsWith('.tpl')) tplRequests.push(pathname);
    if (PAGES[pathname]) return route.fulfill({ body: PAGES[pathname], contentType: 'text/html' });
    return route.fulfill({ path: fixture, contentType: 'text/html' });
  });
  return tplRequests;
}

test.describe('Routing — inline routes behind an SPA fallback', () => {
  test('1 — Boot makes no template requests for inline routes', async ({ page }) => {
    const tpl = await spaServer(page, '/spa-inline', INLINE);
    await page.goto('/spa-inline/');
    await expect(page.getByTestId('page-home')).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Only the link with no inline route (/nope) may resolve to a file;
    // /about and /p/hello are covered by <template route> definitions.
    expect(tpl).toEqual(['/spa-inline/pages/nope.tpl']);
  });

  test('2 — Unmatched link renders route="*", not index.html', async ({ page }) => {
    await spaServer(page, '/spa-inline', INLINE);
    await page.goto('/spa-inline/');
    await page.getByTestId('nav-nope').click();
    await expect(page.getByTestId('page-404')).toBeVisible();
    await expect(page.getByTestId('404-path')).toHaveText('/nope');
    await expect(page.getByTestId('shell')).toHaveCount(1);
  });

  test('3 — Direct load of an unmatched URL renders route="*"', async ({ page }) => {
    await spaServer(page, '/spa-inline', INLINE);
    await page.goto('/spa-inline/nope');
    await expect(page.getByTestId('page-404')).toBeVisible();
    await expect(page.getByTestId('shell')).toHaveCount(1);
  });

  test('4 — Inline routes, including params, still render', async ({ page }) => {
    await spaServer(page, '/spa-inline', INLINE);
    await page.goto('/spa-inline/');
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toBeVisible();
    await page.getByTestId('nav-post').click();
    await expect(page.getByTestId('post-slug')).toHaveText('hello');
  });

  test('5 — No critical accessibility violations', async ({ page }) => {
    await spaServer(page, '/spa-inline', INLINE);
    await page.goto('/spa-inline/');
    await expect(page.getByTestId('page-home')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });
});

test.describe('Routing — file-based routes behind an SPA fallback', () => {
  test('6 — Boot fetches the current page and prefetches links as before', async ({ page }) => {
    const tpl = await spaServer(page, '/spa-file', FILE);
    await page.goto('/spa-file/');
    await expect(page.getByTestId('page-index')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect([...tpl].sort()).toEqual([
      '/spa-file/pages/about.tpl',
      '/spa-file/pages/index.tpl',
      '/spa-file/pages/missing.tpl',
    ]);
  });

  test('7 — Real page renders; missing page falls back to route="*"', async ({ page }) => {
    await spaServer(page, '/spa-file', FILE);
    await page.goto('/spa-file/');
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toBeVisible();
    await page.getByTestId('nav-missing').click();
    await expect(page.getByTestId('page-404')).toBeVisible();
    await expect(page.getByTestId('shell')).toHaveCount(1);
  });

  test('8 — Fallback for a layout probe is not used as a layout', async ({ page }) => {
    const tpl = await spaServer(page, '/spa-file', FILE);
    await page.goto('/spa-file/');
    await page.getByTestId('nav-post').click();
    await expect(page.getByTestId('page-hello')).toBeVisible();
    await expect(page.getByTestId('shell')).toHaveCount(1);
    expect(tpl).toContain('/spa-file/pages/p.tpl');
  });

  test('9 — Direct load of a missing page renders route="*"', async ({ page }) => {
    await spaServer(page, '/spa-file', FILE);
    await page.goto('/spa-file/nope');
    await expect(page.getByTestId('page-404')).toBeVisible();
    await expect(page.getByTestId('shell')).toHaveCount(1);
  });
});
