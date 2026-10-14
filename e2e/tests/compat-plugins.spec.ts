import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/compat-plugins.html';

// v1.21.1 plugin behavior: reactive-copy globals with $watch/$set/$notify,
// wildcard-named plugin directives, and dispose() unlocking config. The
// hardening is opt-in: { byRef: true } and strictDirectives.
test.describe('Plugin compatibility (v1.21.1 defaults)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('header-count')).toHaveText('0');
  });

  test('1 — a plugin global renders in every scope', async ({ page }) => {
    await expect(page.getByTestId('header-count')).toHaveText('0');
    await expect(page.getByTestId('sidebar-count')).toHaveText('0');
    await expect(page.getByTestId('local-count')).toHaveText('0');
  });

  test('2 — $cart.$set from a template updates every scope', async ({ page }) => {
    await page.getByTestId('add-btn').click();
    await expect(page.getByTestId('local-count')).toHaveText('1');
    await expect(page.getByTestId('header-count')).toHaveText('1');
    await expect(page.getByTestId('sidebar-count')).toHaveText('1');

    await page.getByTestId('add-btn').click();
    await expect(page.getByTestId('header-count')).toHaveText('2');
    await expect(page.getByTestId('sidebar-count')).toHaveText('2');
  });

  test('3 — plugin $watch fires on template writes; $notify is available', async ({ page }) => {
    await expect(page.getByTestId('has-notify')).toHaveText('function');
    await expect(page.getByTestId('watch-calls')).toHaveText('0');
    await page.getByTestId('add-btn').click();
    await expect(page.getByTestId('watch-calls')).toHaveText('1');
    await page.getByTestId('add-btn').click();
    await expect(page.getByTestId('watch-calls')).toHaveText('2');
  });

  test('4 — $set from plugin JavaScript updates every scope without notify()', async ({ page }) => {
    await page.getByTestId('js-set-btn').click();
    await expect(page.getByTestId('header-count')).toHaveText('100');
    await expect(page.getByTestId('sidebar-count')).toHaveText('100');
    await expect(page.getByTestId('local-count')).toHaveText('100');
    await expect(page.getByTestId('watch-calls')).toHaveText('1');
  });

  test('5 — default globals are copies: Date as string, methods dropped, constructor data kept', async ({ page }) => {
    await expect(page.getByTestId('profile-since')).toHaveText('2020-01-01T00:00:00.000Z');
    await expect(page.getByTestId('profile-greet')).toHaveText('undefined');
    await expect(page.getByTestId('profile-name')).toHaveText('Ada');
    await expect(page.getByTestId('profile-kind')).toHaveText('person');
  });

  test('6 — wildcard-named plugin directives run instead of the core handler', async ({ page }) => {
    await expect(page.getByTestId('directive-calls')).toHaveText('on:clickoutside,class-x,bind-chart');
    const menu = page.getByTestId('menu');
    await expect(menu).toHaveAttribute('data-x', 'custom');
    await expect(menu).toHaveAttribute('data-chart', 'pie');
    await expect(menu).not.toHaveClass(/(^|\s)x(\s|$)/);
    await expect(menu).not.toHaveAttribute('chart', /.*/);

    await expect(page.getByTestId('menu-open')).toHaveText('true');
    await page.getByTestId('outside-btn').click();
    await expect(page.getByTestId('menu-open')).toHaveText('false');
  });

  test('7 — byRef global keeps methods, Dates and Maps, and method calls update every scope', async ({ page }) => {
    await expect(page.getByTestId('session-user')).toHaveText('guest');
    await expect(page.getByTestId('session-year')).toHaveText('2021');
    await expect(page.getByTestId('session-roles')).toHaveText('2');
    await page.getByTestId('login-btn').click();
    await expect(page.getByTestId('session-user')).toHaveText('ada');
    await expect(page.getByTestId('session-user-2')).toHaveText('ada');
  });

  test('8 — dispose() → config(sanitizeHtml) → init() applies the new config', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const NoJS = (window as any).NoJS;
      const fn = (h: string) => h.replace(/em>/g, 'strong>');
      const markup = `<main><div state="{ h: '<em>hi</em>' }"><p id="out" bind-html="h"></p></div></main>`;
      NoJS.config({ sanitizeHtml: fn }); // locked while initialised
      await NoJS.dispose();
      NoJS.config({ sanitizeHtml: fn });
      document.body.innerHTML = markup;
      await NoJS.init();
      return {
        strong: document.querySelector('#out strong')?.textContent ?? null,
        em: !!document.querySelector('#out em'),
      };
    });
    expect(result).toEqual({ strong: 'hi', em: false });
  });

  test('9 — no accessibility violations (axe)', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Plugin compatibility with strictDirectives', () => {
  test('10 — strictDirectives rejects wildcard-named plugin directives; core handlers run', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
    await page.goto(`${FIXTURE}?strict=1`);
    await expect(page.getByTestId('header-count')).toHaveText('0');

    await expect(page.getByTestId('directive-calls')).toHaveText('');
    const menu = page.getByTestId('menu');
    await expect(menu).toHaveClass(/(^|\s)x(\s|$)/);
    await expect(menu).toHaveAttribute('chart', 'pie');
    await expect(menu).not.toHaveAttribute('data-x', /.*/);

    await page.getByTestId('outside-btn').click();
    await expect(page.getByTestId('menu-open')).toHaveText('true');

    for (const name of ['on:clickoutside', 'class-x', 'bind-chart']) {
      expect(warnings.some((w) => w.includes(`Cannot override core directive "${name}"`))).toBe(true);
    }
  });

  test('11 — strictDirectives leaves plugin globals untouched', async ({ page }) => {
    await page.goto(`${FIXTURE}?strict=1`);
    await page.getByTestId('add-btn').click();
    await expect(page.getByTestId('header-count')).toHaveText('1');
    await expect(page.getByTestId('sidebar-count')).toHaveText('1');
  });
});
