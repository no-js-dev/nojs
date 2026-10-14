import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/compat-jsonld.html';
const MANAGED = 'script[type="application/ld+json"][data-nojs]';

// Load one scenario and return the raw text of the managed JSON-LD script.
async function emitted(page: Page, query: string, hash = ''): Promise<string> {
  await page.goto(`${FIXTURE}${query}${hash}`);
  const script = page.locator(MANAGED);
  await expect(script).toHaveCount(1);
  return script.evaluate((el) => el.textContent || '');
}

test.describe('page-jsonld — raw (unquoted) placeholders keep v1.21.1 output', () => {
  let errors: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
  });

  test.afterEach(() => {
    expect(errors).toEqual([]);
  });

  test('1 — Raw object fragment is emitted verbatim and parses as JSON', async ({ page }) => {
    const text = await emitted(page, '?s=raw-object');
    expect(text).toBe(
      '{"@context":"https://schema.org","@type":"Product","offers":{"price":5,"priceCurrency":"USD"}}',
    );
    expect(JSON.parse(text)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      offers: { price: 5, priceCurrency: 'USD' },
    });
  });

  test('2 — Raw array fragment with escaped strings parses as JSON', async ({ page }) => {
    const text = await emitted(page, '?s=raw-array');
    expect(JSON.parse(text)).toEqual({
      '@type': 'Product',
      offers: [
        { '@type': 'Offer', name: 'A "B"' },
        { '@type': 'Offer', price: '1.00' },
      ],
    });
  });

  test('3 — Raw numbers and booleans are unchanged', async ({ page }) => {
    const text = await emitted(page, '?s=raw-scalars');
    expect(text).toBe('{"price":5.5,"count":0,"inStock":true,"used":false}');
    expect(JSON.parse(text)).toEqual({ price: 5.5, count: 0, inStock: true, used: false });
  });

  test('4 — Raw placeholder re-renders reactively', async ({ page }) => {
    let text = await emitted(page, '?s=reactive');
    expect(JSON.parse(text)).toEqual({ '@type': 'Offer', price: 1 });
    await page.getByTestId('inc').click();
    await expect(page.getByTestId('price')).toHaveText('2');
    text = await page.locator(MANAGED).evaluate((el) => el.textContent || '');
    expect(text).toBe('{"@type":"Offer","price":2}');
  });
});

test.describe('page-jsonld — quoted placeholders stay valid JSON', () => {
  test('5 — Quoted values containing a quote, a backslash and a newline parse as JSON', async ({ page }) => {
    const text = await emitted(page, '?s=quoted');
    expect(JSON.parse(text)).toEqual({
      name: '27" \\ Monitor\nPro',
      description: 'Buy the 27" \\ Monitor\nPro today',
    });
  });

  test('6 — Pretty-printed template mixing raw and quoted placeholders parses as JSON', async ({ page }) => {
    const text = await emitted(page, '?s=mixed');
    expect(JSON.parse(text)).toEqual({
      name: 'say "hi"',
      note: 'escaped "quotes" in the template',
      offers: { price: 5 },
      position: 3,
    });
  });
});

test.describe('page-jsonld — values cannot terminate the script element', () => {
  test('7 — A raw fragment containing </script> stays inside the script element', async ({ page }) => {
    const text = await emitted(page, '?s=raw-script');
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({
      '@type': 'Thing',
      data: { n: '</script><b data-test="pwned-raw">x</b>' },
    });
    await expect(page.getByTestId('pwned-raw')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('8 — A quoted value containing a quote and </script> stays inside the script element', async ({ page }) => {
    const text = await emitted(page, '?s=quoted-script');
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({
      '@type': 'Thing',
      name: 'a"</script><b data-test="pwned-quoted">x</b>',
    });
    await expect(page.getByTestId('pwned-quoted')).toHaveCount(0);
  });
});

test.describe('page-jsonld — route template (router path)', () => {
  test('9 — Route page-jsonld emits raw params/fragments verbatim and escapes quoted values', async ({ page }) => {
    const text = await emitted(page, '', '#/product/7');
    await expect(page.getByTestId('page-product')).toBeVisible();
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({
      '@type': 'Product',
      position: 7,
      offers: [{ '@type': 'Offer', price: '9.99', name: '</script><i data-test="pwned-route">x</i>' }],
      name: 'Route "quoted" \\ name',
    });
    await expect(page.getByTestId('pwned-route')).toHaveCount(0);
  });

  test('10 — Navigating to the route via a link emits the same JSON-LD', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('page-home')).toBeVisible();
    await expect(page.locator(MANAGED)).toHaveCount(0);
    await page.getByTestId('nav-product').click();
    await expect(page.getByTestId('page-product')).toBeVisible();
    const text = await page.locator(MANAGED).evaluate((el) => el.textContent || '');
    expect(JSON.parse(text).position).toBe(7);
    expect(JSON.parse(text).offers[0].price).toBe('9.99');
  });
});

test.describe('page-jsonld — accessibility', () => {
  test('11 — No critical or serious accessibility violations (axe)', async ({ page }) => {
    await page.goto(`${FIXTURE}?s=raw-object`);
    await expect(page.getByTestId('raw-object-value')).toHaveText('{"price":5,"priceCurrency":"USD"}');
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

test.describe('page-jsonld — v1.21.1 parity and strictJsonld', () => {
  const TPL_OUT = '{"name":"Say \\"hi\\"","sameAs":["https://a.example","https://b.example"]}';

  test('12 — Default: values pre-escaped for v1.21.1 and list.join keep the v1.21.1 bytes', async ({ page }) => {
    const text = await emitted(page, '?s=pre-escaped');
    expect(text).toBe(TPL_OUT);
    expect(JSON.parse(text)).toEqual({
      name: 'Say "hi"',
      sameAs: ['https://a.example', 'https://b.example'],
    });
  });

  test('13 — strictJsonld: quoted values are always escaped as data', async ({ page }) => {
    const text = await emitted(page, '?s=pre-escaped&strict=1');
    expect(JSON.parse(text)).toEqual({
      name: 'Say \\"hi\\"',
      sameAs: ['https://a.example","https://b.example'],
    });
  });

  test('14 — strictJsonld: raw fragments are still emitted verbatim', async ({ page }) => {
    const text = await emitted(page, '?s=raw-object&strict=1');
    expect(text).toBe(
      '{"@context":"https://schema.org","@type":"Product","offers":{"price":5,"priceCurrency":"USD"}}',
    );
  });
});
