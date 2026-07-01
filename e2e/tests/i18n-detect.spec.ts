import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/i18n-detect.html';

/**
 * Override navigator.language / navigator.languages BEFORE any page script
 * runs, so NoJS.i18n({ detectBrowser: true }) reads the spoofed value at
 * config time. Optionally seed a persisted `nojs-locale` to prove precedence.
 */
async function primeBrowser(
  page: Page,
  language: string,
  persistedLocale?: string,
): Promise<void> {
  await page.addInitScript(
    ([lang, persisted]) => {
      Object.defineProperty(navigator, 'language', {
        configurable: true,
        get: () => lang,
      });
      Object.defineProperty(navigator, 'languages', {
        configurable: true,
        get: () => [lang, String(lang).split('-')[0]],
      });
      try {
        localStorage.removeItem('nojs-locale');
        if (persisted) localStorage.setItem('nojs-locale', persisted);
      } catch (_) {
        /* storage may be unavailable in some contexts */
      }
    },
    [language, persistedLocale ?? ''] as const,
  );
}

test.describe('i18n — first-visit browser language detection', () => {
  test('1 — adopts supported non-default locale from navigator.language (pt-BR → pt)', async ({
    page,
  }) => {
    await primeBrowser(page, 'pt-BR');
    await page.goto(FIXTURE);

    // Region locale pt-BR is not in supportedLocales, but its prefix `pt` is,
    // so detection adopts `pt` and lazily loads the pt bundle.
    await expect(page.getByTestId('resolved-locale')).toHaveText('pt');
    await expect(page.getByTestId('welcome-text')).toHaveText('Bem-vindo');

    const activeLocale = await page.evaluate(() => (window as any).NoJS.locale);
    expect(activeLocale).toBe('pt');
  });

  test('2 — adopts an exact supported locale (it → it)', async ({ page }) => {
    await primeBrowser(page, 'it');
    await page.goto(FIXTURE);

    await expect(page.getByTestId('resolved-locale')).toHaveText('it');
    await expect(page.getByTestId('welcome-text')).toHaveText('Benvenuto');
  });

  test('3 — persisted nojs-locale wins over detection on reload', async ({
    page,
  }) => {
    // Browser prefers pt, but a prior visit persisted `es`. Persistence must win.
    await primeBrowser(page, 'pt-BR', 'es');
    await page.goto(FIXTURE);

    await expect(page.getByTestId('resolved-locale')).toHaveText('es');
    await expect(page.getByTestId('welcome-text')).toHaveText('Bienvenido');

    // Reload: still the persisted locale, detection never overrides it.
    await page.reload();
    await expect(page.getByTestId('resolved-locale')).toHaveText('es');
    await expect(page.getByTestId('welcome-text')).toHaveText('Bienvenido');
  });

  test('4 — unsupported navigator.language falls back to defaultLocale (de-DE → en)', async ({
    page,
  }) => {
    await primeBrowser(page, 'de-DE');
    await page.goto(FIXTURE);

    await expect(page.getByTestId('resolved-locale')).toHaveText('en');
    await expect(page.getByTestId('welcome-text')).toHaveText('Welcome');
  });

  test('5 — no accessibility violations (axe)', async ({ page }) => {
    await primeBrowser(page, 'pt-BR');
    await page.goto(FIXTURE);
    await expect(page.getByTestId('welcome-text')).toHaveText('Bem-vindo');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
