import { test, expect } from '@playwright/test';

// F4 - the evaluator must not reach an iframe's real cross-realm Window through
// $refs.frame.contentWindow. eval / fetch / document.cookie must be neutralized and
// no network request may exfiltrate the secret cookie, while benign ref reads work.

test.describe('Security F4 - iframe contentWindow realm escape', () => {
  test('child-window primitives neutralized and no exfil fires', async ({ page }) => {
    const exfil: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/exfil')) exfil.push(r.url());
    });
    await page.route('**/exfil**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' }));

    await page.goto('/e2e/examples/security-f4-iframe.html');

    // BLOCKED: dangerous child-window members resolve to undefined
    await expect(page.getByTestId('f4-eval-type')).toHaveText('undefined');
    await expect(page.getByTestId('f4-fetch-type')).toHaveText('undefined');
    await expect(page.getByTestId('f4-cookie')).toHaveText('undefined');

    // control: benign ref read still works
    await expect(page.getByTestId('f4-tag')).toHaveText('IFRAME');

    // active exfil attempts must produce no request carrying the secret
    await page.getByTestId('f4-eval-attack').click();
    await page.getByTestId('f4-fetch-attack').click();
    await page.waitForLoadState('networkidle');

    for (const u of exfil) expect(u, `exfil request fired: ${u}`).not.toContain('SECRET_TOKEN_42');
    expect(exfil.length).toBe(0);
  });
});
