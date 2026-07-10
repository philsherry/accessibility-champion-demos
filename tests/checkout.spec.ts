import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './axe-helpers';
import {
  expectSkipLinkBypassesHeader,
  expectFullKeyboardTraversalStaysVisible,
} from './keyboard-helpers';

test.describe('checkout.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout.html');
  });

  test('has no accessibility violations in the clean state', async ({
    page,
  }) => {
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

  test('has no accessibility violations in the error state', async ({
    page,
  }) => {
    await page.locator('#cvc').fill('');
    await page.locator('#postcode').fill('NOTAPOSTCODE');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('submitting invalid values moves focus to the error summary', async ({
    page,
  }) => {
    await page.locator('#cvc').fill('');
    await page.locator('#postcode').fill('NOTAPOSTCODE');
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByRole('alert')).toBeFocused();
  });
});
