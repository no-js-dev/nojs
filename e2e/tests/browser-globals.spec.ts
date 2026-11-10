import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/browser-globals.html';

// window, document and navigator are exposed to expressions through safe
// proxies. With the proxy as `this`, every engine rejects WebIDL getters and
// methods ("Illegal invocation" in Chromium). An explicit allow-list of
// read-only members is read against the real object; everything else must stay
// exactly as on v1.21.1 (unreachable).

test.describe('Browser globals - safe proxy receiver', () => {

  test('1 — navigator getters resolve and the deny-list still applies', async ({ page }) => {
    await page.goto(FIXTURE);
    const language = await page.evaluate(() => navigator.language);
    await expect(page.getByTestId('nav-language')).toHaveText(language);
    await expect(page.getByTestId('nav-online')).toHaveText('true');
    await expect(page.getByTestId('nav-languages')).toHaveText('true');
    await expect(page.getByTestId('nav-window')).toHaveText(language);
    await expect(page.getByTestId('nav-beacon')).toHaveText('undefined');
    await expect(page.getByTestId('nav-credentials')).toHaveText('undefined');
  });

  test('2 — navigator.clipboard.writeText copies the text', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } else {
      // Firefox/WebKit cannot grant clipboard-read in Playwright: record the
      // call on the real Clipboard prototype instead (brand check kept).
      await page.addInitScript(() => {
        const w = window as any;
        w.__clipWrites = [];
        if (typeof Clipboard === 'undefined') return;
        Clipboard.prototype.writeText = function (text: string) {
          if (!(this instanceof Clipboard)) throw new TypeError('Illegal invocation');
          w.__clipWrites.push(text);
          return Promise.resolve();
        };
      });
    }
    await page.goto(FIXTURE);
    const hasApi = await page.evaluate(() => !!(navigator.clipboard && navigator.clipboard.writeText));
    test.skip(!hasApi, 'navigator.clipboard.writeText is not available in this engine');

    await expect(page.getByTestId('clip-type')).toHaveText('function');
    await expect(page.getByTestId('clip-read')).toHaveText('undefined');
    await page.getByTestId('clip-copy').click();
    await expect(page.getByTestId('clip-clicked')).toHaveText('true');

    if (browserName === 'chromium') {
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('copied-by-nojs');
    } else {
      await expect.poll(() => page.evaluate(() => (window as any).__clipWrites)).toEqual(['copied-by-nojs']);
    }
  });

  test('3 — allow-listed window members resolve, fetch stays blocked', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('win-width')).toHaveText('true');
    await expect(page.getByTestId('win-height')).toHaveText('true');
    await expect(page.getByTestId('win-scroll')).toHaveText('0');
    await expect(page.getByTestId('win-dpr')).toHaveText('true');
    await expect(page.getByTestId('win-media')).toHaveText('true');
    await expect(page.getByTestId('win-default-view')).toHaveText('true');
    await expect(page.getByTestId('win-fetch')).toHaveText('undefined');
  });

  test('4 — members outside the allow-list stay unreachable (v1.21.1 behavior)', async ({ page }) => {
    await page.goto(FIXTURE);
    for (const id of ['off-doc-title', 'off-doc-create', 'off-doc-open', 'off-nav-sw',
      'off-nav-geo', 'off-win-opener', 'off-win-caches', 'off-win-style']) {
      await expect(page.getByTestId(id), id).toHaveText('true');
    }
    // document.open() never ran: the page content is intact
    await expect(page.locator('#doc-target')).toHaveText('target');
  });

  test('5 — history.length reads and history.back stays a no-op', async ({ page }) => {
    await page.goto('/e2e/examples/state-binding.html');
    await page.goto(FIXTURE);
    await expect(page.getByTestId('hist-length')).toHaveText('true');
    await page.getByTestId('hist-back').click();
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe(FIXTURE);
  });

  test('6 — accessibility (axe)', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('win-width')).toHaveText('true');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
