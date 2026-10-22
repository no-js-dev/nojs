import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Diagnostics for cases that used to fail silently (NoJS.global() dropping
// methods, untrusted interceptors losing sensitive headers, trusted: true on
// the plugin object) and the opt-in xlink:href URL check under strictBindings.
// Results stay as in v1.21.1; only warnings are added.

const FIXTURE = '/e2e/examples/plugin-silent-failures.html';

function collectWarnings(page: Page) {
  const warnings: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
  return warnings;
}

async function mockEcho(page: Page) {
  const sent: Record<string, string>[] = [];
  await page.route('**/api/echo', async (route) => {
    sent.push(route.request().headers());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  return sent;
}

test.describe('Plugin silent failures', () => {
  test('1 — NoJS.global() keeps v1.21.1 results and warns about dropped methods', async ({ page }) => {
    const warnings = collectWarnings(page);
    await page.goto(FIXTURE);
    await expect(page.getByTestId('actions-title')).toHaveText('T');
    await expect(page.getByTestId('actions-label')).toHaveText('');
    await expect(page.getByTestId('hello')).toHaveText('hi ana');

    const dropped = warnings.filter((w) => w.includes('drops function values'));
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toContain('$actions.label, $actions.save');
  });

  test('2 — trusted: true on the plugin object warns', async ({ page }) => {
    const warnings = collectWarnings(page);
    await page.goto(FIXTURE);
    await expect(page.getByTestId('hello')).toHaveText('hi ana');
    const w = warnings.filter((m) => m.includes('trusted: true on the plugin object'));
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('"object-trusted"');
  });

  test('3 — untrusted interceptor: X-CSRF-Token discarded, warned once, value never logged', async ({ page }) => {
    const warnings = collectWarnings(page);
    const sent = await mockEcho(page);
    await page.goto(FIXTURE);
    await expect(page.getByTestId('hello')).toHaveText('hi ana');

    await page.getByTestId('send').click();
    await expect.poll(() => sent.length).toBe(1);
    await page.getByTestId('send-again').click();
    await expect.poll(() => sent.length).toBe(2);

    for (const h of sent) {
      expect(h['x-debug']).toBe('1');
      expect(h['x-csrf-token']).toBeUndefined();
    }
    const w = warnings.filter((m) => m.includes('set sensitive header'));
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('"X-CSRF-Token"');
    expect(w[0]).toContain('NoJS.use(plugin, { trusted: true })');
    expect(warnings.join('\n')).not.toContain('tok-secret-123');
  });

  test('4 — default: bind-xlink:href written as-is, bind-href blocked (v1.21.1)', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('svg-xlink')).toHaveAttribute('xlink:href', 'javascript:window.__xlinkRan = 1');
    await expect(page.getByTestId('svg-href')).toHaveAttribute('href', '#');
    await expect(page.getByTestId('svg-use')).toHaveAttribute('xlink:href', '#dot');
  });

  test('5 — strictBindings: bind-xlink:href javascript: blocked, fragment kept', async ({ page }) => {
    await page.goto(`${FIXTURE}?strict=1`);
    await expect(page.getByTestId('svg-xlink')).toHaveAttribute('xlink:href', '#');
    await expect(page.getByTestId('svg-href')).toHaveAttribute('href', '#');
    await expect(page.getByTestId('svg-use')).toHaveAttribute('xlink:href', '#dot');
    await page.getByTestId('svg-xlink').click();
    expect(await page.evaluate(() => (window as any).__xlinkRan)).toBeUndefined();
  });

  test('6 — no accessibility violations (axe)', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('hello')).toHaveText('hi ana');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
