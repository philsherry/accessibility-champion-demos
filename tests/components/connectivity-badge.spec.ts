import { test, expect } from '../fixtures';
import { PAGES } from '../utilities/pages';

// The connectivity badge — present on every page's header, next to the
// logo. A pure status indicator (not a link — offline.html is reached
// via the footer, see footer-site.spec.ts), backed by navigator.onLine /
// online / offline browser events; no service worker dependency. Icons
// are decorative (aria-hidden) reinforcement of the text label, not a
// replacement for it — both are always present in the DOM, swapped via
// the hidden attribute rather than one being conjured/destroyed.

for (const { path } of PAGES) {
  test.describe(`connectivity badge — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('shows Online with the online icon by default', async ({ page }) => {
      const badge = page.locator('[data-component="connectivity-badge"]');
      await expect(badge).toHaveText('Online');
      await expect(
        page.locator('[data-component="connectivity-icon-online"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-component="connectivity-icon-offline"]'),
      ).toBeHidden();
    });

    test('announces and updates icon + text when connectivity changes', async ({
      page,
      context,
    }) => {
      const badge = page.locator('[data-component="connectivity-badge"]');
      const onlineIcon = page.locator(
        '[data-component="connectivity-icon-online"]',
      );
      const offlineIcon = page.locator(
        '[data-component="connectivity-icon-offline"]',
      );

      await context.setOffline(true);
      await expect(badge).toHaveText('Offline');
      await expect(onlineIcon).toBeHidden();
      await expect(offlineIcon).toBeVisible();
      await expect(page.locator('#connectivity-status')).toHaveText(
        "You're now offline — showing saved content.",
      );

      await context.setOffline(false);
      await expect(badge).toHaveText('Online');
      await expect(onlineIcon).toBeVisible();
      await expect(offlineIcon).toBeHidden();
      await expect(page.locator('#connectivity-status')).toHaveText(
        "You're back online.",
      );
    });
  });
}
