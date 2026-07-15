import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('SSE', () => {

  test('1 — Live binding replaces data on each message', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('live-msg')).toHaveText('Message 3', { timeout: 5000 });
  });

  test('2 — Append feed with sse-limit caps at 3 items', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    const items = page.getByTestId('feed-item');
    await expect(items.filter({ hasText: 'Message 5' })).toBeVisible({ timeout: 5000 });
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('Message 3');
    await expect(items.nth(1)).toHaveText('Message 4');
    await expect(items.nth(2)).toHaveText('Message 5');
  });

  test('3 — Named events filtered by sse-event', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('named-event-msg')).toHaveText('Message 3', { timeout: 5000 });
  });

  test('4 — $sse state transitions from connecting to open', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('sse-open')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('state-data')).toHaveText(/Message \d+/, { timeout: 5000 });
  });

  test('5 — Error template renders on terminal close', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('sse-error-msg')).toHaveText('SSE connection closed', { timeout: 15000 });
  });

  test('6 — Store integration via into attribute', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('store-local')).toHaveText('Message 2', { timeout: 5000 });
    await expect(page.getByTestId('store-remote')).toHaveText('Message 2', { timeout: 5000 });
  });

  test('7 — Disposal on if-toggle closes connection', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    // Toggle on (starts hidden)
    await page.getByTestId('toggle-btn').click();
    await expect(page.getByTestId('tick-msg')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tick-msg')).toHaveText(/Tick \d+/, { timeout: 5000 });
    // Toggle off — element hidden (disposed)
    await page.getByTestId('toggle-btn').click();
    await expect(page.getByTestId('tick-msg')).toBeHidden({ timeout: 2000 });
    // Toggle back on — fresh connection starts
    await page.getByTestId('toggle-btn').click();
    await expect(page.getByTestId('tick-msg')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tick-msg')).toHaveText(/Tick \d+/, { timeout: 5000 });
  });

  test('8 — No critical or serious accessibility violations (axe)', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('live-msg')).toHaveText(/Message/, { timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(serious).toEqual([]);
  });

});
