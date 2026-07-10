import { test } from './fixtures';
import { expectNoAxeViolations } from './axe-helpers';
import { PAGES } from './utilities/pages';

// Forces dark mode (bypassing localStorage/the toggle entirely — this is
// about the CSS token values, not the toggle mechanism, which
// tests/components/theme-toggle.spec.ts already covers) and re-runs the
// same axe-core check every per-page spec already runs in light mode.

for (const { path } of PAGES) {
  test(`${path} has no accessibility violations in dark mode`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-user-color-scheme', 'dark');
    });
    await expectNoAxeViolations(page);
  });
}
