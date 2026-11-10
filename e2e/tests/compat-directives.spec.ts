import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/e2e/examples/compat-directives.html';
const NAMES = ['on:clickoutside', 'class-x', 'bind-chart', 'style-glow'];

// v1.21.1 lets plugins register directives named under the core wildcards
// (on:*, bind-*, class-*, style-*); the exact name wins for that attribute
// only. strictDirectives: true is the opt-in that rejects them.
test.describe('Wildcard-named plugin directives (v1.21.1 default)', () => {
  test('1 — wildcard-named plugin directives run instead of the core handler', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
    await page.goto(FIXTURE);

    await expect(page.getByTestId('directive-calls')).toHaveText(NAMES.join(','));
    const menu = page.getByTestId('menu');
    await expect(menu).toHaveAttribute('data-x', 'custom');
    await expect(menu).toHaveAttribute('data-chart', 'pie');
    await expect(menu).toHaveAttribute('data-glow', 'gold');
    await expect(menu).not.toHaveClass(/(^|\s)x(\s|$)/);
    await expect(menu).not.toHaveAttribute('chart', /.*/);

    await expect(page.getByTestId('menu-open')).toHaveText('true');
    await page.getByTestId('outside-btn').click();
    await expect(page.getByTestId('menu-open')).toHaveText('false');

    expect(warnings.filter((w) => w.includes('Cannot override core directive'))).toEqual([]);
  });

  test('2 — a plugin bind-href runs instead of the core bind-* handler', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('link')).toHaveAttribute('href', '/from-plugin');
  });

  test('3 — core on:*, class-* and bind-* still serve every other attribute', async ({ page }) => {
    await page.goto(FIXTURE);
    const btn = page.getByTestId('core-btn');
    await expect(btn).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(btn).toHaveAttribute('title', 'core');
    await btn.click();
    await expect(page.getByTestId('core-count')).toHaveText('1');
  });

  test('4 — debug mode logs each shadowed core wildcard', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto(`${FIXTURE}?debug=1`);
    await expect(page.getByTestId('directive-calls')).toHaveText(NAMES.join(','));

    const expected = [
      ['on:clickoutside', 'on:*'],
      ['class-x', 'class-*'],
      ['bind-chart', 'bind-*'],
      ['style-glow', 'style-*'],
      ['bind-href', 'bind-*'],
    ];
    for (const [name, pattern] of expected) {
      expect(logs.some((l) => l.includes(`Directive "${name}" shadows core "${pattern}" for that attribute.`))).toBe(true);
    }
  });

  test('5 — no shadowing log outside debug mode', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto(FIXTURE);
    await expect(page.getByTestId('directive-calls')).toHaveText(NAMES.join(','));
    expect(logs.filter((l) => l.includes('shadows core'))).toEqual([]);
  });

  test('6 — no accessibility violations (axe)', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId('directive-calls')).toHaveText(NAMES.join(','));
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Wildcard-named plugin directives with strictDirectives', () => {
  test('7 — strictDirectives rejects wildcard-named plugin directives; core handlers run', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
    await page.goto(`${FIXTURE}?strict=1`);
    await expect(page.getByTestId('core-count')).toHaveText('0');

    await expect(page.getByTestId('directive-calls')).toHaveText('');
    const menu = page.getByTestId('menu');
    await expect(menu).toHaveClass(/(^|\s)x(\s|$)/);
    await expect(menu).toHaveAttribute('chart', 'pie');
    await expect(menu).not.toHaveAttribute('data-x', /.*/);
    await expect(menu).not.toHaveAttribute('data-glow', /.*/);

    await page.getByTestId('outside-btn').click();
    await expect(page.getByTestId('menu-open')).toHaveText('true');

    for (const name of [...NAMES, 'bind-href']) {
      expect(warnings.some((w) => w.includes(`Cannot override core directive "${name}"`))).toBe(true);
    }
  });

  test('8 — strictDirectives keeps the core bind-* URL sanitizer', async ({ page }) => {
    await page.goto(`${FIXTURE}?strict=1`);
    await expect(page.getByTestId('core-count')).toHaveText('0');
    await expect(page.getByTestId('link')).not.toHaveAttribute('href', '/from-plugin');
    await expect(page.getByTestId('link')).not.toHaveAttribute('href', /^javascript:/);
  });

  test('9 — strictDirectives leaves the core wildcard handlers working', async ({ page }) => {
    await page.goto(`${FIXTURE}?strict=1`);
    const btn = page.getByTestId('core-btn');
    await expect(btn).toHaveClass(/(^|\s)active(\s|$)/);
    await btn.click();
    await expect(page.getByTestId('core-count')).toHaveText('1');
  });
});
