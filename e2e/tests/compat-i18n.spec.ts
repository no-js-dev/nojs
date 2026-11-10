import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// t-html params are inserted raw (still sanitized) by default, exactly as in
// v1.21.1. i18n.escapeParams: true opts into rendering them as text.
// The persisted nojs-locale is restored as in v1.21.1 by default;
// i18n.strictLocale: true ignores (and removes) a value outside supportedLocales.
// Fixture: e2e/examples/compat-i18n.html (?escapeParams=1, ?persist=1, ?strictLocale=1).

const FIXTURE = '/e2e/examples/compat-i18n.html';

async function open(page: Page, query = '') {
  await page.goto(FIXTURE + query);
  await expect(page.getByTestId('locale')).toHaveText('en');
}

test.describe('Compat i18n — t-html params, default (v1.21.1)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('1 — A link passed as a param renders as a real <a>', async ({ page }) => {
    const p = page.getByTestId('link-param');
    await expect(p).toHaveText('Read the terms.');
    const link = p.locator('a');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/terms');
    await expect(link).toHaveText('terms');
  });

  test('2 — Markup in a label param renders inside the translation link', async ({ page }) => {
    const link = page.getByTestId('link-in-translation').locator('a');
    await expect(link).toHaveAttribute('href', '/terms');
    await expect(link.locator('em')).toHaveText('terms');
    await expect(link).toHaveText('terms & conditions');
  });

  test('3 — Markup from reactive state re-renders on change', async ({ page }) => {
    const p = page.getByTestId('state-markup');
    await expect(p.locator('strong')).toHaveText('3');
    await page.getByTestId('state-inc').click();
    await expect(p.locator('strong')).toHaveText('4');
    await expect(p).toHaveText('You have 4 messages.');
  });

  test('4 — XSS payloads in params are stripped and never execute', async ({ page }) => {
    await expect(page.getByTestId('xss-script').locator('b')).toHaveText('Ann');
    await expect(page.getByTestId('xss-script').locator('script')).toHaveCount(0);

    const img = page.getByTestId('xss-onerror').locator('img');
    await expect(img).toHaveCount(1);
    expect(await img.getAttribute('onerror')).toBeNull();

    const jsLink = page.getByTestId('xss-js-url').locator('a');
    await expect(jsLink).toHaveText('click me');
    expect(await jsLink.getAttribute('href')).toBeNull();
    await jsLink.click();

    await expect(page.getByTestId('xss-iframe').locator('iframe')).toHaveCount(0);

    // Give the broken image time to fire its (stripped) error handler.
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
  });

  test('5 — Plain t renders params as literal text', async ({ page }) => {
    const p = page.getByTestId('plain-t');
    await expect(p).toHaveText('Read the <a href=/terms>terms</a>.');
    await expect(p.locator('a')).toHaveCount(0);
  });

  test('6 — Locale switch re-renders raw params in the new locale', async ({ page }) => {
    await page.getByTestId('to-pt').click();
    await expect(page.getByTestId('locale')).toHaveText('pt');

    const p = page.getByTestId('link-param');
    await expect(p).toHaveText('Leia os termos.');
    await expect(p.locator('a')).toHaveAttribute('href', '/terms');
    await expect(p.locator('a')).toHaveText('termos');
    await expect(page.getByTestId('state-markup').locator('strong')).toHaveText('3');
    await expect(page.getByTestId('xss-script').locator('script')).toHaveCount(0);

    await page.getByTestId('to-en').click();
    await expect(page.getByTestId('link-param').locator('a')).toHaveText('terms');
  });

  test('7 — Accessibility: no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Compat i18n — i18n.escapeParams: true', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '?escapeParams=1');
  });

  test('8 — A link param renders as literal text', async ({ page }) => {
    const p = page.getByTestId('link-param');
    await expect(p.locator('a')).toHaveCount(0);
    await expect(p).toHaveText('Read the <a href=/terms>terms</a>.');
  });

  test('9 — Translation markup still renders; the param is text', async ({ page }) => {
    const link = page.getByTestId('link-in-translation').locator('a');
    await expect(link).toHaveAttribute('href', '/terms');
    await expect(link.locator('em')).toHaveCount(0);
    await expect(link).toHaveText('<em>terms</em> & conditions');
  });

  test('10 — XSS payloads render as inert text', async ({ page }) => {
    for (const id of ['xss-script', 'xss-onerror', 'xss-js-url', 'xss-iframe']) {
      await expect(page.getByTestId(id).locator('script, img, a, iframe, b')).toHaveCount(0);
    }
    await expect(page.getByTestId('xss-script')).toContainText('<script>');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
  });

  test('11 — Locale switch keeps params escaped', async ({ page }) => {
    await page.getByTestId('to-pt').click();
    await expect(page.getByTestId('locale')).toHaveText('pt');
    const p = page.getByTestId('link-param');
    await expect(p).toHaveText('Leia os <a href=/terms>termos</a>.');
    await expect(p.locator('a')).toHaveCount(0);
  });

  test('12 — Plain t is unchanged (no double escaping)', async ({ page }) => {
    await expect(page.getByTestId('plain-t')).toHaveText('Read the <a href=/terms>terms</a>.');
  });

  test('13 — Accessibility: no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Compat i18n — escapeParams changed after init()', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('14 — NoJS.config({ i18n: { escapeParams } }) re-renders at once', async ({ page }) => {
    const p = page.getByTestId('link-param');
    await expect(p.locator('a')).toHaveCount(1);
    await page.evaluate(() => (window as any).NoJS.config({ i18n: { escapeParams: true } }));
    await expect(p.locator('a')).toHaveCount(0);
    await expect(p).toHaveText('Read the <a href=/terms>terms</a>.');
    await page.evaluate(() => (window as any).NoJS.config({ i18n: { escapeParams: false } }));
    await expect(p.locator('a')).toHaveAttribute('href', '/terms');
  });

  test('15 — NoJS.i18n({ escapeParams }) re-renders at once', async ({ page }) => {
    const link = page.getByTestId('link-in-translation').locator('a');
    await expect(link.locator('em')).toHaveText('terms');
    await page.evaluate(() => (window as any).NoJS.i18n({ escapeParams: true }));
    await expect(link.locator('em')).toHaveCount(0);
    await expect(link).toHaveText('<em>terms</em> & conditions');
    await page.evaluate(() => (window as any).NoJS.i18n({ escapeParams: false }));
    await expect(link.locator('em')).toHaveText('terms');
  });
});

