import { test, expect } from '@playwright/test';

// F2 - CSRF token must NOT leak to cross-origin requests reached via // , \\ or
// HTTP:// URLs, while still attaching to same-origin non-GET requests and never
// to GET requests.

test.describe('Security F2 - CSRF token cross-origin leak', () => {
  test('token attaches only to same-origin non-GET requests', async ({ page }) => {
    const evil: { url: string; method: string; token?: string }[] = [];
    const same: { method: string; token?: string }[] = [];
    const get: { method: string; token?: string }[] = [];

    await page.route('http://evil-host.test/**', (route) => {
      const h = route.request().headers();
      evil.push({ url: route.request().url(), method: route.request().method(), token: h['x-csrf-token'] });
      route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
        contentType: 'application/json',
        body: '{}',
      });
    });
    await page.route('**/api/f2-same-origin', (route) => {
      const h = route.request().headers();
      same.push({ method: route.request().method(), token: h['x-csrf-token'] });
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/f2-get', (route) => {
      const h = route.request().headers();
      get.push({ method: route.request().method(), token: h['x-csrf-token'] });
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto('/e2e/examples/security-f2-csrf.html');

    // GET auto-fires on load (success template swaps in the done marker)
    await expect(page.getByTestId('f2-get-done')).toBeVisible();

    // cross-origin POST variants
    await page.getByTestId('f2-post-proto').click();
    await expect(page.getByTestId('f2-proto-done')).toBeVisible();
    await page.getByTestId('f2-post-back').click();
    await expect(page.getByTestId('f2-back-done')).toBeVisible();
    await page.getByTestId('f2-post-upper').click();
    await expect(page.getByTestId('f2-upper-done')).toBeVisible();

    // same-origin POST control
    await page.getByTestId('f2-post-same').click();
    await expect(page.getByTestId('f2-same-done')).toBeVisible();

    // BLOCKED: no cross-origin request carried the token
    expect(evil.length).toBeGreaterThanOrEqual(3);
    for (const r of evil) {
      expect(r.token, `token leaked cross-origin to ${r.url}`).toBeUndefined();
    }

    // control: same-origin non-GET DID carry the token
    expect(same.some((r) => r.token === 'CSRF_SECRET_TOKEN')).toBeTruthy();

    // control: GET never carried the token
    expect(get.length).toBeGreaterThanOrEqual(1);
    for (const r of get) expect(r.token).toBeUndefined();
  });
});
