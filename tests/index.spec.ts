import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe-helpers';
import {
  expectSkipLinkBypassesHeader,
  expectFullKeyboardTraversalStaysVisible,
} from './keyboard-helpers';

test.describe('index.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
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

  test('filter buttons toggle aria-pressed, filter the grid, and announce via the live region', async ({
    page,
  }) => {
    const filterGroup = page.getByRole('group', { name: 'Filter by type' });
    const zoomiesBtn = filterGroup.getByRole('button', { name: 'Zoomies' });
    const allBtn = filterGroup.getByRole('button', { name: 'All strains' });
    const liveRegion = page.getByRole('status');
    const grid = page.locator('[data-testid="test_product-grid"]');

    await zoomiesBtn.click();

    await expect(zoomiesBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(allBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(liveRegion).toHaveText('Showing 5 zoomies strains.');
    await expect(
      grid.locator('[data-component="product-card"]:not([hidden])'),
    ).toHaveCount(5);
  });
});
