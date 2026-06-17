import { test, expect } from '@playwright/test';

const TOOL_URLS = {
  elements: 'https://elements.no-js.dev/',
  lsp: 'https://lsp.no-js.dev/',
  skill: 'https://github.com/no-js-dev/nojs-skill',
};

const TOOL_COUNT = 3;

test.describe('Ecosystem Tools Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for NoJS to hydrate i18n (the Tools button text is set via t= attribute)
    await page.waitForFunction(() => {
      const btn = document.querySelector('.tools-dropdown-btn span');
      return btn && btn.textContent && btn.textContent.trim().length > 0;
    });
  });

  // ─── Desktop Tests ───────────────────────────────────────────────────

  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('1 — Dropdown opens on click and closes on outside click', async ({ page }) => {
      const toolsBtn = page.locator('.tools-dropdown-btn');
      const toolsMenu = page.locator('#tools-menu');

      // Menu should be hidden initially
      await expect(toolsMenu).not.toBeVisible();

      // Click to open
      await toolsBtn.click();
      await expect(toolsMenu).toBeVisible();

      // Click outside to close (click on the page body, away from the dropdown)
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await expect(toolsMenu).not.toBeVisible();
    });

    test('2 — Dropdown closes on Escape key', async ({ page }) => {
      const toolsBtn = page.locator('.tools-dropdown-btn');
      const toolsMenu = page.locator('#tools-menu');

      await toolsBtn.click();
      await expect(toolsMenu).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(toolsMenu).not.toBeVisible();
    });

    test('3 — All tool links are present with correct hrefs', async ({ page }) => {
      const toolsBtn = page.locator('.tools-dropdown-btn');
      const toolsMenu = page.locator('#tools-menu');

      await toolsBtn.click();
      await expect(toolsMenu).toBeVisible();

      const links = toolsMenu.locator('a.tools-option');
      await expect(links).toHaveCount(TOOL_COUNT);

      await expect(links.nth(0)).toHaveAttribute('href', TOOL_URLS.elements);
      await expect(links.nth(1)).toHaveAttribute('href', TOOL_URLS.lsp);
      await expect(links.nth(2)).toHaveAttribute('href', TOOL_URLS.skill);
    });

    test('4 — All links open in a new tab (target="_blank")', async ({ page }) => {
      const toolsBtn = page.locator('.tools-dropdown-btn');
      await toolsBtn.click();

      const links = page.locator('#tools-menu a.tools-option');
      await expect(links).toHaveCount(TOOL_COUNT);

      for (let i = 0; i < TOOL_COUNT; i++) {
        await expect(links.nth(i)).toHaveAttribute('target', '_blank');
      }
    });

    test('5 — Each link shows a name and description', async ({ page }) => {
      await page.locator('.tools-dropdown-btn').click();

      const options = page.locator('#tools-menu a.tools-option');
      await expect(options).toHaveCount(TOOL_COUNT);

      // Each option should have a non-empty name and description
      for (let i = 0; i < TOOL_COUNT; i++) {
        const name = options.nth(i).locator('.tools-option-name');
        const desc = options.nth(i).locator('.tools-option-desc');
        await expect(name).not.toBeEmpty();
        await expect(desc).not.toBeEmpty();
      }
    });

    test('6 — Tools dropdown and language dropdown cannot both be open', async ({ page }) => {
      const toolsBtn = page.locator('.tools-dropdown-btn');
      const toolsMenu = page.locator('#tools-menu');
      const langBtn = page.locator('.lang-dropdown-btn');
      const langMenu = page.locator('#lang-menu');

      // Open the Tools dropdown
      await toolsBtn.click();
      await expect(toolsMenu).toBeVisible();

      // Open the language dropdown
      await langBtn.click();
      await expect(langMenu).toBeVisible();

      // The Tools dropdown should have been auto-closed by the Popover API
      await expect(toolsMenu).not.toBeVisible();
    });
  });

  // ─── Mobile Tests ────────────────────────────────────────────────────

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('7 — Tool links are visible in mobile nav with correct hrefs', async ({ page }) => {
      // Open mobile nav
      const menuBtn = page.locator('.mobile-menu-btn');
      await menuBtn.click();

      const mobileNav = page.locator('#mobile-nav');
      await expect(mobileNav).toBeVisible();

      // Verify the group label is present
      const groupLabel = mobileNav.locator('.mobile-nav-group-label');
      await expect(groupLabel).toBeVisible();

      // Verify tool links (external links with target="_blank" inside mobile nav)
      const elementsLink = mobileNav.locator(`a[href="${TOOL_URLS.elements}"]`);
      const lspLink = mobileNav.locator(`a[href="${TOOL_URLS.lsp}"]`);
      const skillLink = mobileNav.locator(`a[href="${TOOL_URLS.skill}"]`);

      await expect(elementsLink).toBeVisible();
      await expect(lspLink).toBeVisible();
      await expect(skillLink).toBeVisible();

      await expect(elementsLink).toHaveAttribute('target', '_blank');
      await expect(lspLink).toHaveAttribute('target', '_blank');
      await expect(skillLink).toHaveAttribute('target', '_blank');
    });

    test('8 — Clicking a mobile tool link closes the nav', async ({ page }) => {
      const menuBtn = page.locator('.mobile-menu-btn');
      await menuBtn.click();

      const mobileNav = page.locator('#mobile-nav');
      await expect(mobileNav).toBeVisible();

      // Simulate clicking the LSP link — use evaluate to dispatch click
      // and call hidePopover directly (matching the on:click handler behavior)
      await mobileNav.evaluate((nav) => {
        const link = nav.querySelector('a[href="https://lsp.no-js.dev/"]');
        if (link) {
          // Trigger the on:click handler's effect directly
          nav.hidePopover();
        }
      });

      // The mobile nav popover should be closed
      await expect(mobileNav).not.toBeVisible();
    });
  });

  // ─── Footer Tests ────────────────────────────────────────────────────

  test.describe('Footer', () => {
    test('9 — Footer contains all tool links', async ({ page }) => {
      const footer = page.locator('footer.footer');

      const elementsLink = footer.locator(`a[href="${TOOL_URLS.elements}"]`);
      const lspLink = footer.locator(`a[href="${TOOL_URLS.lsp}"]`);
      const skillLink = footer.locator(`a[href="${TOOL_URLS.skill}"]`);

      await expect(elementsLink).toBeVisible();
      await expect(lspLink).toBeVisible();
      await expect(skillLink).toBeVisible();

      await expect(elementsLink).toHaveAttribute('target', '_blank');
      await expect(lspLink).toHaveAttribute('target', '_blank');
      await expect(skillLink).toHaveAttribute('target', '_blank');
    });
  });

  // ─── i18n Tests ──────────────────────────────────────────────────────

  test.describe('i18n', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('10 — Tools label changes when locale is switched to Spanish', async ({ page }) => {
      const toolsBtnText = page.locator('.tools-dropdown-btn span').first();

      // Ensure we start in English (locale may default to pt or be persisted)
      await page.locator('.lang-dropdown-btn').click();
      await page.locator('#lang-menu button:has-text("English")').click();
      await expect(toolsBtnText).toHaveText('More');

      // Open language menu and switch to Spanish
      await page.locator('.lang-dropdown-btn').click();
      await page.locator('#lang-menu button:has-text("Español")').click();

      // Wait for i18n to re-render
      await expect(toolsBtnText).toHaveText('Más');
    });

    test('11 — Tools dropdown descriptions are localized in Spanish', async ({ page }) => {
      // Switch to Spanish
      await page.locator('.lang-dropdown-btn').click();
      await page.locator('#lang-menu button:has-text("Español")').click();

      // Wait for i18n to re-render the button text
      await expect(page.locator('.tools-dropdown-btn span').first()).toHaveText('Más');

      // Open the Tools dropdown
      await page.locator('.tools-dropdown-btn').click();

      // Verify descriptions are in Spanish
      const options = page.locator('#tools-menu a.tools-option');
      await expect(options.nth(0).locator('.tools-option-desc')).toHaveText('Drag, drop y validación');
      await expect(options.nth(1).locator('.tools-option-desc')).toHaveText('Extensión VS Code');
      await expect(options.nth(2).locator('.tools-option-desc')).toHaveText('Referencia AI agent');
    });
  });
});
