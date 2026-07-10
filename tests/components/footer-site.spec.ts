import { test, expect } from '../fixtures';
import { PAGES } from '../utilities/pages';

// The footer — one region, tested in isolation, but exercised on every page
// that mounts it (all 6), since drift between pages is exactly the bug
// class a component test should catch. Unlike header-site, footer copy is
// NOT byte-identical across pages (page-specific contact info, and
// accessibility.html/offline.html each correctly omit a self-referential
// link to themselves) — this spec accounts for that rather than assuming
// uniformity.

for (const { path } of PAGES) {
  test.describe(`footer — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('is a contentinfo landmark', async ({ page }) => {
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });

    test('links to the accessibility statement, except on the statement page itself', async ({
      page,
    }) => {
      const footer = page.getByRole('contentinfo');
      const link = footer.getByRole('link', {
        name: 'Accessibility statement',
      });

      if (path === '/accessibility.html') {
        await expect(link).toHaveCount(0);
      } else {
        await expect(link).toHaveAttribute('href', 'accessibility.html');
      }
    });

    test('links to offline access, except on the offline page itself', async ({
      page,
    }) => {
      const footer = page.getByRole('contentinfo');
      const link = footer.getByRole('link', { name: 'Offline access' });

      if (path === '/offline.html') {
        await expect(link).toHaveCount(0);
      } else {
        await expect(link).toHaveAttribute('href', 'offline.html');
      }
    });
  });
}
