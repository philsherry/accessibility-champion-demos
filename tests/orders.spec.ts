import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe-helpers';
import {
  expectSkipLinkBypassesHeader,
  expectFullKeyboardTraversalStaysVisible,
} from './keyboard-helpers';

test.describe('orders.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders.html');
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
    await expectFullKeyboardTraversalStaysVisible(page, 40);
  });

  test('column headers stay in the accessibility tree at the responsive breakpoint', async ({
    page,
  }) => {
    // Explicit sub-600px viewport — the responsive card-row layout only
    // applies below that breakpoint. Without forcing it here, this test
    // would trivially pass under any project whose viewport happens to be
    // wider than 600px, without ever exercising the CSS being tested.
    await page.setViewportSize({ width: 390, height: 844 });

    // The responsive card-row layout visually replaces <th scope="col"> with
    // data-label pseudo-content for sighted users — the real headers must
    // still be reachable by role, not display:none, so table-mode screen
    // reader navigation still announces column context.
    await expect(
      page.getByRole('columnheader', { name: 'Order date' }),
    ).toHaveCount(1);
  });
});
