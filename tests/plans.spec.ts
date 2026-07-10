import { test } from '@playwright/test';
import { expectNoAxeViolations } from './axe-helpers';
import {
  expectSkipLinkBypassesHeader,
  expectFullKeyboardTraversalStaysVisible,
} from './keyboard-helpers';

test.describe('plans.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plans.html');
  });

  test('has no accessibility violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('skip link bypasses the header navigation', async ({ page }) => {
    await expectSkipLinkBypassesHeader(page);
  });

  test('full keyboard traversal never lands on a hidden element', async ({
    page,
  }) => {
    await expectFullKeyboardTraversalStaysVisible(page, 30);
  });
});
