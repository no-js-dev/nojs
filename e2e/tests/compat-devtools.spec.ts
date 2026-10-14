import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Devtools compatibility: with the default config, devtools must behave exactly
// as in v1.21.1 (only initDevtools is local-host gated, store snapshots are not
// redacted, get:config returns headers as the string '[REDACTED]').
// The #370 hardening is opt-in through strictDevtools.

const FIXTURE = '/e2e/examples/compat-devtools.html';
const STRICT = `${FIXTURE}?strict=1`;
// Non-local origin: requests are intercepted with page.route() and proxied to the
// local test server, so the page really runs with location.hostname = app.example.test
// (no DNS involved, works the same in Chromium, Firefox and WebKit).
const REMOTE = 'http://app.example.test';

async function serveFromRemoteHost(page: Page, baseURL: string) {
  await page.route(`${REMOTE}/**`, async (route) => {
    const u = new URL(route.request().url());
    const response = await route.fetch({ url: baseURL + u.pathname + u.search });
    await route.fulfill({ response });
  });
}

async function waitForInit(page: Page) {
  await expect(page.getByTestId('store-theme')).toHaveText('dark');
  await expect(page.getByTestId('counter-value')).toHaveText('0');
}

function sendCommand(page: Page, command: string, args: Record<string, unknown> = {}): Promise<any> {
  return page.evaluate(
    ([cmd, cmdArgs]) =>
      new Promise((resolve) => {
        const handler = (e: any) => {
          if (e.detail.command !== cmd) return;
          window.removeEventListener('nojs:devtools:response', handler);
          resolve(JSON.parse(JSON.stringify(e.detail.result)));
        };
        window.addEventListener('nojs:devtools:response', handler);
        window.dispatchEvent(new CustomEvent('nojs:devtools:cmd', { detail: { command: cmd, args: cmdArgs } }));
      }),
    [command, args] as const,
  );
}

function devtoolsEvents(page: Page): Promise<{ type: string; data: any }[]> {
  return page.evaluate(() =>
    (window as any).__devtoolsEvents.map((e: any) => ({ type: e.type, data: JSON.parse(JSON.stringify(e.data)) })),
  );
}

test.describe('Compat — devtools defaults match v1.21.1', () => {
  test('1 — Default, local host: get:config returns headers as the string [REDACTED]', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInit(page);

    const cfg = await sendCommand(page, 'get:config');
    expect(cfg.devtools).toBe(true);
    expect(cfg.strictDevtools).toBe(false);
    expect(cfg.headers).toBe('[REDACTED]');
    expect(cfg.csrf).toEqual({ token: '[REDACTED]', header: 'X-CSRF-Token' });
  });

  test('2 — Default, local host: config getter and store snapshots are not redacted', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInit(page);

    const surfaces = await page.evaluate(() => {
      const dt = (window as any).__NOJS_DEVTOOLS__;
      return { headers: dt.config.headers, csrf: dt.config.csrf, prefs: dt.stores.prefs };
    });
    expect(surfaces.headers).toEqual({ Authorization: 'Bearer E2E_SECRET', 'X-Custom': 'visible' });
    expect(surfaces.csrf).toEqual({ token: 'CSRF_E2E_SECRET', header: 'X-CSRF-Token' });
    expect(surfaces.prefs).toEqual({ keyboard: 'dvorak', author: 'ann', theme: 'dark' });

    const inspected = await sendCommand(page, 'inspect:store', { name: 'prefs' });
    expect(inspected.data).toEqual({ keyboard: 'dvorak', author: 'ann', theme: 'dark' });
  });

  test('3 — Default, non-local host: events are emitted and the context registry populates', async ({ page, baseURL }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
    await serveFromRemoteHost(page, baseURL!);
    await page.goto(`${REMOTE}${FIXTURE}`);
    await waitForInit(page);

    expect(await page.evaluate(() => location.hostname)).toBe('app.example.test');
    // initDevtools stays local-host gated, as in v1.21.1
    expect(await page.evaluate(() => typeof (window as any).__NOJS_DEVTOOLS__)).toBe('undefined');
    expect(warnings.some((w) => w.includes('devtools: true is ignored outside local environments'))).toBe(true);

    await page.getByTestId('counter-inc').click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');

    const events = await devtoolsEvents(page);
    const created = events.filter((e) => e.type === 'ctx:created');
    expect(created.length).toBeGreaterThan(0);
    // ctx:created is only emitted for contexts added to the registry
    for (const e of created) expect(typeof e.data.id).toBe('number');
    expect(events.some((e) => e.type === 'store:created' && e.data.name === 'prefs')).toBe(true);

    const updated = events.find((e) => e.type === 'ctx:updated' && e.data.key === 'count');
    expect(updated).toBeDefined();
    expect(updated!.data).toMatchObject({ oldValue: 0, newValue: 1 });
    expect(typeof updated!.data.id).toBe('number');
  });
});

test.describe('Compat — strictDevtools opt-in', () => {
  test('4 — strictDevtools, local host: per-key header redaction and redacted store snapshots', async ({ page }) => {
    await page.goto(STRICT);
    await waitForInit(page);

    const cfg = await sendCommand(page, 'get:config');
    expect(cfg.strictDevtools).toBe(true);
    expect(cfg.headers).toEqual({ Authorization: '[REDACTED]', 'X-Custom': 'visible' });
    expect(cfg.csrf).toEqual({ token: '[REDACTED]', header: 'X-CSRF-Token' });

    const surfaces = await page.evaluate(() => {
      const dt = (window as any).__NOJS_DEVTOOLS__;
      return { config: dt.config, prefs: dt.stores.prefs };
    });
    expect(surfaces.config.headers).toEqual({ Authorization: '[REDACTED]', 'X-Custom': 'visible' });
    expect(surfaces.config.csrf.token).toBe('[REDACTED]');
    // Substring match: "keyboard" contains "key", "author" contains "auth"
    expect(surfaces.prefs).toEqual({ keyboard: '[REDACTED]', author: '[REDACTED]', theme: 'dark' });

    const inspected = await sendCommand(page, 'inspect:store', { name: 'prefs' });
    expect(inspected.data).toEqual({ keyboard: '[REDACTED]', author: '[REDACTED]', theme: 'dark' });
  });

  test('5 — strictDevtools, local host: events are still emitted', async ({ page }) => {
    await page.goto(STRICT);
    await waitForInit(page);
    await page.getByTestId('counter-inc').click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');

    const events = await devtoolsEvents(page);
    expect(events.some((e) => e.type === 'ctx:created')).toBe(true);
    expect(events.some((e) => e.type === 'ctx:updated' && e.data.key === 'count')).toBe(true);
  });

  test('6 — strictDevtools, non-local host: no events and no devtools API', async ({ page, baseURL }) => {
    await serveFromRemoteHost(page, baseURL!);
    await page.goto(`${REMOTE}${STRICT}`);
    await waitForInit(page);
    await page.getByTestId('counter-inc').click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');

    expect(await page.evaluate(() => location.hostname)).toBe('app.example.test');
    expect(await page.evaluate(() => typeof (window as any).__NOJS_DEVTOOLS__)).toBe('undefined');
    expect(await devtoolsEvents(page)).toEqual([]);
  });

  test('7 — no accessibility violations (axe)', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInit(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
