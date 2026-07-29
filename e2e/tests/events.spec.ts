import { test, expect } from '@playwright/test';

test.describe('Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/events.html');
  });

  test('1 — Basic click: increments count', async ({ page }) => {
    const count = page.getByTestId('click-count');
    await expect(count).toHaveText('0');

    await page.getByTestId('click-btn').click();
    await page.getByTestId('click-btn').click();
    await page.getByTestId('click-btn').click();
    await expect(count).toHaveText('3');
  });

  test('2 — Prevent modifier: prevents navigation', async ({ page }) => {
    const output = page.getByTestId('prevent-output');
    await expect(output).toHaveText('false');

    await page.getByTestId('prevent-link').click();

    // Should still be on the same page (no navigation)
    await expect(page).toHaveURL(/events\.html/);
    await expect(output).toHaveText('true');
  });

  test('3 — Once modifier: fires only once', async ({ page }) => {
    const count = page.getByTestId('once-count');
    await expect(count).toHaveText('0');

    await page.getByTestId('once-btn').click();
    await page.getByTestId('once-btn').click();
    await page.getByTestId('once-btn').click();
    await expect(count).toHaveText('1');
  });

  test('4 — Debounce: updates after delay', async ({ page }) => {
    const output = page.getByTestId('debounce-output');
    const input = page.getByTestId('debounce-input');

    await input.fill('hello');
    // Debounce delays the update — auto-retrying assertion waits for it
    await expect(output).toHaveText('hello');
  });

  test('5 — Keydown enter: triggers on Enter key', async ({ page }) => {
    const output = page.getByTestId('key-output');
    await expect(output).toHaveText('');

    await page.getByTestId('key-input').press('Enter');
    await expect(output).toHaveText('yes');
  });

  test('6 — Mounted lifecycle: sets status on mount', async ({ page }) => {
    const output = page.getByTestId('mounted-output');
    await expect(output).toHaveText('mounted');
  });

  test('7 — Custom event trigger: receives event data', async ({ page }) => {
    const output = page.getByTestId('trigger-output');
    await expect(output).toHaveText('');

    await page.getByTestId('trigger-btn').click();
    await expect(output).toHaveText('hello');
  });
});
