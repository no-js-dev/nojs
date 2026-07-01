import { test, expect } from '@playwright/test';

// Docs-site language selector + Tools "More" menu, rebuilt on the
// NoJS-Elements dropdown family (NOJS-199 / PR #208).
//
// Fixture: e2e/examples/lang-selector.html — self-contained, mirrors the
// docs nav markup (desktop .lang-select dropdown, mobile .lang-pills row,
// Tools dropdown) and loads NoJS core + Elements from the local test server.

const FIXTURE = '/e2e/examples/lang-selector.html';

const TOOL_LINKS = {
  'tools-elements': 'https://github.com/no-js-dev/nojs-elements',
  'tools-lsp': 'https://github.com/no-js-dev/nojs-lsp',
  'tools-skill': 'https://github.com/no-js-dev/nojs-skill',
};

// ─── Desktop ──────────────────────────────────────────────────────────
test.describe('Language selector — desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    // Wait for i18n hydration (toggle reflects the active locale code).
    await expect(page.getByTestId('lang-current')).toHaveText('EN');
  });

  test('1 — Desktop dropdown is used; mobile pills are hidden', async ({ page }) => {
    await expect(page.getByTestId('lang-toggle')).toBeVisible();
    await expect(page.getByTestId('lang-pills')).toBeHidden();
    await expect(page.getByTestId('hamburger')).toBeHidden();
  });

  test('2 — Menu is closed initially and opens on toggle click', async ({ page }) => {
    await expect(page.getByTestId('lang-menu')).toBeHidden();
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-menu')).toBeVisible();
  });

  test('3 — Selecting a locale updates the toggle label and closes the menu', async ({ page }) => {
    await page.getByTestId('lang-toggle').click();
    await page.getByTestId('lang-opt-es').click();

    // Close-on-select (provided by the Elements dropdown).
    await expect(page.getByTestId('lang-menu')).toBeHidden();
    // Toggle reflects the new locale.
    await expect(page.getByTestId('lang-current')).toHaveText('ES');
    // Nav content is re-translated.
    await expect(page.getByTestId('nav-home')).toHaveText('Inicio');
  });

  test('4 — Active state marks exactly the current locale', async ({ page }) => {
    await page.getByTestId('lang-toggle').click();
    await page.getByTestId('lang-opt-pt').click();
    await expect(page.getByTestId('lang-current')).toHaveText('PT');

    // Reopen and inspect active markers.
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-opt-pt')).toHaveClass(/active/);
    await expect(page.getByTestId('lang-opt-en')).not.toHaveClass(/active/);
    await expect(page.getByTestId('lang-opt-es')).not.toHaveClass(/active/);
  });

  test('5 — Switches across all five locales', async ({ page }) => {
    const cases: Array<[string, string, string]> = [
      ['lang-opt-es', 'ES', 'Inicio'],
      ['lang-opt-pt', 'PT', 'Início'],
      ['lang-opt-it', 'IT', 'Inizio'],
      ['lang-opt-fr', 'FR', 'Accueil'],
      ['lang-opt-en', 'EN', 'Home'],
    ];
    for (const [opt, code, home] of cases) {
      await page.getByTestId('lang-toggle').click();
      await page.getByTestId(opt).click();
      await expect(page.getByTestId('lang-current')).toHaveText(code);
      await expect(page.getByTestId('nav-home')).toHaveText(home);
    }
  });

  test('6 — Menu closes on outside click', async ({ page }) => {
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-menu')).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(page.getByTestId('lang-menu')).toBeHidden();
  });

  test('7 — Menu closes on Escape and returns focus to the toggle', async ({ page }) => {
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('lang-menu')).toBeHidden();
    await expect(page.getByTestId('lang-toggle')).toBeFocused();
  });

  test('8 — Keyboard: toggle opens the menu via Enter', async ({ page }) => {
    await page.getByTestId('lang-toggle').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('lang-menu')).toBeVisible();
  });

  test('9 — Toggle exposes ARIA and the menu exposes menu semantics', async ({ page }) => {
    const toggle = page.getByTestId('lang-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('lang-menu')).toHaveAttribute('role', 'menu');
  });
});

