import { expect, test } from './fixtures';
import { expectNoAxeViolations } from './axe-helpers';
import { expectFullKeyboardTraversalStaysVisible } from './keyboard-helpers';

test.describe('offline.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/offline.html');
  });

  test('has no accessibility violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('full keyboard traversal never lands on a hidden element', async ({
    page,
  }) => {
    await expectFullKeyboardTraversalStaysVisible(page, 20);
  });

  test('shows a not-yet-cached message before any cache exists', async ({
    page,
  }) => {
    await expect(
      page.getByText(/hasn't been cached for offline use yet/),
    ).toBeVisible();
  });

  test('clicking "Clear offline data" announces confirmation even with nothing to clear', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Clear offline data' }).click();
    // Scoped by id, not getByRole('status') — from Task 4 onward this
    // page also carries the connectivity badge's #connectivity-status
    // live region, which shares the same role and would make a bare
    // role locator ambiguous.
    await expect(page.locator('#offline-page-status')).toHaveText(
      'Offline data cleared. This site will be re-cached automatically next time you visit while online.',
    );
  });
});
