import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Multi-store expressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/multi-store/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"name":"Cris"}' }),
    );
    await page.goto('/e2e/examples/store-multi-notify.html');
    await expect(page.getByTestId('mode')).toHaveText('view');
  });

  async function expectApplied(page, user: string) {
    await expect(page.getByTestId('user')).toHaveText(user);
    await expect(page.getByTestId('mode')).toHaveText('editing');
    await expect(page.getByTestId('label')).toHaveText('Editing');
    await expect(page.getByTestId('label')).toHaveClass(/editing/);
    await expect(page.getByTestId('shown')).toBeVisible();
    await expect(page.getByTestId('mixed')).toHaveText(`${user}|editing`);
  }

  test('1 — on:click writing two stores updates both', async ({ page }) => {
    await page.getByTestId('click-two').click();
    await expectApplied(page, 'Ana');
  });

  test('2 — store order does not matter', async ({ page }) => {
    await page.getByTestId('click-two-reversed').click();
    await expectApplied(page, 'Bia');
  });

  test('3 — a binding reading two stores follows a write to the second', async ({ page }) => {
    await page.getByTestId('click-two').click();
    await page.getByTestId('reset').click();
    await expect(page.getByTestId('mixed')).toHaveText('null|view');
    await page.evaluate(() => { (window as any).NoJS.store.auth.user = 'Dan'; });
    await page.getByTestId('click-ui').click();
    await expect(page.getByTestId('mixed')).toHaveText('Dan|editing');
  });

  test('4 — then= after a GET writing two stores updates both', async ({ page }) => {
    await page.getByTestId('load').click();
    await expectApplied(page, 'Cris');
  });

  test('5 — writes before a throwing statement reach the DOM', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
    await page.getByTestId('throw').click();
    await expect(page.getByTestId('count')).toHaveText('2');
    await expect(page.getByTestId('mode')).toHaveText('editing');
    expect(warnings.some((w) => w.includes('boom is not defined'))).toBe(true);
  });

  test('6 — has no serious accessibility violations', async ({ page }) => {
    await page.getByTestId('click-two').click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });
});
