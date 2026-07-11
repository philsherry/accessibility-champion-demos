import { test, expect } from '../fixtures';

// The strain-type filter bar — index.html only, the only page with this
// region. Not a <nav>, despite the name suggesting one: it's a toggle-button
// group (role="group"), tested here as its own component since its
// interaction pattern (aria-pressed toggling, live-region announcement) is
// distinct from both the header and the product grid it filters.

test.describe('filter-bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('toggles aria-pressed, filters the grid, and announces via the live region', async ({
    page,
  }) => {
    const filterGroup = page.getByRole('group', { name: 'Filter by type' });
    const zoomiesBtn = filterGroup.getByRole('button', { name: 'Zoomies' });
    const allBtn = filterGroup.getByRole('button', { name: 'All strains' });
    // Scoped by id, not getByRole('status') — the header's
    // #connectivity-status live region shares the same role on every
    // page now, which makes a bare role locator ambiguous. The filter
    // announcement reuses #cart-status (see assets/js/index.js).
    const liveRegion = page.locator('#cart-status');
    const grid = page.locator('[data-testid="test_product-grid"]');

    await zoomiesBtn.click();

    await expect(zoomiesBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(allBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(liveRegion).toHaveText('Showing 5 zoomies strains.');
    await expect(
      grid.locator('[data-component="product-card"]:not([hidden])'),
    ).toHaveCount(5);
  });

  test('is operable by keyboard alone', async ({ page }) => {
    const filterGroup = page.getByRole('group', { name: 'Filter by type' });
    const naptimeBtn = filterGroup.getByRole('button', { name: 'Naptime' });
    const grid = page.locator('[data-testid="test_product-grid"]');

    await naptimeBtn.focus();
    await page.keyboard.press('Enter');

    await expect(naptimeBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(
      grid.locator('[data-component="product-card"]:not([hidden])'),
    ).toHaveCount(4);
  });

  test('"All strains" resets the filter and shows every card again', async ({
    page,
  }) => {
    const filterGroup = page.getByRole('group', { name: 'Filter by type' });
    const existentialBtn = filterGroup.getByRole('button', {
      name: 'Existential',
    });
    const allBtn = filterGroup.getByRole('button', { name: 'All strains' });
    // Scoped by id, not getByRole('status') — the header's
    // #connectivity-status live region shares the same role on every
    // page now, which makes a bare role locator ambiguous. The filter
    // announcement reuses #cart-status (see assets/js/index.js).
    const liveRegion = page.locator('#cart-status');
    const grid = page.locator('[data-testid="test_product-grid"]');

    await existentialBtn.click();
    await expect(
      grid.locator('[data-component="product-card"]:not([hidden])'),
    ).toHaveCount(3);

    await allBtn.click();

    await expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(existentialBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(liveRegion).toHaveText('Showing all 12 strains.');
    await expect(
      grid.locator('[data-component="product-card"]:not([hidden])'),
    ).toHaveCount(12);
  });

  // The live-region announcement has a singular/plural branch — "Showing 1
  // X strain." vs "Showing N X strains." — but every filter category in the
  // current product data has more than one member (naptime: 4, zoomies: 5,
  // existential: 3), so the singular branch has no reachable path through
  // real user interaction. Noted rather than silently skipped: if a future
  // catalogue change ever brings a category down to exactly one product,
  // this is the gap to close.
});
