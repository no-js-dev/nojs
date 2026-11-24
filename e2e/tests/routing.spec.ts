import { test, expect } from '@playwright/test';

test.describe('Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/routing.html');
  });

  test('1 — Basic routes: home page renders on initial load', async ({ page }) => {
    const home = page.getByTestId('page-home');
    await expect(home).toBeVisible();
    await expect(home).toContainText('Welcome to the home page');
  });

  test('2 — Basic routes: click About navigates to about page', async ({ page }) => {
    await page.getByTestId('nav-about').click();

    const about = page.getByTestId('page-about');
    await expect(about).toBeVisible();
    await expect(about).toContainText('About Page');

    // Home page should no longer be visible
    await expect(page.getByTestId('page-home')).toBeHidden();
  });

  test('3 — Route params: user id is extracted from URL', async ({ page }) => {
    await page.getByTestId('nav-user').click();

    const userPage = page.getByTestId('page-user');
    await expect(userPage).toBeVisible();

    const userId = page.getByTestId('user-id');
    await expect(userId).toHaveText('42');
  });

  test('4 — Query string: query parameter is accessible', async ({ page }) => {
    await page.getByTestId('nav-search').click();

    const searchPage = page.getByTestId('page-search');
    await expect(searchPage).toBeVisible();

    const query = page.getByTestId('search-query');
    await expect(query).toHaveText('hello');
  });

  test('5 — Active class: active link gets class, others lose it', async ({ page }) => {
    // Initially home should be active
    await expect(page.getByTestId('nav-home')).toHaveClass(/active/);

    // Navigate to about
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toBeVisible();

    await expect(page.getByTestId('nav-about')).toHaveClass(/active/);
    await expect(page.getByTestId('nav-home')).not.toHaveClass(/active/);
  });

  test('6 — Route guard: protected route redirects to login', async ({ page }) => {
    await page.getByTestId('nav-protected').click();

    const loginPage = page.getByTestId('page-login');
    await expect(loginPage).toBeVisible();

    // Protected content should not be visible
    await expect(page.getByTestId('page-protected')).toBeHidden();
  });

  test('7 — Anchor link: scrolls without changing route', async ({ page }) => {
    // Start at home
    await expect(page.getByTestId('page-home')).toBeVisible();

    await page.getByTestId('anchor-link').click();

    // Anchor target should be visible
    const anchor = page.getByTestId('anchor-target');
    await expect(anchor).toBeVisible();

    // Route should still be home (hash didn't change to a route path)
    await expect(page.getByTestId('page-home')).toBeVisible();
  });

  test('8 — Programmatic navigation: button navigates to about', async ({ page }) => {
    await expect(page.getByTestId('page-home')).toBeVisible();

    await page.getByTestId('prog-nav').click();

    const about = page.getByTestId('page-about');
    await expect(about).toBeVisible();
    await expect(page.getByTestId('page-home')).toBeHidden();
  });

  test('9 — Route guard: Back after the redirect returns to the page the user left', async ({ page }) => {
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toBeVisible();

    await page.getByTestId('nav-protected').click();
    await expect(page.getByTestId('page-login')).toBeVisible();
    await expect(page).toHaveURL(/#\/login$/);

    await page.goBack();
    await expect(page).toHaveURL(/#\/about$/);
    await expect(page.getByTestId('page-about')).toBeVisible();
    await expect(page.getByTestId('page-login')).toBeHidden();
  });
});
