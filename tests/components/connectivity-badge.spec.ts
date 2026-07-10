import { test, expect } from '../fixtures';
import { PAGES } from '../utilities/pages';

// The connectivity badge — present on every page's header, after the
// theme-toggle. A pure status indicator (not a link — offline.html is
// reached via the footer, see footer-site.spec.ts), backed by
// navigator.onLine / online / offline browser events; no service worker
// dependency.

for (const { path } of PAGES) {
  test.describe(`connectivity badge — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('shows Online by default', async ({ page }) => {
      const badge = page.locator('[data-component="connectivity-badge"]');
      await expect(badge).toHaveText('Online');
    });

    test('announces and updates when connectivity changes', async ({
      page,
      context,
    }) => {
      const badge = page.locator('[data-component="connectivity-badge"]');

      await context.setOffline(true);
      await expect(badge).toHaveText('Offline');
      await expect(page.locator('#connectivity-status')).toHaveText(
        "You're now offline — showing saved content.",
      );

      await context.setOffline(false);
      await expect(badge).toHaveText('Online');
      await expect(page.locator('#connectivity-status')).toHaveText(
        "You're back online.",
      );
    });
  });
}
