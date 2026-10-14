import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/events-on-error.html';

test.describe('Events — on:error', () => {
  test('1 — Image 404: on:error runs on the img', async ({ page }) => {
    // Hold the 404 until No.JS has processed the page, so the outcome does
    // not depend on whether the image or the script finishes loading first.
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/missing.png', async (route) => {
      await ready;
      await route.fulfill({ status: 404, body: 'Not Found' });
    });

    // 'load' would wait for the held image.
    await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' });
    const failed = page.getByTestId('img-failed');
    await expect(failed).toHaveText('false');

    release();
    await expect(failed).toHaveText('true');
  });

  test('2 — Image 404 before init: on:error runs exactly once', async ({ page }) => {
    // Not held: on a local server the 404 usually arrives before No.JS has
    // attached the listener, so this exercises the replay of the error.
    await page.goto(FIXTURE);
    const fails = page.getByTestId('early-fails');
    await expect(fails).toHaveText('1');

    // Let any late (real or replayed) error event run, then re-check.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    await expect(fails).toHaveText('1');
  });

  test('3 — Uncaught error: on:error elements neither throw nor run', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FIXTURE);
    await expect(page.getByTestId('error-caught')).toHaveText('0');

    // Page errors arrive asynchronously; once the later 'done' is reported,
    // everything thrown while 'boom' was dispatched has been reported too.
    await page.evaluate(() => {
      setTimeout(() => { throw new Error('boom'); }, 0);
      setTimeout(() => { throw new Error('done'); }, 0);
    });
    await expect.poll(() => errors).toContain('done');

    expect(errors).toEqual(['boom', 'done']);
    await expect(page.getByTestId('error-caught')).toHaveText('0');
  });

  test('4 — Accessibility: no axe violations', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('error-caught')).toHaveText('0');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
