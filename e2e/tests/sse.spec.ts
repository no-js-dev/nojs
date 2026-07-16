import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Server-side count of open SSE connections for a given channel (/sse/stats). */
async function activeConnections(page: Page, chan: string): Promise<number> {
  const res = await page.request.get(`/sse/stats?chan=${encodeURIComponent(chan)}`);
  return (await res.json()).active;
}

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
    // Server delays SSE headers by 800ms (?start=800) so connecting is observable
    await expect(page.getByTestId('sse-connecting')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('sse-open')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('sse-connecting')).toBeHidden();
    await expect(page.getByTestId('state-data')).toHaveText(/Message \d+/, { timeout: 5000 });
  });

  test('5 — Error template renders on terminal close', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    // Server sends retry: 100, then 204 on reconnect → deterministic terminal close
    await expect(page.getByTestId('sse-error-msg')).toHaveText('SSE connection closed', { timeout: 5000 });
  });

  test('6 — Store integration via into attribute', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('store-local')).toHaveText('Message 2', { timeout: 5000 });
    await expect(page.getByTestId('store-remote')).toHaveText('Message 2', { timeout: 5000 });
  });

  test('7 — Disposal on if-toggle closes the EventSource connection', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    // NoJS.init() is async — wait for bind output so on:click is bound before clicking
    await expect(page.getByTestId('tick-chan')).not.toBeEmpty({ timeout: 5000 });
    const chan = `tick-${await page.getByTestId('tick-chan').textContent()}`;
    // Toggle on (starts hidden) — server must see exactly one open connection
    await page.getByTestId('toggle-btn').click();
    await expect(page.getByTestId('tick-msg')).toHaveText(/Tick \d+/, { timeout: 5000 });
    await expect.poll(() => activeConnections(page, chan), { timeout: 5000 }).toBe(1);
    // Toggle off — disposal must actually close the EventSource (no leaked connection)
    await page.getByTestId('toggle-btn').click();
    await expect(page.getByTestId('tick-msg')).toBeHidden({ timeout: 2000 });
    await expect.poll(() => activeConnections(page, chan), { timeout: 5000 }).toBe(0);
    // Toggle back on — a fresh connection restarts the stream at Tick 1
    await page.getByTestId('toggle-btn').click();
    await expect(page.getByTestId('tick-msg')).toHaveText('Tick 1', { timeout: 5000 });
    await expect.poll(() => activeConnections(page, chan), { timeout: 5000 }).toBe(1);
  });

  test('8 — sse-credentials sends cookies observable server-side', async ({ page, context, baseURL }) => {
    // /sse/credentials replies 401 without an auth cookie; 200 + data only with it
    await context.addCookies([{ name: 'auth', value: 'e2e-token', url: baseURL! }]);
    await page.goto('/e2e/examples/sse.html');
    await expect(page.getByTestId('cred-msg')).toHaveText('Authenticated', { timeout: 5000 });
  });

  test('9 — Interpolated URL reconnect then dispose leaves no leaked connection', async ({ page }) => {
    await page.goto('/e2e/examples/sse.html');
    // NoJS.init() is async — wait for bind output so on:click is bound before clicking
    await expect(page.getByTestId('interp-chan')).not.toBeEmpty({ timeout: 5000 });
    const chan = `interp-${await page.getByTestId('interp-chan').textContent()}`;
    // Show the section — initial connection on the interpolated URL
    await page.getByTestId('interp-toggle-btn').click();
    await expect(page.getByTestId('interp-msg')).toHaveText('Tick 1', { timeout: 5000 });
    await expect.poll(() => activeConnections(page, chan), { timeout: 5000 }).toBe(1);
    // Let the stream advance so a restart is distinguishable
    await expect(page.getByTestId('interp-msg')).toHaveText('Tick 2', { timeout: 5000 });
    // Change interpolated state → URL changes → reconnect (stream restarts at Tick 1)
    await page.getByTestId('interp-user-btn').click();
    await expect(page.getByTestId('interp-msg')).toHaveText('Tick 1', { timeout: 5000 });
    await expect.poll(() => activeConnections(page, chan), { timeout: 5000 }).toBe(1);
    // Dispose the section — the reconnected EventSource must be closed (#285 bug class)
    await page.getByTestId('interp-toggle-btn').click();
    await expect(page.getByTestId('interp-msg')).toBeHidden({ timeout: 2000 });
    await expect.poll(() => activeConnections(page, chan), { timeout: 5000 }).toBe(0);
  });

  test('10 — No critical or serious accessibility violations (axe)', async ({ page }) => {
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