async function seedLocale(page: Page, value: string) {
  // Seed once per test so a reload sees what No.JS left in storage.
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('__seeded')) {
      localStorage.setItem('nojs-locale', v);
      sessionStorage.setItem('__seeded', '1');
    }
  }, value);
}

function collectWarnings(page: Page) {
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text()); });
  return warnings;
}

const storedLocale = (page: Page) => page.evaluate(() => localStorage.getItem('nojs-locale'));

test.describe('Compat i18n — persisted locale, default (v1.21.1)', () => {
  test('16 — An unsupported persisted locale is restored and kept', async ({ page }) => {
    const warnings = collectWarnings(page);
    await seedLocale(page, 'fr');
    await page.goto(FIXTURE + '?persist=1');
    await expect(page.getByTestId('locale')).toHaveText('fr');
    // fr has no bundle: keys fall back to en, as in v1.21.1
    await expect(page.getByTestId('link-param')).toHaveText('Read the terms.');
    expect(await storedLocale(page)).toBe('fr');
    await page.reload();
    await expect(page.getByTestId('locale')).toHaveText('fr');
    expect(warnings.filter((w) => /locale/i.test(w))).toEqual([]);
  });

  test('17 — A supported persisted locale is restored', async ({ page }) => {
    await seedLocale(page, 'pt');
    await page.goto(FIXTURE + '?persist=1');
    await expect(page.getByTestId('locale')).toHaveText('pt');
    await expect(page.getByTestId('link-param')).toHaveText('Leia os termos.');
  });
});

test.describe('Compat i18n — i18n.strictLocale: true', () => {
  test('18 — An unsupported persisted locale is ignored and removed', async ({ page }) => {
    const warnings = collectWarnings(page);
    await seedLocale(page, 'fr');
    await page.goto(FIXTURE + '?persist=1&strictLocale=1');
    await expect(page.getByTestId('locale')).toHaveText('en');
    await expect(page.getByTestId('link-param')).toHaveText('Read the terms.');
    expect(await storedLocale(page)).toBeNull();
    await page.reload();
    await expect(page.getByTestId('locale')).toHaveText('en');
    expect(warnings.filter((w) => /locale/i.test(w))).toEqual([]);
  });

  test('19 — A supported persisted locale is restored and kept', async ({ page }) => {
    await seedLocale(page, 'pt');
    await page.goto(FIXTURE + '?persist=1&strictLocale=1');
    await expect(page.getByTestId('locale')).toHaveText('pt');
    expect(await storedLocale(page)).toBe('pt');
  });

  test('20 — Switching locale after an ignored value persists the new choice', async ({ page }) => {
    await seedLocale(page, 'fr');
    await page.goto(FIXTURE + '?persist=1&strictLocale=1');
    await expect(page.getByTestId('locale')).toHaveText('en');
    await page.getByTestId('to-pt').click();
    await expect(page.getByTestId('locale')).toHaveText('pt');
    expect(await storedLocale(page)).toBe('pt');
    await page.reload();
    await expect(page.getByTestId('locale')).toHaveText('pt');
  });
});
