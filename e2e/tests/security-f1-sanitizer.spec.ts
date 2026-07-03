import { test, expect } from '@playwright/test';

// F1 - javascript: sanitizer bypass via embedded control characters (tab/LF/CR).
// Each PoC must be BLOCKED (scheme neutralized, no script execution) while benign
// URLs survive sanitization unchanged (no over-blocking).

const stripCtl = (s) => s.replace(/[\u0000-\u0020]/g, "").toLowerCase();

test.describe('Security F1 - sanitizer control-char bypass', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/security-f1-sanitizer.html');
  });

  for (const c of [
    { name: 'tab (&#9;)', testId: 'f1-a-tab', sentinel: '__f1_tab' },
    { name: 'LF (&#10;)', testId: 'f1-a-lf', sentinel: '__f1_lf' },
    { name: 'CR (&#13;)', testId: 'f1-a-cr', sentinel: '__f1_cr' },
  ]) {
    test(`bind-html anchor with ${c.name} is blocked`, async ({ page }) => {
      const a = page.getByTestId(c.testId);
      await expect(a).toBeVisible();

      // scheme neutralized: href removed, or not a javascript: URL even after
      // collapsing control characters.
      const attrHref = await a.getAttribute('href');
      expect(attrHref === null || !stripCtl(attrHref).startsWith('javascript:')).toBeTruthy();
      const propHref = await a.evaluate((el) => (el as HTMLAnchorElement).href);
      expect(propHref.startsWith('javascript:')).toBeFalsy();

      // clicking must not execute the injected script
      await a.click();
      expect(await page.evaluate((s) => (window as any)[s], c.sentinel)).toBe(0);
    });
  }

  test('bind-href with literal tab in scheme is blocked', async ({ page }) => {
    const a = page.getByTestId('f1-bindhref');
    await expect(a).toBeVisible();
    const href = (await a.getAttribute('href')) || '';
    expect(stripCtl(href).startsWith('javascript:')).toBeFalsy();
    await a.click();
    expect(await page.evaluate(() => (window as any).__f1_bindhref)).toBe(0);
  });

  test('controls: benign URLs survive sanitization unchanged', async ({ page }) => {
    await expect(page.getByTestId('f1-a-https')).toHaveAttribute('href', 'https://example.com/ok');
    await expect(page.getByTestId('f1-a-rel')).toHaveAttribute('href', '/relative/ok');
    await expect(page.getByTestId('f1-a-anchor')).toHaveAttribute('href', '#frag');
    await expect(page.getByTestId('f1-a-mailto')).toHaveAttribute('href', 'mailto:hi@example.com');
    await expect(page.getByTestId('f1-ctrl-bindhref')).toHaveAttribute('href', 'https://example.com/control');
  });
});
