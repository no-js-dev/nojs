import { test, expect } from '@playwright/test';

test.describe('State & Binding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/state-binding.html');
  });

  test('1 — Counter: increment and decrement', async ({ page }) => {
    const value = page.getByTestId('counter-value');
    await expect(value).toHaveText('0');

    await page.getByTestId('counter-inc').click();
    await expect(value).toHaveText('1');

    await page.getByTestId('counter-dec').click();
    await expect(value).toHaveText('0');
  });

  test('2 — Text input: two-way model binding', async ({ page }) => {
    const input = page.getByTestId('name-input');
    const display = page.getByTestId('name-display');

    await input.fill('hello');
    await expect(display).toHaveText('hello');
  });

  test('3 — Computed: doubled value updates', async ({ page }) => {
    const computed = page.getByTestId('computed-value');
    await expect(computed).toHaveText('0');

    await page.getByTestId('counter-inc').click();
    await expect(computed).toHaveText('2');

    await page.getByTestId('counter-inc').click();
    await expect(computed).toHaveText('4');
  });

  test('4 — Watcher: fires on count change', async ({ page }) => {
    const output = page.getByTestId('watch-output');

    await page.getByTestId('counter-inc').click();
    await expect(output).toHaveText('changed to 1');
  });

  test('5 — Persistent state: survives page reload', async ({ page }) => {
    const input = page.getByTestId('persist-input');
    const display = page.getByTestId('persist-display');

    await input.fill('persist-me');
    await expect(display).toHaveText('persist-me');

    await page.reload();

    await expect(page.getByTestId('persist-display')).toHaveText('persist-me');

    // Cleanup
    await page.evaluate(() => localStorage.removeItem('nojs_state_e2e-test'));
  });

  test('6 — Global store: toggle theme', async ({ page }) => {
    const display = page.getByTestId('store-display');
    await expect(display).toHaveText('light');

    await page.getByTestId('store-toggle').click();
    await expect(display).toHaveText('dark');
  });

  test('7 — HTML binding: renders HTML tags', async ({ page }) => {
    const output = page.getByTestId('html-output');

    await expect(output.locator('strong')).toHaveText('bold');
    await expect(output.locator('em')).toHaveText('italic');
  });

  test('8 — External store mutation with NoJS.notify()', async ({ page }) => {
    const display = page.getByTestId('notify-display');
    await expect(display).toHaveText('light');

    const toggle = page.getByTestId('notify-toggle');
    await toggle.click();
    await expect(display).toHaveText('dark');
    await expect(page.getByTestId('store-display')).toHaveText('dark');

    await toggle.click();
    await expect(display).toHaveText('light');
  });
});
