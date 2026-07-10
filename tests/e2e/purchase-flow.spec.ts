import { test, expect } from '@playwright/test';

// The core purchase journey, crossing the seam between two pages —
// distinct from the component specs, which each test one region in
// isolation. Filter → add to cart → follow the cart link → submit a valid
// order → land on the confirmation state.

test('filter, add to cart, check out, and land on the confirmation state', async ({
  page,
}) => {
  await page.goto('/index.html');

  // Filter down to a specific strain type first, so the flow exercises the
  // filter-bar/product-grid interaction on the way to picking a product,
  // rather than just clicking whatever the unfiltered grid happens to show.
  await page
    .getByRole('group', { name: 'Filter by type' })
    .getByRole('button', { name: 'Naptime' })
    .click();

  const grid = page.locator('[data-testid="test_product-grid"]');
  await grid
    .locator('[data-component="product-card"]', { hasText: 'Purple Whisker' })
    .getByRole('button', { name: /^Add to cart/ })
    .click();

  await expect(page.locator('.cart-count')).toHaveText('3');

  await page.getByRole('link', { name: /^Cart,/ }).click();
  await expect(page).toHaveURL(/checkout\.html/);

  // Every other field ships with a realistic default value except the
  // security code — deliberately: a demo shouldn't model prefilling a CVC
  // as acceptable practice, since a real checkout form never persists or
  // prefills one. A real user always types this field by hand, so the
  // journey does too, rather than relying on a zero-input submit to work.
  await page.locator('#cvc').fill('123');

  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(
    page.getByRole('heading', { name: 'Order placed!' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Order placed!' }),
  ).toBeFocused();
});
