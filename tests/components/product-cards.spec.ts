import { test, expect } from '../fixtures';

// The product-card grid — index.html only. Tests the cards' own structure
// and naming (in isolation from the filter-bar that drives their
// visibility — see filter-bar.spec.ts for that mechanism's own behavior),
// plus the visibility effect from the card region's own perspective:
// specific named cards appearing/disappearing, not just a raw count.

test.describe('product-cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('each card title is a heading, at the correct level', async ({
    page,
  }) => {
    const grid = page.locator('[data-testid="test_product-grid"]');
    const headings = grid.getByRole('heading', { level: 3 });
    await expect(headings).toHaveCount(12);
    await expect(headings.first()).toHaveText('Purple Whisker');
  });

  test('every "Add to cart" button has a unique accessible name', async ({
    page,
  }) => {
    const grid = page.locator('[data-testid="test_product-grid"]');
    const buttons = grid.getByRole('button', { name: /^Add to cart/ });

    await expect(buttons).toHaveCount(12);

    const names = await buttons.allInnerTexts();
    expect(new Set(names).size).toBe(12);

    // Spot check one specific name rather than only checking uniqueness —
    // uniqueness alone wouldn't catch every button silently losing its
    // product-name suffix (12 buttons all named "Add to cart undefined"
    // would still be "unique" against each other by that measure alone).
    await expect(
      grid.getByRole('button', { name: 'Add to cart Purple Whisker' }),
    ).toBeVisible();
  });

  test('decorative product images are hidden from the accessibility tree', async ({
    page,
  }) => {
    const grid = page.locator('[data-testid="test_product-grid"]');
    const images = grid.locator('.product-image');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      await expect(images.nth(i)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('filtering shows and hides the correct named cards, not just a count', async ({
    page,
  }) => {
    const filterGroup = page.getByRole('group', { name: 'Filter by type' });
    const grid = page.locator('[data-testid="test_product-grid"]');

    await filterGroup.getByRole('button', { name: 'Naptime' }).click();

    // Purple Whisker is Naptime — stays visible.
    await expect(
      grid.locator('[data-component="product-card"]', {
        hasText: 'Purple Whisker',
      }),
    ).toBeVisible();

    // OG Floof is Existential — hidden by the Naptime filter.
    await expect(
      grid.locator('[data-component="product-card"]', {
        hasText: 'OG Floof',
      }),
    ).toBeHidden();
  });
});
