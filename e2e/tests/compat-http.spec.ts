import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// HTTP behaviour must match v1.21.1 by default. The hardening from the 1.22
// cycle is only active with the opt-in scopeHeaders / strictRedaction flags.

type Captured = { url: string; method: string; headers: Record<string, string>; body: string | null };

async function capture(page: Page) {
  const requests: Captured[] = [];
  const record = (route: any) => {
    const req = route.request();
    requests.push({ url: req.url(), method: req.method(), headers: req.headers(), body: req.postData() });
  };

  await page.route('https://api.compat-other.test/**', (route) => {
    if (route.request().method() !== 'OPTIONS') record(route);
    route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
      },
      contentType: 'application/json',
      body: '{}',
    });
  });
  await page.route('**/api/compat/**', (route) => {
    record(route);
    const url = route.request().url();
    if (url.includes('/api/compat/fail')) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    }
    if (url.includes('/api/compat/me')) {
      return route.fulfill({
        status: 200,
        headers: { 'x-api-version': '2', authorization: 'Bearer NEXT', 'www-authenticate': 'Basic' },
        contentType: 'application/json',
        body: '{}',
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  return requests;
}

const find = (requests: Captured[], part: string) => requests.find((r) => r.url.includes(part));

async function loadAndRunAll(page: Page, query = '') {
  const requests = await capture(page);
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto('/e2e/examples/compat-http.html' + query);
  await expect(page.getByTestId('cross-done')).toBeVisible();
  await expect(page.getByTestId('same-done')).toBeVisible();
  await expect(page.getByTestId('search-done')).toBeVisible();
  await expect(page.getByTestId('me-done')).toBeVisible();
  await expect(page.getByTestId('fail-done')).toBeVisible();
  await expect(page.getByTestId('avatar-done')).toBeVisible();
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-done')).toBeVisible();
  for (const id of ['body-form-btn', 'body-msg-btn', 'body-dots-btn', 'body-call-btn']) {
    await page.getByTestId(id).click();
  }
  await expect.poll(() => requests.filter((r) => r.url.includes('/api/compat/body/')).length).toBe(5);
  const obs = await page.evaluate(() => (window as any).__obs);
  return { requests, obs, warnings };
}

function expectV1211Bodies(requests: Captured[]) {
  expect(find(requests, '/body/form')!.body).toBe('name=a%26b%3Dc%20d&x=1');
  expect(find(requests, '/body/msg')!.body).toBe('hello%20world%20100%25');
  expect(find(requests, '/body/dots')!.body).toBe('..');
  expect(find(requests, '/body/call')!.body).toBe('v=..&n=a%26b%3Dc%20d');
  const query = find(requests, '/body/query')!;
  expect(query.method).toBe('QUERY');
  expect(query.body).toBe('..');
}

test.describe('HTTP compatibility — v1.21.1 defaults', () => {
  test('1 — global headers are sent to every origin', async ({ page }) => {
    const { requests } = await loadAndRunAll(page);
    expect(find(requests, 'api.compat-other.test/data')!.headers['authorization']).toBe('Bearer COMPAT-SECRET');
    expect(find(requests, '/api/compat/same')!.headers['authorization']).toBe('Bearer COMPAT-SECRET');
  });

  test('2 — app request interceptor sees the full, unredacted URL', async ({ page }) => {
    const { obs } = await loadAndRunAll(page);
    expect(obs.requestUrls).toContain('/api/compat/search?author=ann&keyword=x&token=abc');
  });

  test('3 — app response interceptor sees X-Api-Version and Authorization', async ({ page }) => {
    const { obs } = await loadAndRunAll(page);
    expect(obs.responseHeaders['x-api-version']).toBe('2');
    expect(obs.responseHeaders['authorization']).toBe('Bearer NEXT');
    expect(obs.responseHeaders['www-authenticate']).toBeUndefined();
  });

  test('4 — app response interceptor gets the v1.21.1 redacted URL bytes', async ({ page }) => {
    const { obs } = await loadAndRunAll(page);
    expect(obs.responseUrl).toBe('/api/compat/me?q=a+b&token=%5BREDACTED%5D');
    expect(obs.responseResUrl).toMatch(/^http:\/\/localhost:\d+\/api\/compat\/me\?q=a\+b&token=%5BREDACTED%5D$/);
  });

  test('5 — custom csrf header is visible to and settable by the app interceptor', async ({ page }) => {
    const { requests, obs } = await loadAndRunAll(page);
    expect(obs.sawCsrf).toBe('CSRF-1');
    expect(find(requests, '/api/compat/login')!.headers['x-xsrf-token']).toBe('CSRF-2');
  });

  test('6 — fetch:error and error payloads carry the raw URL', async ({ page }) => {
    const { obs } = await loadAndRunAll(page);
    expect(obs.fetchError).toBe('/api/compat/fail?access_token=TOKEN-SECRET&page=2');
    expect(obs.error).toBe('/api/compat/fail?access_token=TOKEN-SECRET&page=2');
  });

  test('7 — the failure warning keeps the raw URL', async ({ page }) => {
    const { warnings } = await loadAndRunAll(page);
    expect(warnings.some((w) => w.includes('GET /api/compat/fail?access_token=TOKEN-SECRET&page=2 failed'))).toBe(true);
  });

  test('8 — request bodies keep the v1.21.1 bytes', async ({ page }) => {
    const { requests } = await loadAndRunAll(page);
    expectV1211Bodies(requests);
  });

  test('9 — dot-segment value in a URL path stays escaped', async ({ page }) => {
    const { requests } = await loadAndRunAll(page);
    expect(find(requests, '/api/compat/users/')!.url).toContain('/api/compat/users/%252E%252E/avatar');
  });

  test('10 — has no serious accessibility violations', async ({ page }) => {
    await loadAndRunAll(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });
});

test.describe('HTTP compatibility — scopeHeaders and strictRedaction on', () => {
  test('11 — global headers are sent only to trusted origins', async ({ page }) => {
    const { requests } = await loadAndRunAll(page, '?flags=1');
    expect(find(requests, 'api.compat-other.test/data')!.headers['authorization']).toBeUndefined();
    expect(find(requests, '/api/compat/same')!.headers['authorization']).toBe('Bearer COMPAT-SECRET');
  });

  test('12 — app request interceptor sees sensitive query values redacted', async ({ page }) => {
    const { requests, obs } = await loadAndRunAll(page, '?flags=1');
    // Matched by word: author and keyword only contain a sensitive substring.
    expect(obs.requestUrls).toContain('/api/compat/search?author=ann&keyword=x&token=[REDACTED]');
    expect(find(requests, '/api/compat/search')!.url).toContain('/api/compat/search?author=ann&keyword=x&token=abc');
  });

  test('13 — app response interceptor does not see Authorization or X-Api-* headers', async ({ page }) => {
    const { obs } = await loadAndRunAll(page, '?flags=1');
    expect(obs.responseHeaders['x-api-version']).toBeUndefined();
    expect(obs.responseHeaders['authorization']).toBeUndefined();
    expect(obs.responseHeaders['content-type']).toBe('application/json');
  });

  test('14 — app response interceptor gets the string-level redacted URL', async ({ page }) => {
    const { obs } = await loadAndRunAll(page, '?flags=1');
    expect(obs.responseUrl).toBe('/api/compat/me?q=a%20b&token=[REDACTED]');
    expect(obs.responseResUrl).toMatch(/^http:\/\/localhost:\d+\/api\/compat\/me\?q=a%20b&token=\[REDACTED\]$/);
  });

  test('15 — custom csrf header is hidden from and not overridable by the app interceptor', async ({ page }) => {
    const { requests, obs } = await loadAndRunAll(page, '?flags=1');
    expect(obs.sawCsrf).toBe('hidden');
    expect(find(requests, '/api/compat/login')!.headers['x-xsrf-token']).toBe('CSRF-1');
  });

  test('16 — fetch:error and error payloads carry the redacted URL', async ({ page }) => {
    const { obs } = await loadAndRunAll(page, '?flags=1');
    expect(obs.fetchError).toBe('/api/compat/fail?access_token=[REDACTED]&page=2');
    expect(obs.error).toBe('/api/compat/fail?access_token=[REDACTED]&page=2');
  });

  test('17 — the failure warning carries the redacted URL', async ({ page }) => {
    const { warnings } = await loadAndRunAll(page, '?flags=1');
    expect(warnings.some((w) => w.includes('GET /api/compat/fail?access_token=[REDACTED]&page=2 failed'))).toBe(true);
    expect(warnings.join('\n')).not.toContain('TOKEN-SECRET');
  });

  test('18 — request bodies are not affected by the flags', async ({ page }) => {
    const { requests } = await loadAndRunAll(page, '?flags=1');
    expectV1211Bodies(requests);
  });
});
