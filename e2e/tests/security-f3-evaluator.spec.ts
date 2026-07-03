import { test, expect } from '@playwright/test';

// F3 - the expression evaluator must not reach the real Function constructor via
// Object.getOwnPropertyDescriptor(getPrototypeOf(parseInt),'constructor').value to
// read document.cookie. Benign Object methods must keep working.

test.describe('Security F3 - evaluator Function-constructor escape', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/security-f3-evaluator.html');
  });

  test('escape to Function() to read document.cookie is blocked', async ({ page }) => {
    await page.getByTestId('f3-attack').click();

    // the secret cookie must never surface in the bound output
    const out = (await page.getByTestId('f3-out').textContent()) || '';
    expect(out).not.toContain('SECRET_TOKEN_42');

    // the injected function body must never have executed
    expect(await page.evaluate(() => (window as any).__f3_ran)).toBe(0);
  });

  test('controls: benign Object methods still work', async ({ page }) => {
    await page.getByTestId('f3-keys').click();
    await expect(page.getByTestId('f3-keys-out')).toHaveText('["a","b"]');

    await page.getByTestId('f3-vals').click();
    await expect(page.getByTestId('f3-vals-out')).toHaveText('[1,2]');

    await page.getByTestId('f3-entries').click();
    await expect(page.getByTestId('f3-entries-out')).toHaveText('[["a",1]]');

    await page.getByTestId('f3-assign').click();
    await expect(page.getByTestId('f3-assign-out')).toHaveText('{"x":9}');
  });
});
