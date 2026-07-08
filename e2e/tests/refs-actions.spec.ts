import { test, expect } from '@playwright/test';

test.describe('Refs & Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/action POST
    await page.route('**/api/action', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Action done!' })
        });
      } else {
        route.fallback();
      }
    });

    await page.goto('/e2e/examples/refs-actions.html');
  });

  test('1 — Ref focus: clicking button focuses the input', async ({ page }) => {
    const input = page.getByTestId('ref-input');
    await expect(input).not.toBeFocused();

    await page.getByTestId('ref-focus-btn').click();
    await expect(input).toBeFocused();
  });

  test('2 — Call directive: POST action shows result', async ({ page }) => {
    await page.getByTestId('call-btn').click();

    const result = page.getByTestId('call-result');
    await expect(result).toBeVisible();
    await expect(result).toHaveText('Action done!');
  });

  test('3 — Error boundary: fallback renders after error', async ({ page }) => {
    // The error-boundary section and fallback template should exist
    const trigger = page.getByTestId('error-trigger');
    await expect(trigger).toBeVisible();

    await trigger.click();

    // After the error, the fallback should render
    const fallback = page.getByTestId('error-fallback');
    await expect(fallback).toBeVisible({ timeout: 3000 });
    await expect(fallback).toContainText('Something went wrong');
  });

  test('4 — Call loading round-trip: restored children keep reactivity (NOJS-249)', async ({ page }) => {
    const val = page.getByTestId('call-reactive-val');

    // Before click: bind shows initial value
    await expect(val).toHaveText('7');

    // Click triggers call → loading template → success → restore
    await page.getByTestId('call-reactive-btn').click();
    await page.waitForTimeout(500);

    // After restore: the restored span should show the value
    const restoredVal = page.getByTestId('call-reactive-val');
    await expect(restoredVal).toBeVisible();
    await expect(restoredVal).toHaveText('7');

    // Bump the reactive value — the restored span must react
    await page.getByTestId('call-reactive-bump').click();
    await expect(restoredVal).toHaveText('8');
  });
});
