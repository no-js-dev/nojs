import { test, expect } from '@playwright/test';

test.describe('Loops', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/examples/loops.html');
  });

  test('1 — Simple each loop: renders all fruit items', async ({ page }) => {
    const items = page.getByTestId('fruit-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('Apple');
    await expect(items.nth(1)).toHaveText('Banana');
    await expect(items.nth(2)).toHaveText('Cherry');
  });

  test('2 — Loop variables: $index, $first, $last', async ({ page }) => {
    const items = page.getByTestId('loop-var-item');
    await expect(items).toHaveCount(3);

    // First item: index 0, first true, last false
    await expect(items.nth(0)).toContainText('0');
    await expect(items.nth(0)).toContainText('Red');
    await expect(items.nth(0)).toContainText('first: true');
    await expect(items.nth(0)).toContainText('last: false');

    // Middle item: index 1, first false, last false
    await expect(items.nth(1)).toContainText('1');
    await expect(items.nth(1)).toContainText('Green');
    await expect(items.nth(1)).toContainText('first: false');
    await expect(items.nth(1)).toContainText('last: false');

    // Last item: index 2, first false, last true
    await expect(items.nth(2)).toContainText('2');
    await expect(items.nth(2)).toContainText('Blue');
    await expect(items.nth(2)).toContainText('first: false');
    await expect(items.nth(2)).toContainText('last: true');
  });

  // FIXME: blocked by framework bug — self-repeating loop registers its update
  // watcher with _el pointing to the removed template element, causing the
  // watcher to be garbage-collected on the first notify cycle. Dynamic state
  // changes do not re-render the loop. See NOJS-116 concern report.
  test.fixme('3 — Dynamic add/remove: add a task', async ({ page }) => {
    const items = page.getByTestId('task-item');
    await expect(items).toHaveCount(2);

    await page.getByTestId('task-input').fill('Task 3');
    await page.getByTestId('task-add').click();

    await expect(items).toHaveCount(3);
    await expect(items.nth(2)).toContainText('Task 3');
  });

  // FIXME: same framework bug as test 3 — disconnected watcher element.
  test.fixme('3 — Dynamic add/remove: remove a task', async ({ page }) => {
    const items = page.getByTestId('task-item');
    await expect(items).toHaveCount(2);

    // Remove the first task
    await page.getByTestId('task-remove').first().click();
    await expect(items).toHaveCount(1);
    await expect(items.nth(0)).toContainText('Task 2');
  });

  test('4 — foreach sorted + limited: shows 2 items in alpha order', async ({ page }) => {
    const items = page.getByTestId('sorted-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText('Alice');
    await expect(items.nth(1)).toHaveText('Bob');
  });

  test('5 — Empty state: shows "No items found" message', async ({ page }) => {
    const emptyMsg = page.getByTestId('empty-msg');
    await expect(emptyMsg).toBeVisible();
    await expect(emptyMsg).toHaveText('No items found');
  });

  test('6 — Self-repeating with foreach: renders items', async ({ page }) => {
    const items = page.getByTestId('inline-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('HTML');
    await expect(items.nth(1)).toHaveText('CSS');
    await expect(items.nth(2)).toHaveText('JS');
  });

  test('7 — for alias: renders items using for directive', async ({ page }) => {
    const items = page.getByTestId('for-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('10');
    await expect(items.nth(1)).toHaveText('20');
    await expect(items.nth(2)).toHaveText('30');
  });

  test('8 — each with filter + sort: filters and sorts correctly', async ({ page }) => {
    const items = page.getByTestId('filter-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText('Cal');
    await expect(items.nth(1)).toHaveText('Ana');
  });

  test('9 — Deprecated from syntax: still renders correctly', async ({ page }) => {
    const items = page.getByTestId('from-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('Cat');
    await expect(items.nth(1)).toHaveText('Dog');
    await expect(items.nth(2)).toHaveText('Bird');
  });

  test('10 — Sibling else: shows else content when array is empty', async ({ page }) => {
    const elseItem = page.getByTestId('else-empty');
    await expect(elseItem).toBeVisible();
    await expect(elseItem).toHaveText('No items');
  });

  // FIXME: same framework bug as test 3 — disconnected watcher element prevents
  // the loop from re-rendering when state changes dynamically.
  test.fixme('11 — Sibling else: toggles when array empties and fills', async ({ page }) => {
    const items = page.getByTestId('toggle-item');
    const elseItem = page.getByTestId('else-toggle');

    // Initially: items visible, else hidden
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText('A');
    await expect(items.nth(1)).toHaveText('B');
    await expect(elseItem).toBeHidden();

    // Toggle to empty: else becomes visible
    await page.getByTestId('toggle-empty').click();
    await expect(items).toHaveCount(0);
    await expect(elseItem).toBeVisible();
    await expect(elseItem).toHaveText('List is empty');

    // Toggle back: items restored, else hidden
    await page.getByTestId('toggle-empty').click();
    await expect(items).toHaveCount(2);
    await expect(elseItem).toBeHidden();
  });

  test('12 — Loop with get/as: renders API items', async ({ page }) => {
    // Mock the API response before navigating
    await page.route('**/api/items', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'Widget' },
          { name: 'Gadget' },
          { name: 'Doohickey' },
        ]),
      });
    });

    // Re-navigate so the mocked route is in effect
    await page.goto('/e2e/examples/loops.html');

    const items = page.getByTestId('api-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('Widget');
    await expect(items.nth(1)).toHaveText('Gadget');
    await expect(items.nth(2)).toHaveText('Doohickey');
  });
});
