import { test, expect } from '../fixtures';

// A full error-recovery loop — invalid submit, fix the fields, resubmit,
// confirm success — as opposed to checkout.spec.ts's existing single-shot
// "hits the error state" check, which never verifies a user can actually
// recover from it.

test('recovers from a failed submission and completes checkout', async ({
  page,
}) => {
  await page.goto('/checkout.html');

  await page.locator('#cvc').fill('');
  await page.locator('#postcode').fill('NOTAPOSTCODE');
  await page.getByRole('button', { name: 'Place order' }).click();

  const errorSummary = page.getByRole('alert');
  await expect(errorSummary).toBeVisible();
  await expect(errorSummary).toBeFocused();

  await page.locator('#postcode').fill('W11 4NR');
  await page.locator('#cvc').fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('alert')).toBeHidden();
  const confirmation = page.getByRole('heading', { name: 'Order placed!' });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toBeFocused();
});
