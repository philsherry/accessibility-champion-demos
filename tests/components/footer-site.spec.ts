import { test, expect } from '../fixtures';
import { PAGES } from '../utilities/pages';

// The footer — one region, tested in isolation, but exercised on every page
// that mounts it (all 5), since drift between pages is exactly the bug
// class a component test should catch. Unlike header-site, footer copy is
// NOT byte-identical across pages (page-specific contact info, and
// accessibility.html correctly omits a self-referential link to itself) —
// this spec accounts for that rather than assuming uniformity.

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
  });
}
