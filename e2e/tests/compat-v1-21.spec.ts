import { test, expect, type Page, type Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ═══════════════════════════════════════════════════════════════════════
//  v1.21.1 COMPATIBILITY SUITE
//
//  Every expectation below is the observable behavior of the v1.21.1
//  release. An app that works on v1.21.1 must keep working unchanged, so
//  this suite must stay green on every later build.
//
//  Fixtures: e2e/examples/compat-v1-21/*.html
//  Run against any git ref: scripts/compat-check.sh <ref>
//
//  Test names carry the PR whose change the scenario guards (#NNN).
// ═══════════════════════════════════════════════════════════════════════

const FIXTURES = '/e2e/examples/compat-v1-21';

// ─── Network helpers ────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-app-csrf',
};

type Captured = { method: string; path: string; search: string; headers: Record<string, string>; body: string | null };

function capture(req: Request): Captured {
  const u = new URL(req.url());
  return { method: req.method(), path: u.pathname, search: u.search, headers: req.headers(), body: req.postData() };
}

async function setupHttpRoutes(page: Page) {
  const seen: Captured[] = [];

  await page.route('https://api.other.test/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    seen.push(capture(req));
    await route.fulfill({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify({ source: 'ext' }) });
  });

  await page.route('**/compat/**', async (route) => {
    const req = route.request();
    const c = capture(req);
    seen.push(c);
    const json = (status: number, data: unknown, headers: Record<string, string> = {}) =>
      route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });

    switch (c.path) {
      case '/compat/same': return json(200, { source: 'same' });
      case '/compat/search': return json(200, { source: 'search' });
      case '/compat/versioned': return json(200, { source: 'versioned' }, { 'X-Api-Version': '2', Authorization: 'Bearer server' });
      case '/compat/fail': return json(500, { message: 'server exploded' });
      case '/compat/missing': return json(404, { message: 'not here' });
      default: return json(200, { ok: true });
    }
  });

  return {
    seen,
    to: (path: string) => seen.filter((c) => c.path === path),
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  #379 — NoJS.global()
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — NoJS.global() (#379)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/globals.html`);
    await expect(page.getByTestId('g-mode')).toHaveText('light');
  });

  test('1 — #379 a global object is a reactive proxy: $set from a template updates bind', async ({ page }) => {
    await page.getByTestId('g-set-dark').click();
    await expect(page.getByTestId('g-mode')).toHaveText('dark');
  });

  test('2 — #379 the global exposes $watch and $notify, and $watch fires on change', async ({ page }) => {
    await expect(page.getByTestId('g-has-watch')).toHaveText('function');
    await expect(page.getByTestId('g-has-notify')).toHaveText('function');
    await expect(page.getByTestId('g-watch-count')).toHaveText('0');

    await page.getByTestId('g-set-dark').click();

    await expect(page.getByTestId('g-watch-count')).toHaveText('1');
    await expect(page.getByTestId('g-watch-mode')).toHaveText('dark');
  });

  test('3 — #379 a global holding a Date is JSON-cloned: the Date becomes an ISO string', async ({ page }) => {
    await expect(page.getByTestId('g-date')).toHaveText('2020-01-02T03:04:05.000Z');
    await expect(page.getByTestId('g-date-type')).toHaveText('string');
  });

  test('4 — #379 a global whose data has a "constructor" field is accepted', async ({ page }) => {
    await expect(page.getByTestId('g-ctor-name')).toHaveText('x');
  });

  test('5 — #379 the global is a copy: mutating the source object afterwards does not change it', async ({ page }) => {
    await expect(page.getByTestId('g-copy-source')).toHaveText('mutated');
    await expect(page.getByTestId('g-copy')).toHaveText('orig');
  });

  test('6 — #379 a plugin-registered global supports $set from a template', async ({ page }) => {
    await expect(page.getByTestId('g-plugin-count')).toHaveText('0');
    await page.getByTestId('g-plugin-inc').click();
    await expect(page.getByTestId('g-plugin-count')).toHaveText('1');
    await page.getByTestId('g-plugin-inc').click();
    await expect(page.getByTestId('g-plugin-count')).toHaveText('2');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #356 / #366 / #369 / retries / CANCEL — HTTP
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — HTTP (#356, #366, #369, retries, CANCEL)', () => {
  let net: Awaited<ReturnType<typeof setupHttpRoutes>>;

  test.beforeEach(async ({ page }) => {
    net = await setupHttpRoutes(page);
    await page.goto(`${FIXTURES}/http.html`);
    await expect(page.getByTestId('h-same')).toHaveText('same');
  });

  test('7 — #356 config headers are sent to an absolute URL on another origin', async ({ page }) => {
    await expect(page.getByTestId('h-ext')).toHaveText('ext');
    const ext = net.seen.filter((c) => c.path === '/x' && c.method === 'GET');
    expect(ext).toHaveLength(1);
    expect(ext[0].headers['authorization']).toBe('Bearer t');
  });

  test('8 — #356 control: config headers are sent to a same-origin URL', async () => {
    const same = net.to('/compat/same');
    expect(same).toHaveLength(1);
    expect(same[0].headers['authorization']).toBe('Bearer t');
  });

  test('9 — #366 an app request interceptor sees the full URL, query tokens included', async ({ page }) => {
    await page.getByTestId('i-search-show').click();
    await expect(page.getByTestId('i-search-data')).toHaveText('search');
    await expect(page.getByTestId('i-req-url')).toHaveText('/compat/search?author=ann&keyword=x&token=abc');
    expect(net.to('/compat/search')[0].search).toBe('?author=ann&keyword=x&token=abc');
  });

  test('10 — #366 an app response interceptor sees the X-Api-Version and Authorization response headers', async ({ page }) => {
    await expect(page.getByTestId('i-versioned-data')).toHaveText('versioned');
    await expect(page.getByTestId('i-res-api-version')).toHaveText('2');
    await expect(page.getByTestId('i-res-authorization')).toHaveText('Bearer server');
  });

  test('11 — #366 a custom csrf.header is visible to and settable by the request interceptor', async ({ page }) => {
    await page.getByTestId('i-csrf-send').click();
    await expect(page.getByTestId('i-csrf-done')).toHaveText('yes');
    await expect(page.getByTestId('i-csrf-seen')).toHaveText('csrf-1');
    const sent = net.to('/compat/csrf');
    expect(sent).toHaveLength(1);
    expect(sent[0].headers['x-app-csrf']).toBe('csrf-2');
    expect(sent[0].headers['authorization']).toBe('Bearer t');
  });

  test('12 — #366 the fetch:error payload carries the raw URL', async ({ page }) => {
    await expect(page.getByTestId('i-error-url')).toHaveText('/compat/fail?author=ann&token=abc');
  });

  test('13 — #369 body="{v}" with v=".." sends the bytes ".."', async ({ page }) => {
    await page.getByTestId('b-dots').click();
    await expect(page.getByTestId('b-sent')).toHaveText('dots');
    expect(net.to('/compat/body/dots')[0].body).toBe('..');
  });

  test('14 — #369 body="name={n}&x=1" percent-encodes the placeholder value only', async ({ page }) => {
    await page.getByTestId('b-form').click();
    await expect(page.getByTestId('b-sent')).toHaveText('form');
    expect(net.to('/compat/body/form')[0].body).toBe('name=a%26b%3Dc%20d&x=1');
  });

  test('15 — #369 body="{msg}" percent-encodes spaces and %', async ({ page }) => {
    await page.getByTestId('b-msg').click();
    await expect(page.getByTestId('b-sent')).toHaveText('msg');
    expect(net.to('/compat/body/msg')[0].body).toBe('hello%20world%20100%25');
  });

  test('16 — retry="2" on a 404 GET makes 3 attempts, then renders the error template', async ({ page }) => {
    await expect(page.getByTestId('r-error')).toHaveText('404');
    expect(net.to('/compat/missing')).toHaveLength(3);
  });

  test('17 — NoJS.CANCEL from a request interceptor is silent: no request, no error template, no then=', async ({ page }) => {
    await page.getByTestId('c-send').click();
    await expect(page.getByTestId('c-interceptor')).toHaveText('cancelled');

    // Sync point: a later request completes a full network round trip, so the
    // cancelled request's (microtask) error path has long settled by then.
    await page.getByTestId('b-msg').click();
    await expect(page.getByTestId('b-sent')).toHaveText('msg');

    await expect(page.getByTestId('c-error')).toHaveCount(0);
    await expect(page.getByTestId('c-state')).toHaveText('idle');
    expect(net.to('/compat/cancel')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #357 — persist
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — persist (#357)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/persist.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('p-empty-a')).toHaveText('1');
  });

  const storage = (page: Page, key: string) =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);

  test('18 — #357 persist-fields="" persists every field across a reload', async ({ page }) => {
    await page.getByTestId('p-empty-bump').click();
    await expect(page.getByTestId('p-empty-a')).toHaveText('11');
    await expect(page.getByTestId('p-empty-b')).toHaveText('22');
    expect(await storage(page, 'nojs_state_compat-empty')).toEqual({ a: 11, b: 22 });

    await page.reload();
    await expect(page.getByTestId('p-empty-a')).toHaveText('11');
    await expect(page.getByTestId('p-empty-b')).toHaveText('22');
  });

  test('19 — #357 a bare persist-fields attribute persists every field across a reload', async ({ page }) => {
    await page.getByTestId('p-bare-bump').click();
    await expect(page.getByTestId('p-bare-a')).toHaveText('11');
    expect(await storage(page, 'nojs_state_compat-bare')).toEqual({ a: 11, b: 22 });

    await page.reload();
    await expect(page.getByTestId('p-bare-a')).toHaveText('11');
    await expect(page.getByTestId('p-bare-b')).toHaveText('22');
  });

  test('20 — #357 a declared $tab state key is written to storage with the other fields', async ({ page }) => {
    await expect(page.getByTestId('p-tab')).toHaveText('one');
    await page.getByTestId('p-tab-bump').click();
    await expect(page.getByTestId('p-tab-n')).toHaveText('1');
    expect(await storage(page, 'nojs_state_compat-tab')).toEqual({ $tab: 'one', n: 1 });
  });

  test('21 — #357 a $tab changed by app code is persisted and restored after reload', async ({ page }) => {
    await page.getByTestId('p-tab-two').click();
    await expect(page.getByTestId('p-tab')).toHaveText('two');
    expect(await storage(page, 'nojs_state_compat-tab')).toEqual({ $tab: 'two', n: 0 });

    await page.reload();
    await expect(page.getByTestId('p-tab')).toHaveText('two');
  });

  test('22 — #357 a $tab saved by an earlier session is restored on load', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('nojs_state_compat-tab', JSON.stringify({ $tab: 'three', n: 5 })));
    await page.reload();
    await expect(page.getByTestId('p-tab-n')).toHaveText('5');
    await expect(page.getByTestId('p-tab')).toHaveText('three');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #362 — <template src> resolution
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — template src (#362)', () => {
  let tplRequests: string[];

  test.beforeEach(async ({ page }) => {
    tplRequests = [];
    await page.route('**/*.tpl', async (route) => {
      const path = new URL(route.request().url()).pathname;
      tplRequests.push(path);
      await route.fulfill({ status: 200, contentType: 'text/html', body: `<p>loaded ${path}</p>` });
    });
    await page.goto(`${FIXTURES}/templates.html`);
  });

  test('23 — #362 with baseApiUrl "/api", src="parts/header.tpl" is fetched from /api/parts/header.tpl', async ({ page }) => {
    await expect(page.getByTestId('t-plain')).toContainText('loaded /api/parts/header.tpl');
    expect(tplRequests).toContain('/api/parts/header.tpl');
  });

  test('24 — #362 an ancestor base="/cms" resolves src="parts/footer.tpl" to /cms/parts/footer.tpl', async ({ page }) => {
    await expect(page.getByTestId('t-base')).toContainText('loaded /cms/parts/footer.tpl');
    expect(tplRequests).toContain('/cms/parts/footer.tpl');
  });

  test('25 — #362 with baseApiUrl "/api", src="/parts/abs.tpl" is fetched from /api/parts/abs.tpl', async ({ page }) => {
    await expect(page.getByTestId('t-abs')).toContainText('loaded /api/parts/abs.tpl');
    expect(tplRequests).toContain('/api/parts/abs.tpl');
  });

  test('26 — #362 with baseApiUrl "/api", src="./parts/dot.tpl" is fetched from /api/parts/dot.tpl', async ({ page }) => {
    await expect(page.getByTestId('t-dot')).toContainText('loaded /api/parts/dot.tpl');
    expect(tplRequests).toContain('/api/parts/dot.tpl');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #371 / #360 / #358 — custom directives, t-html, page-jsonld
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — directives, t-html, page-jsonld (#371, #360, #358)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/render.html`);
    await expect(page.getByTestId('j-ready')).toBeVisible();
  });

  test('27 — #371 an app directive named on:clickoutside runs', async ({ page }) => {
    const box = page.getByTestId('d-clickoutside');
    await expect(box).toHaveAttribute('data-custom-directive', 'on:clickoutside');
    await expect(page.getByTestId('d-outside-count')).toHaveText('0');

    await page.getByTestId('d-outside-target').click();
    await expect(page.getByTestId('d-outside-count')).toHaveText('1');

    await box.click();
    await page.getByTestId('d-outside-target').click();
    await expect(page.getByTestId('d-outside-count')).toHaveText('2');
  });

  test('28 — #371 an app directive named class-x runs', async ({ page }) => {
    await expect(page.getByTestId('d-class-x')).toHaveAttribute('data-custom-directive', 'class-x');
  });

  test('29 — #371 a plugin directive named bind-chart runs', async ({ page }) => {
    const chart = page.getByTestId('d-bind-chart');
    await expect(chart).toHaveAttribute('data-custom-directive', 'bind-chart');
    await expect(chart).toHaveText('chart:3,1,2');
  });

  test('30 — #360 t-html renders markup passed through a t-* param as a real <a>', async ({ page }) => {
    const p = page.getByTestId('t-link');
    await expect(p).toHaveText('Read terms');
    const link = p.locator('a');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/terms');
    await expect(link).toHaveText('terms');
  });

  test('31 — #360 the sanitizer still strips <script> and onerror from a t-html param', async ({ page }) => {
    const p = page.getByTestId('t-xss');
    await expect(p.locator('a[href="/ok"]')).toHaveText('ok');
    await expect(p.locator('script')).toHaveCount(0);
    await expect(p.locator('img')).toHaveCount(1);
    await expect(p.locator('img')).not.toHaveAttribute('onerror', /.*/);
    expect(await page.evaluate(() => (window as any).__compatPwned)).toBeUndefined();
  });

  test('32 — #358 page-jsonld: a raw JSON fragment value outside quotes produces valid JSON', async ({ page }) => {
    const script = page.locator('script[type="application/ld+json"][data-nojs]');
    await expect(script).toHaveCount(1);
    const raw = await script.textContent();
    const data = JSON.parse(raw || '');
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Widget',
      offers: { price: 5 },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #359 — dispose() → config() → init()
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — reconfigure after dispose() (#359)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/dispose.html`);
    await expect(page.getByTestId('s-first-b')).toHaveText('bold');
  });

  test('33 — #359 control: the first init sanitizes bind-html (onclick stripped)', async ({ page }) => {
    await expect(page.getByTestId('s-first-b')).not.toHaveAttribute('onclick', /.*/);
  });

  test('34 — #359 dispose() then config({ sanitizeHtml }) then init() uses the new sanitizer hook', async ({ page }) => {
    await page.getByTestId('s-reinit-hook').click();
    await expect(page.getByTestId('s-status')).toHaveText('done');
    await expect(page.getByTestId('s-hooked')).toHaveText('hooked');
    await expect(page.getByTestId('s-stage-b')).toHaveCount(0);
  });

  test('35 — #359 dispose() then config({ dangerouslyDisableSanitize: true }) then init() renders raw HTML', async ({ page }) => {
    await page.getByTestId('s-reinit-off').click();
    await expect(page.getByTestId('s-status')).toHaveText('done');
    await expect(page.getByTestId('s-stage-b')).toHaveText('bold');
    await expect(page.getByTestId('s-stage-b')).toHaveAttribute('onclick', 'window.__compatClicked=1');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  #370 — devtools
// ═══════════════════════════════════════════════════════════════════════

type DevtoolsEvent = { type: string; data: any };
const devtoolsEvents = (page: Page): Promise<DevtoolsEvent[]> =>
  page.evaluate(() => (window as any).__compatDevtoolsEvents.map((e: any) => ({ type: e.type, data: e.data })));

test.describe('Compat v1.21.1 — devtools (#370)', () => {
  test('36 — #370 devtools: true on a non-local host still emits events and registers contexts', async ({ page, baseURL }) => {
    // Serve the fixture as http://compat.test/... so location.hostname is not a local host
    await page.route('http://compat.test/**', async (route) => {
      const u = new URL(route.request().url());
      const response = await route.fetch({ url: `${baseURL}${u.pathname}${u.search}` });
      await route.fulfill({ response });
    });
    await page.goto(`http://compat.test${FIXTURES}/devtools.html`);
    await expect(page.getByTestId('dt-host')).toHaveText('compat.test');
    await expect(page.getByTestId('dt-count')).toHaveText('0');

    const created = (await devtoolsEvents(page)).filter((e) => e.type === 'ctx:created');
    expect(created.length).toBeGreaterThan(0);
    const stateCtx = created.find((e) => Array.isArray(e.data.keys) && e.data.keys.includes('count'));
    expect(stateCtx).toBeDefined();
    expect(typeof stateCtx!.data.id).toBe('number');

    await page.getByTestId('dt-inc').click();
    await expect(page.getByTestId('dt-count')).toHaveText('1');

    await expect.poll(async () =>
      (await devtoolsEvents(page)).some((e) =>
        e.type === 'ctx:updated' && e.data.key === 'count' && e.data.newValue === 1 && e.data.id === stateCtx!.data.id)
    ).toBe(true);
  });

  test('37 — #370 get:config returns headers as the string "[REDACTED]"', async ({ page }) => {
    await page.goto(`${FIXTURES}/devtools.html`);
    await expect(page.getByTestId('dt-count')).toHaveText('0');

    const result = await page.evaluate(() => new Promise<any>((resolve) => {
      window.addEventListener('nojs:devtools:response', (e: any) => {
        const r = e.detail.result;
        resolve({ headers: r.headers, csrfToken: r.csrf && r.csrf.token, devtools: r.devtools });
      }, { once: true });
      window.dispatchEvent(new CustomEvent('nojs:devtools:cmd', { detail: { command: 'get:config' } }));
    }));

    expect(result.headers).toBe('[REDACTED]');
    expect(result.csrfToken).toBe('[REDACTED]');
    expect(result.devtools).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Accessibility
// ═══════════════════════════════════════════════════════════════════════

test.describe('Compat v1.21.1 — accessibility', () => {
  test('38 — compat fixtures have no critical or serious axe violations', async ({ page }) => {
    await setupHttpRoutes(page);
    await page.route('**/*.tpl', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<p>template</p>' }));

    for (const name of ['globals', 'http', 'persist', 'templates', 'render', 'dispose', 'devtools']) {
      await page.goto(`${FIXTURES}/${name}.html`);
      await expect(page.locator('h1')).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(serious, `${name}.html`).toEqual([]);
    }
  });
});
