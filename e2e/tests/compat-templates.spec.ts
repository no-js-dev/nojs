import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/compat-templates.html';

// Template bodies keyed by file name. Each one prints the path it was fetched
// from, so a rendered template proves which URL the framework requested.
const BODIES: Record<string, (path: string) => string> = {
  'header.tpl': (p) => `<p data-test="header">header via ${p}</p>`,
  'footer.tpl': (p) => `<p data-test="footer">footer via ${p}</p>`,
  'nav.tpl': (p) => `<p data-test="nav">nav via ${p}</p>`,
  'shell.tpl': (p) => `<p data-test="shell">shell via ${p}</p><template src="./inner.tpl"></template>`,
  'inner.tpl': (p) => `<p data-test="inner">inner via ${p}</p>`,
  'abs.tpl': (p) => `<p data-test="absolute">absolute via ${p}</p>`,
  'about.tpl': (p) => `<p data-test="page-about">about via ${p}</p>`,
  'reports.tpl': (p) => `<p data-test="page-reports">reports via ${p}</p>`,
};

// Serve every .tpl and /api/users; return the list of template URLs requested.
async function mockTemplates(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(/\.tpl(\?|$)/, (route) => {
    const url = new URL(route.request().url());
    const label = url.origin === 'https://templates.example.test' ? url.href : url.pathname;
    requested.push(label);
    const body = BODIES[url.pathname.split('/').pop() || ''];
    return route.fulfill({
      status: body ? 200 : 404,
      contentType: 'text/html',
      headers: { 'access-control-allow-origin': '*' },
      body: body ? body(label) : 'not found',
    });
  });
  await page.route('**/api/users', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', json: [{ name: 'Ada' }] }),
  );
  return requested;
}

test.describe('Template src resolution — default (v1.21.1): base= / baseApiUrl apply', () => {
  let requested: string[];

  test.beforeEach(async ({ page }) => {
    requested = await mockTemplates(page);
    await page.goto(FIXTURE);
  });

  test('1 — Default: baseApiUrl prefixes a plain relative template src', async ({ page }) => {
    await expect(page.getByTestId('header')).toHaveText('header via /api/parts/header.tpl');
  });

  test('2 — Default: baseApiUrl prefixes a "/"-rooted template src', async ({ page }) => {
    await expect(page.getByTestId('footer')).toHaveText('footer via /api/parts/footer.tpl');
  });

  test('3 — Default: an ancestor base= wins over baseApiUrl', async ({ page }) => {
    await expect(page.getByTestId('nav')).toHaveText('nav via /cdn/parts/nav.tpl');
  });

  test('4 — Default: a nested ./ template resolves against the based parent folder', async ({ page }) => {
    await expect(page.getByTestId('shell')).toHaveText('shell via /api/layout/shell.tpl');
    await expect(page.getByTestId('inner')).toHaveText('inner via /api/layout/inner.tpl');
  });

  test('5 — Default: an absolute https:// template src is fetched as written', async ({ page }) => {
    await expect(page.getByTestId('absolute')).toHaveText('absolute via https://templates.example.test/abs.tpl');
  });

  test('6 — Default: HTTP directives use baseApiUrl', async ({ page }) => {
    await expect(page.getByTestId('user-name')).toHaveText('Ada');
  });

  test('7 — Default: a declared route template src goes through baseApiUrl (hash mode)', async ({ page }) => {
    await expect(page.getByTestId('page-home')).toBeVisible();
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toHaveText('about via /api/pages/about.tpl');
    await expect(page).toHaveURL(/#\/about$/);
  });

  test('8 — Default: a file-based route template goes through baseApiUrl (hash mode)', async ({ page }) => {
    await expect(page.getByTestId('page-home')).toBeVisible();
    await page.getByTestId('nav-reports').click();
    await expect(page.getByTestId('page-reports')).toHaveText('reports via /api/pages/reports.tpl');
    await expect(page).toHaveURL(/#\/reports$/);
  });

  test('9 — Default: no template is requested from the page-relative path', async ({ page }) => {
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toBeVisible();
    await page.getByTestId('nav-reports').click();
    await expect(page.getByTestId('page-reports')).toBeVisible();
    await expect(page.getByTestId('inner')).toBeVisible();

    expect([...new Set(requested)].sort()).toEqual([
      '/api/layout/inner.tpl',
      '/api/layout/shell.tpl',
      '/api/pages/about.tpl',
      '/api/pages/reports.tpl',
      '/api/parts/footer.tpl',
      '/api/parts/header.tpl',
      '/cdn/parts/nav.tpl',
      'https://templates.example.test/abs.tpl',
    ]);
  });
});

test.describe('Template src resolution — templates.pageRelative: true', () => {
  let requested: string[];

  test.beforeEach(async ({ page }) => {
    requested = await mockTemplates(page);
    await page.goto(FIXTURE + '?pageRelative=1');
  });

  test('10 — pageRelative: include templates resolve against the page, ignoring baseApiUrl and base=', async ({ page }) => {
    await expect(page.getByTestId('header')).toHaveText('header via /e2e/examples/parts/header.tpl');
    await expect(page.getByTestId('footer')).toHaveText('footer via /parts/footer.tpl');
    await expect(page.getByTestId('nav')).toHaveText('nav via /e2e/examples/parts/nav.tpl');
    await expect(page.getByTestId('shell')).toHaveText('shell via /e2e/examples/layout/shell.tpl');
    await expect(page.getByTestId('inner')).toHaveText('inner via /e2e/examples/layout/inner.tpl');
    await expect(page.getByTestId('absolute')).toHaveText('absolute via https://templates.example.test/abs.tpl');
  });

  test('11 — pageRelative: HTTP directives still use baseApiUrl', async ({ page }) => {
    await expect(page.getByTestId('user-name')).toHaveText('Ada');
  });

  test('12 — pageRelative: route templates resolve against the page (hash mode)', async ({ page }) => {
    await expect(page.getByTestId('page-home')).toBeVisible();
    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('page-about')).toHaveText('about via /e2e/examples/pages/about.tpl');
    await page.getByTestId('nav-reports').click();
    await expect(page.getByTestId('page-reports')).toHaveText('reports via /e2e/examples/pages/reports.tpl');
    await expect(page.getByTestId('inner')).toBeVisible();

    expect(requested.filter((u) => u.startsWith('/api/') || u.startsWith('/cdn/'))).toEqual([]);
  });
});

test.describe('Template src resolution — accessibility', () => {
  test('13 — No critical or serious accessibility violations (axe)', async ({ page }) => {
    await mockTemplates(page);
    await page.goto(FIXTURE);
    await expect(page.getByTestId('inner')).toBeVisible();
    await expect(page.getByTestId('page-home')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(serious).toEqual([]);
  });
});
