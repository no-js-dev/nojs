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

test.describe('page-jsonld — quoted values that make the output invalid JSON', () => {
  test('5 — Default: quoted values with a quote, a backslash and a newline keep the v1.21.1 bytes', async ({ page }) => {
    const text = await emitted(page, '?s=quoted');
    expect(text).toBe('{"name":"27" \\ Monitor\nPro","description":"Buy the 27" \\ Monitor\nPro today"}');
    expect(() => JSON.parse(text)).toThrow();
  });

  test('19 — strictJsonld: the same quoted values are escaped and parse as JSON', async ({ page }) => {
    const text = await emitted(page, '?s=quoted&strict=1');
    expect(JSON.parse(text)).toEqual({
      name: '27" \\ Monitor\nPro',
      description: 'Buy the 27" \\ Monitor\nPro today',
    });
  });

  test('6 — Default: a pretty-printed template with an unescaped quoted value keeps the v1.21.1 bytes', async ({ page }) => {
    const text = await emitted(page, '?s=mixed');
    expect(text).toContain('"name": "say "hi"",');
    expect(text).toContain('"offers": {"price":5},');
    expect(() => JSON.parse(text)).toThrow();
  });

  test('20 — strictJsonld: a pretty-printed template mixing raw and quoted placeholders parses as JSON', async ({ page }) => {
    const text = await emitted(page, '?s=mixed&strict=1');
    expect(JSON.parse(text)).toEqual({
      name: 'say "hi"',
      note: 'escaped "quotes" in the template',
      offers: { price: 5 },
      position: 3,
    });
  });
});

test.describe('page-jsonld — values cannot terminate the script element', () => {
  test('7 — Default: a raw fragment containing </script> keeps the v1.21.1 output', async ({ page }) => {
    const text = await emitted(page, '?s=raw-script');
    expect(text).toBe('{"@type":"Thing","data":{"n":"<\\/script><b data-test=\\"pwned-raw\\">x<\\/b>"}}');
    expect(text).not.toContain('</');
    expect(JSON.parse(text)).toEqual({
      '@type': 'Thing',
      data: { n: '</script><b data-test="pwned-raw">x</b>' },
    });
    await expect(page.getByTestId('pwned-raw')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('8 — Default: a quoted value containing a quote and </script> keeps the v1.21.1 bytes and stays inside the script element', async ({ page }) => {
    const text = await emitted(page, '?s=quoted-script');
    expect(text).toBe('{"@type":"Thing","name":"a"<\\/script><b data-test="pwned-quoted">x<\\/b>"}');
    expect(text).not.toContain('</');
    await expect(page.getByTestId('pwned-quoted')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('15 — strictJsonld: "<" in raw and quoted values is escaped as \\u003c', async ({ page }) => {
    for (const s of ['raw-script', 'quoted-script']) {
      const text = await emitted(page, `?s=${s}&strict=1`);
      expect(text).not.toContain('<');
      expect(JSON.stringify(JSON.parse(text))).toContain('</script>');
    }
    const quoted = await emitted(page, '?s=quoted-script&strict=1');
    expect(JSON.parse(quoted)).toEqual({
      '@type': 'Thing',
      name: 'a"</script><b data-test="pwned-quoted">x</b>',
    });
    await expect(page.getByTestId('pwned-quoted')).toHaveCount(0);
  });
});

test.describe('page-jsonld — route template (router path)', () => {
  // v1.21.1 output of the route template: raw params/fragments verbatim, the
  // quoted name unescaped (invalid JSON), "</" written as "<\/".
  const ROUTE_V1211 =
    '{"@type":"Product","position":7,"offers":[{"@type":"Offer","price":"9.99","name":"<\\/script><i data-test=\\"pwned-route\\">x<\\/i>"}],"name":"Route "quoted" \\ name"}';

  test('9 — Default: route page-jsonld keeps the v1.21.1 bytes', async ({ page }) => {
    const text = await emitted(page, '', '#/product/7');
    await expect(page.getByTestId('page-product')).toBeVisible();
    expect(text).toBe(ROUTE_V1211);
    expect(text).not.toContain('</');
    await expect(page.getByTestId('pwned-route')).toHaveCount(0);
  });

  test('16 — strictJsonld: route page-jsonld escapes quoted values and contains no "<"', async ({ page }) => {
    const text = await emitted(page, '?strict=1', '#/product/7');
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
    expect(text).toBe(ROUTE_V1211);
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

  test('17 — Default: a quoted value can still inject a property, exactly as on v1.21.1', async ({ page }) => {
    const text = await emitted(page, '?s=inject');
    expect(text).toBe('{"@type":"SearchResultsPage","name":"x","@type":"Organization"}');
    expect(JSON.parse(text)['@type']).toBe('Organization');
  });

  test('18 — strictJsonld: a quoted value cannot inject a property', async ({ page }) => {
    const text = await emitted(page, '?s=inject&strict=1');
    expect(JSON.parse(text)).toEqual({
      '@type': 'SearchResultsPage',
      name: 'x","@type":"Organization',
    });
  });

  test('14 — strictJsonld: raw fragments are still emitted verbatim', async ({ page }) => {
    const text = await emitted(page, '?s=raw-object&strict=1');
    expect(text).toBe(
      '{"@context":"https://schema.org","@type":"Product","offers":{"price":5,"priceCurrency":"USD"}}',
    );
  });
});
