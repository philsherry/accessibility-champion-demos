import { test } from './fixtures';
import { expectNoAxeViolations } from './axe-helpers';
import { expectFullKeyboardTraversalStaysVisible } from './keyboard-helpers';

test.describe('subscriptions.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/subscriptions.html');
  });

  test('has no accessibility violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('full keyboard traversal never lands on a hidden element', async ({
    page,
  }) => {
    await expectFullKeyboardTraversalStaysVisible(page, 30);
  });
});
