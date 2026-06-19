import { test, expect } from '@playwright/test';

test.describe('$i18n proxy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/i18n-proxy.html');
  });

  test('1 — Sidebar pattern: foreach with $i18n array renders items', async ({ page }) => {
    const items = page.getByTestId('sidebar-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('Home');
    await expect(items.nth(1)).toHaveText('Docs');
    await expect(items.nth(2)).toHaveText('API');
  });

  test('2 — Direct bind with $i18n resolves translation', async ({ page }) => {
    await expect(page.getByTestId('direct-bind')).toHaveText('Save');
  });

  test('3 — Nested path resolution via $i18n.nav.footer.copyright', async ({ page }) => {
    await expect(page.getByTestId('nested-path')).toHaveText('2026 NoJS');
  });

  test('4 — Locale switch: all $i18n bindings update when locale changes', async ({ page }) => {
    await expect(page.getByTestId('locale-switch-text')).toHaveText('Save');

    await page.getByTestId('lang-pt').click();
    await expect(page.getByTestId('locale-switch-text')).toHaveText('Salvar');

    // Sidebar items also update
    const items = page.getByTestId('sidebar-item');
    await expect(items.nth(0)).toHaveText('Inicio');
    await expect(items.nth(1)).toHaveText('Documentacao');

    // Switch back to English
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('locale-switch-text')).toHaveText('Save');
    await expect(items.nth(0)).toHaveText('Home');
  });

  test('5 — Mixed: $i18n.key alongside $i18n.t() interpolation', async ({ page }) => {
    await expect(page.getByTestId('mixed-proxy')).toHaveText('Save');
    await expect(page.getByTestId('mixed-t')).toHaveText('Hello, Alice!');
  });

  test('6 — Conditional: show with $i18n truthy key', async ({ page }) => {
    await expect(page.getByTestId('show-i18n')).toBeVisible();
  });
});
