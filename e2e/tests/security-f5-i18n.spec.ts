import { test, expect } from '@playwright/test';

// F5 - $i18n.setLocale must reject values outside supportedLocales and never let a
// traversal value ( ../  ..\  ?  #  / ) escape the loadPath directory. Supported
// locales must still switch normally.

test.describe('Security F5 - i18n loadPath traversal', () => {
  test('control: supported locale switches and fetches its file', async ({ page }) => {
    const reqs: string[] = [];
    page.on('request', (r) => reqs.push(r.url()));

    await page.goto('/e2e/examples/security-f5-i18n.html');
    await expect(page.getByTestId('f5-greeting')).toHaveText('HELLO_EN');

    await page.getByTestId('f5-pt').click();
    await expect(page.getByTestId('f5-greeting')).toHaveText('OLA_PT');

    expect(reqs.some((u) => u.includes('/locales-f5/pt/common.json'))).toBeTruthy();
  });

  test('traversal / poisoning values are rejected (no escaping fetch)', async ({ page }) => {
    const reqs: string[] = [];
    page.on('request', (r) => reqs.push(r.url()));

    await page.goto('/e2e/examples/security-f5-i18n.html');
    await expect(page.getByTestId('f5-greeting')).toHaveText('HELLO_EN');

    for (const id of ['f5-trav1', 'f5-trav2', 'f5-trav3', 'f5-trav4', 'f5-trav5']) {
      await page.getByTestId(id).click();
    }

    // locale unchanged — every malicious value was rejected
    await expect(page.getByTestId('f5-greeting')).toHaveText('HELLO_EN');

    // sync point: a legitimate switch still works after the rejected attempts
    await page.getByTestId('f5-pt').click();
    await expect(page.getByTestId('f5-greeting')).toHaveText('OLA_PT');

    // no request escaped the loadPath directory or hit a traversal path
    for (const u of reqs) {
      let path = u;
      try { path = new URL(u).pathname; } catch { /* keep raw */ }
      let decoded = path;
      try { decoded = decodeURIComponent(path); } catch { /* keep raw */ }
      if (path.includes('/locales-f5/')) {
        expect(path.startsWith('/e2e/examples/locales-f5/'), `escaping request: ${u}`).toBeTruthy();
      }
      expect(decoded, `traversal request: ${u}`).not.toContain('account/settings');
      expect(decoded, `traversal request: ${u}`).not.toContain('secret');
      expect(path, `traversal request: ${u}`).not.toContain('..');
    }
  });
});
