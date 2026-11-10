import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Captured = { method: string; contentType: string | null; body: string | null };

async function load(page: Page) {
  const requests: Record<string, Captured> = {};
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.route('**/api/body/**', (route) => {
    const req = route.request();
    const name = new URL(req.url()).pathname.split('/').pop()!;
    requests[name] = { method: req.method(), contentType: req.headers()['content-type'] ?? null, body: req.postData() };
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/e2e/examples/http-body.html');
  await expect(page.getByTestId('query-done')).toBeVisible();
  return { requests, warnings };
}

async function click(page: Page, requests: Record<string, Captured>, id: string) {
  await page.getByTestId(id).click();
  await expect.poll(() => requests[id]).toBeTruthy();
  return requests[id];
}

test.describe('HTTP body attribute', () => {
  test('1 — the documented JSON template sends JSON on every mutating verb', async ({ page }) => {
    const { requests, warnings } = await load(page);
    const name = '{"name":"Ann \\"Q\\" & Co","role":"admin"}';
    expect(await click(page, requests, 'json-post')).toEqual({ method: 'POST', contentType: 'application/json', body: name });
    expect(await click(page, requests, 'json-put')).toEqual({ method: 'PUT', contentType: 'application/json', body: name });
    expect(await click(page, requests, 'json-patch')).toEqual({ method: 'PATCH', contentType: 'application/json', body: '{"id":7,"qty":2}' });
    expect(await click(page, requests, 'json-delete')).toEqual({ method: 'DELETE', contentType: 'application/json', body: '{"id":7}' });
    expect(await click(page, requests, 'json-call')).toEqual({ method: 'POST', contentType: 'application/json', body: '{"email":"e@x.io","password":"p@ss"}' });
    expect(warnings.filter((w) => w.includes('Expression error'))).toEqual([]);
  });

  test('2 — object literals and an object value send JSON', async ({ page }) => {
    const { requests } = await load(page);
    expect((await click(page, requests, 'obj-short')).body).toBe('{"email":"e@x.io","password":"p@ss"}');
    expect((await click(page, requests, 'obj-lit')).body).toBe('{"id":7}');
    expect((await click(page, requests, 'obj-value')).body).toBe('{"a":1}');
  });

  test('3 — form-encoded, text and valid-JSON bodies keep their v1.21.1 bytes', async ({ page }) => {
    const { requests } = await load(page);
    const form = await click(page, requests, 'keep-form');
    expect(form.body).toBe('name=a%26b%3Dc&x=1');
    expect(form.contentType).not.toBe('application/json');
    const text = await click(page, requests, 'keep-text');
    expect(text.body).toBe('hello%20world');
    expect(text.contentType).not.toBe('application/json');
    expect(await click(page, requests, 'keep-array')).toEqual({ method: 'POST', contentType: 'application/json', body: '["hello%20world",7]' });
  });

  test('4 — QUERY sends the JSON template', async ({ page }) => {
    const { requests } = await load(page);
    expect(requests['query']).toEqual({ method: 'QUERY', contentType: 'application/json', body: '{"name":"Ann \\"Q\\" & Co"}' });
  });

  test('5 — accessibility', async ({ page }) => {
    await load(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });
});
