import { test, expect } from '@playwright/test';

// A watcher disposed while a batch drain is running must not run in that
// drain. The switch hides case 'a' and disposes its content in the same
// update that changes `s`; before the fix, the case's `get` still re-ran
// with the new value and requested /api/item-b (twice) for a hidden case.

test.describe('Switch — hidden case', () => {
  test('1 — hiding a case does not fire its get with the new value', async ({ page }) => {
    const api: string[] = [];
    await page.route('**/api/item-*', (route) => {
      const path = new URL(route.request().url()).pathname;
      api.push(path);
      return route.fulfill({ json: { name: path } });
    });

    await page.goto('/e2e/examples/switch-hidden-case.html');
    await expect(page.getByTestId('item-a')).toHaveText('/api/item-a');
    expect(api).toEqual(['/api/item-a']);

    for (let i = 0; i < 2; i++) {
      api.length = 0;
      await page.getByTestId('to-b').click();
      await expect(page.getByTestId('case-a')).toBeHidden();
      await expect(page.getByTestId('case-b')).toBeVisible();
      // Give a stray request from the hidden case time to show up.
      await page.waitForTimeout(150);
      expect(api).toEqual([]);
      await expect(page.getByTestId('item-a')).toHaveText('/api/item-a');

      api.length = 0;
      await page.getByTestId('to-a').click();
      await expect(page.getByTestId('case-a')).toBeVisible();
      await expect(page.getByTestId('item-a')).toHaveText('/api/item-a');
      expect(api).toEqual(['/api/item-a']);
    }
  });
});
