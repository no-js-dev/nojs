import { test, expect, type Page } from '@playwright/test';

// Named outlets and the config router.templates file lookup (default "pages").
// Default: every outlet, named ones included, looks the route up in pages/,
// so a named outlet the active route does not fill renders the wildcard or
// the built-in 404 (v1.21.1 behavior). router.strictOutlets: only the default
// outlet uses router.templates; named outlets without src are filled by
// explicit outlet="name" routes, and on a page no explicit route matches they
// keep the documented wildcard / built-in 404 fallback.

function trackPagesRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (req) => {
    const { pathname } = new URL(req.url());
    if (pathname.includes('/pages/')) urls.push(pathname);
  });
  return urls;
}

test.describe('Named outlets — routing.md example', () => {
  test('1 — default: on /about the sidebar and topbar show the wildcard', async ({ page }) => {
    const urls = trackPagesRequests(page);
    await page.goto('/e2e/examples/named-outlet-templates.html#/about');
    await expect(page.getByTestId('about')).toBeVisible();
    await expect(page.getByTestId('sidebar-outlet').getByTestId('not-found')).toBeVisible();
    await expect(page.getByTestId('topbar-outlet').getByTestId('not-found')).toBeVisible();
    expect(urls).toContain('/e2e/examples/pages/about.tpl');
  });

  test('2 — strictOutlets: on /about the sidebar and topbar are cleared', async ({ page }) => {
    const urls = trackPagesRequests(page);
    await page.goto('/e2e/examples/named-outlet-templates.html?strictOutlets=1#/home');
    await expect(page.getByTestId('home-sidebar')).toBeVisible();
    await expect(page.getByTestId('home-topbar')).toBeVisible();

    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('about')).toBeVisible();
    await expect(page.getByTestId('sidebar-outlet')).toBeEmpty();
    await expect(page.getByTestId('topbar-outlet')).toBeEmpty();
    expect(urls).toEqual([]);
  });
});

test.describe('Named outlets — nested-routing.html docs outlet', () => {
  test('3 — default: the docs outlet looks Home up in pages/ and shows the built-in 404', async ({ page }) => {
    const urls = trackPagesRequests(page);
    await page.goto('/e2e/examples/nested-routing.html');
    await expect(page.getByTestId('page-home')).toBeVisible();
    await expect(page.getByTestId('docs-outlet')).toContainText('Page not found');
    expect(urls).toContain('/e2e/examples/pages/index.tpl');
  });

  test('4 — strictOutlets: no pages/ lookup for the docs outlet; matched docs routes still render', async ({ page }) => {
    const urls = trackPagesRequests(page);
    await page.goto('/e2e/examples/nested-routing.html?strictOutlets=1');
    await expect(page.getByTestId('page-home')).toBeVisible();
    // Home is resolved from a file by the default outlet; no explicit route
    // matches it, so the docs outlet keeps the documented fallback.
    await expect(page.getByTestId('docs-outlet')).toContainText('Page not found');

    await page.getByTestId('sidebar-loops').click();
    await expect(page.getByTestId('docs-outlet').getByTestId('doc-loops')).toBeVisible();
    await expect(page.getByTestId('docs-outlet')).not.toContainText('Page not found');
    expect(urls).toEqual([]);
  });
});
