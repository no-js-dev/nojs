import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const URL = '/e2e/examples/compat-persist.html';
const EMPTY_WARNING =
  'persist-fields is empty: all fields will be persisted. List the fields to persist or remove the attribute.';

function stored(page: Page, storage: 'localStorage' | 'sessionStorage', key: string) {
  return page.evaluate(
    ([s, k]) => window[s as 'localStorage' | 'sessionStorage'].getItem('nojs_state_' + k),
    [storage, key],
  );
}

test.describe('Persist compatibility with v1.21.1', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/cp-items', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[1,2,3]' }));
    await page.goto(URL);
    await expect(page.getByTestId('empty-a')).toHaveText('1');
  });

  test('1 — persist-fields="" persists all fields to localStorage and restores them', async ({ page }) => {
    await page.getByTestId('empty-set').click();
    await expect(page.getByTestId('empty-a')).toHaveText('5');
    expect(await stored(page, 'localStorage', 'cp-empty')).toBe('{"a":5,"b":2}');

    await page.reload();
    await expect(page.getByTestId('empty-a')).toHaveText('5');
    await expect(page.getByTestId('empty-b')).toHaveText('2');
    expect(await stored(page, 'localStorage', 'cp-empty')).toBe('{"a":5,"b":2}');
  });

  test('2 — bare persist-fields persists all fields to localStorage and restores them', async ({ page }) => {
    await page.getByTestId('bare-set').click();
    await expect(page.getByTestId('bare-a')).toHaveText('5');
    expect(await stored(page, 'localStorage', 'cp-bare')).toBe('{"a":5,"b":2}');

    await page.reload();
    await expect(page.getByTestId('bare-a')).toHaveText('5');
    await expect(page.getByTestId('bare-b')).toHaveText('2');
  });

  test('3 — explicit persist-fields persists and restores only the listed field', async ({ page }) => {
    await page.getByTestId('explicit-set').click();
    await expect(page.getByTestId('explicit-a')).toHaveText('5');
    await expect(page.getByTestId('explicit-b')).toHaveText('9');
    expect(await stored(page, 'localStorage', 'cp-explicit')).toBe('{"a":5}');

    await page.reload();
    await expect(page.getByTestId('explicit-a')).toHaveText('5');
    await expect(page.getByTestId('explicit-b')).toHaveText('2');
  });

  test('4 — persist-fields="" persists all fields to sessionStorage and restores them', async ({ page }) => {
    await page.getByTestId('session-empty-set').click();
    expect(await stored(page, 'sessionStorage', 'cp-session-empty')).toBe('{"a":5,"b":2}');

    await page.reload();
    await expect(page.getByTestId('session-empty-a')).toHaveText('5');
    await expect(page.getByTestId('session-empty-b')).toHaveText('2');
  });

  test('5 — explicit persist-fields with sessionStorage restores only the listed field', async ({ page }) => {
    await page.getByTestId('session-explicit-set').click();
    await expect(page.getByTestId('session-explicit-b')).toHaveText('7');
    expect(await stored(page, 'sessionStorage', 'cp-session-explicit')).toBe('{"b":7}');

    await page.reload();
    await expect(page.getByTestId('session-explicit-a')).toHaveText('1');
    await expect(page.getByTestId('session-explicit-b')).toHaveText('7');
  });

  test('6 — a declared $tab key is persisted and restored after reload', async ({ page }) => {
    await expect(page.getByTestId('dollar-tab')).toHaveText('0');
    await page.evaluate(() => {
      (document.getElementById('cp-dollar') as any).__ctx.$tab = 2;
    });
    await expect(page.getByTestId('dollar-tab')).toHaveText('2');
    expect(await stored(page, 'localStorage', 'cp-dollar')).toBe('{"$tab":2,"label":"tabs"}');

    await page.reload();
    await expect(page.getByTestId('dollar-tab')).toHaveText('2');
    await expect(page.getByTestId('dollar-label')).toHaveText('tabs');
  });

  test('7 — $ keys saved by an earlier session are restored, declared or not', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('nojs_state_cp-dollar', JSON.stringify({
      $tab: 3,
      label: 'saved',
      $extra: 'kept',
    })));
    await page.reload();
    await expect(page.getByTestId('dollar-tab')).toHaveText('3');
    await expect(page.getByTestId('dollar-label')).toHaveText('saved');
    const extra = await page.evaluate(() => (document.getElementById('cp-dollar') as any).__ctx.$extra);
    expect(extra).toBe('kept');
  });

  test('8 — model input with empty persist-fields restores every field', async ({ page }) => {
    await page.getByTestId('model-input').fill('Ada');
    await expect(page.getByTestId('model-name')).toHaveText('Ada');
    expect(JSON.parse((await stored(page, 'localStorage', 'cp-model')) || '{}')).toEqual({ name: 'Ada', note: 'draft' });

    await page.reload();
    await expect(page.getByTestId('model-input')).toHaveValue('Ada');
    await expect(page.getByTestId('model-name')).toHaveText('Ada');
    await expect(page.getByTestId('model-note')).toHaveText('draft');
  });

  test('9 — as="$items" keeps the persisted list on reload while offline', async ({ page }) => {
    await expect(page.getByTestId('items-count')).toHaveText('3');
    expect(JSON.parse((await stored(page, 'localStorage', 'cp-items')) || '{}')).toEqual({ page: 1, $items: [1, 2, 3] });

    await page.unroute('**/api/cp-items');
    await page.route('**/api/cp-items', (route) => route.abort());
    await page.reload();
    await expect(page.getByTestId('items-count')).toHaveText('3');
  });

  test('10 — empty persist-fields warns once per element and does not throw', async ({ page }) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') warnings.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.reload();
    await expect(page.getByTestId('empty-a')).toHaveText('1');
    await page.getByTestId('empty-set').click();
    await page.getByTestId('model-input').fill('x');
    await expect(page.getByTestId('model-name')).toHaveText('x');

    const empty = warnings.filter((w) => w.includes(EMPTY_WARNING));
    // Sections 1, 2, 4 and 7 have an empty persist-fields.
    expect(empty).toHaveLength(4);
    expect(errors).toEqual([]);
  });

  test('11 — accessibility: no critical or serious violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(serious).toEqual([]);
  });
});