// ─── Tools "More" dropdown ────────────────────────────────────────────
test.describe('Tools menu — desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('lang-current')).toHaveText('EN');
  });

  test('10 — Opens on click and lists three external tool links', async ({ page }) => {
    await expect(page.getByTestId('tools-menu')).toBeHidden();
    await page.getByTestId('tools-toggle').click();
    await expect(page.getByTestId('tools-menu')).toBeVisible();

    for (const [testId, href] of Object.entries(TOOL_LINKS)) {
      const link = page.getByTestId(testId);
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  test('11 — Closes on Escape', async ({ page }) => {
    await page.getByTestId('tools-toggle').click();
    await expect(page.getByTestId('tools-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tools-menu')).toBeHidden();
  });

  test('12 — Tools labels and descriptions are localized', async ({ page }) => {
    await page.getByTestId('tools-toggle').click();
    await expect(page.getByTestId('tools-toggle')).toContainText('More');
    await expect(page.getByTestId('tools-elements')).toContainText('Drag, drop & validation');

    // Switch to Spanish and re-check.
    await page.keyboard.press('Escape');
    await page.getByTestId('lang-toggle').click();
    await page.getByTestId('lang-opt-es').click();

    await page.getByTestId('tools-toggle').click();
    await expect(page.getByTestId('tools-toggle')).toContainText('Más');
    await expect(page.getByTestId('tools-elements')).toContainText('Drag, drop y validación');
  });

  test('13 — Tools and language menus are mutually exclusive', async ({ page }) => {
    await page.getByTestId('tools-toggle').click();
    await expect(page.getByTestId('tools-menu')).toBeVisible();

    // Opening the language menu light-dismisses the Tools popover.
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-menu')).toBeVisible();
    await expect(page.getByTestId('tools-menu')).toBeHidden();
  });
});

// ─── Mobile ───────────────────────────────────────────────────────────
test.describe('Language selector — mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('pill-en')).toHaveClass(/active/);
  });

  test('14 — Hamburger shows; desktop dropdown hidden; pills in the drawer', async ({ page }) => {
    await expect(page.getByTestId('hamburger')).toBeVisible();
    await expect(page.getByTestId('lang-toggle')).toBeHidden();

    // Drawer starts collapsed, pills become visible once it opens.
    await expect(page.getByTestId('lang-pills')).toBeHidden();
    await page.getByTestId('hamburger').click();
    await expect(page.getByTestId('drawer')).toHaveClass(/open/);
    await expect(page.getByTestId('lang-pills')).toBeVisible();
  });

  test('15 — Tapping a pill switches locale and closes the drawer', async ({ page }) => {
    await page.getByTestId('hamburger').click();
    await page.getByTestId('pill-pt').click();

    // Drawer closes on selection.
    await expect(page.getByTestId('drawer')).not.toHaveClass(/open/);

    // Reopen to confirm the locale switched and the active pill moved.
    await page.getByTestId('hamburger').click();
    await expect(page.getByTestId('pill-pt')).toHaveClass(/active/);
    await expect(page.getByTestId('pill-en')).not.toHaveClass(/active/);
    await expect(page.getByTestId('nav-home')).toHaveText('Início');
  });

  test('16 — Tools dropdown works inside the mobile drawer', async ({ page }) => {
    await page.getByTestId('hamburger').click();
    await page.getByTestId('tools-toggle').click();
    await expect(page.getByTestId('tools-menu')).toBeVisible();
    await expect(page.getByTestId('tools-lsp')).toHaveAttribute(
      'href',
      'https://github.com/no-js-dev/nojs-lsp'
    );
  });
});
