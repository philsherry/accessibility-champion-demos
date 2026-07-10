import { test, expect } from '@playwright/test';

// orders.html's reorder buttons previously had no click handler at all —
// they existed solely to demonstrate the accessible-icon-button-naming
// pattern (Section 6, Chapter 5), not as a working feature. This is the
// journey that behavior enables: reordering updates the shared cart state,
// same as adding a product from index.html does.

test.describe('reorder from order history', () => {
  test('clicking reorder increments the cart badge and announces it', async ({
    page,
  }) => {
    await page.goto('/orders.html');

    const cartCount = page.locator('.cart-count');
    await expect(cartCount).toHaveText('2');

    await page
      .getByRole('button', {
        name: 'Reorder Girl Scout Mousies from 26 May 2026',
      })
      .click();

    await expect(cartCount).toHaveText('3');
    await expect(page.getByRole('link', { name: /^Cart,/ })).toHaveAttribute(
      'aria-label',
      'Cart, 3 items',
    );
    await expect(page.getByRole('status')).toHaveText(
      'Girl Scout Mousies added to cart. Cart now contains 3 items.',
    );
  });

  test('reordering a different item announces the correct product name', async ({
    page,
  }) => {
    await page.goto('/orders.html');

    await page
      .getByRole('button', { name: 'Reorder Purple Whisker from 19 May 2026' })
      .click();

    await expect(page.getByRole('status')).toHaveText(
      'Purple Whisker added to cart. Cart now contains 3 items.',
    );
  });
});
