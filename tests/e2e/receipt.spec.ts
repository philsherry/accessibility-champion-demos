import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { expectNoAxeViolations } from '../axe-helpers';

// subscriptions.html's comparison table is the documented
// horizontally-scrollable pattern (min-width: 600px inside its own
// overflow-x: auto wrapper) — every real dimension (visualViewport,
// clientWidth, the page's own "cannot scroll horizontally" test) stays
// correctly 390px on Mobile. But under Chromium's isMobile CDP emulation
// specifically, window.innerWidth/documentElement.scrollWidth report that
// table's un-contained min-content width (956px) even though nothing
// between it and <body> actually overflows — Playwright uses that
// inflated value internally for its click-with-auto-scroll actionability
// check, scrolling to a position that doesn't match what a real
// 390px-wide screen shows. A manual scroll + coordinate click sidesteps
// Playwright's own (mis-measured) scroll logic without skipping the real
// actionability check .click({force:true}) would — the coordinates come
// from the element's true, correctly-390px-relative bounding box.
//
// A plain (uncalled) function declaration, not a conditional inline in a
// test body — see CONVENTIONS.md ("no-conditional-in-test"). Whether
// boundingBox() returns null is only knowable once the element has
// actually been located at test runtime, so it can't be hoisted out to
// test-registration time the way a per-page branch could be.
async function clickViaVerifiedCoordinates(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element has no bounding box');
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('choosing a plan, completing checkout, and viewing the receipt shows the right plan', async ({
  page,
}) => {
  await page.goto('/subscriptions.html');

  await clickViaVerifiedCoordinates(
    page,
    page.getByRole('link', { name: 'Choose The Catnap' }),
  );
  await expect(page).toHaveURL(/checkout\.html\?plan=catnap/);

  // Every field ships with a realistic default value except the security
  // code — deliberately: a real checkout never persists or prefills a
  // CVC, so both existing checkout e2e tests fill #cvc by hand before
  // submitting. Matching that established pattern.
  await page.locator('#cvc').fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('heading', { name: 'Order placed!' })).toBeVisible();
  await page.getByRole('link', { name: 'View receipt' }).click();
  await expect(page).toHaveURL(/receipt\.html\?plan=catnap/);

  await expect(page.locator('#receipt-plan-name')).toHaveText('The Catnap');
  await expect(page.locator('#receipt-monthly-price')).toHaveText('£9.00/mo');
  await expect(page.locator('#receipt-due-today')).toHaveText('£9.00');
  await expect(page.locator('#receipt-promo-row')).toBeHidden();
});

test('receipt.html has no accessibility violations', async ({ page }) => {
  await page.goto('/receipt.html?plan=zoomies');
  await expectNoAxeViolations(page);
});

test('the copy-link fallback announces confirmation when Web Share is unavailable', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    // Force the fallback path — some Desktop browsers support
    // navigator.share, some don't; this test asserts the fallback
    // behaviour specifically, regardless of the host browser.
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  await page.goto('/receipt.html?plan=zoomies');

  await page.getByRole('button', { name: 'Share this receipt' }).click();
  await expect(page.locator('#receipt-status')).toHaveText('Receipt link copied.');
});
