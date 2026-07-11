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

    // Branching on `path` here, outside the test callback, picks which
    // single-assertion test to register for this page — see CONVENTIONS.md
    // ("no-conditional-in-test") for why the branch can't live inside the
    // test body itself.
    if (path === '/accessibility.html') {
      test('does not link to the accessibility statement, since this is that page', async ({
        page,
      }) => {
        const footer = page.getByRole('contentinfo');
        await expect(
          footer.getByRole('link', { name: 'Accessibility statement' }),
        ).toHaveCount(0);
      });
    } else {
      test('links to the accessibility statement', async ({ page }) => {
        const footer = page.getByRole('contentinfo');
        await expect(
          footer.getByRole('link', { name: 'Accessibility statement' }),
        ).toHaveAttribute('href', 'accessibility.html');
      });
    }

    if (path === '/offline.html') {
      test('does not link to offline access, since this is that page', async ({
        page,
      }) => {
        const footer = page.getByRole('contentinfo');
        await expect(
          footer.getByRole('link', { name: 'Offline access' }),
        ).toHaveCount(0);
      });
    } else {
      test('links to offline access', async ({ page }) => {
        const footer = page.getByRole('contentinfo');
        await expect(
          footer.getByRole('link', { name: 'Offline access' }),
        ).toHaveAttribute('href', 'offline.html');
      });
    }
  });
}
