import { test } from './fixtures';
import { expectNoAxeViolations } from './axe-helpers';
import { PAGES } from './utilities/pages';

// Forces dark mode and re-runs the same axe-core check every per-page
// spec already runs in light mode. This IS via localStorage (not
// bypassing it) — seeded before navigation so theme-init.js's own
// no-flash logic applies the attribute synchronously before first
// paint, same code path a real returning user hits. (Setting
// document.documentElement's attribute directly from addInitScript
// doesn't work: documentElement isn't reliably available at that very
// early execution point, so the call silently no-ops.) The toggle UI
// mechanism itself is covered separately by
// tests/components/theme-toggle.spec.ts. The page renders directly in
// dark mode either way — tokens.css's --transition-theme animation
// never fires, unlike page.evaluate() after goto(), which would risk
// axe sampling an in-transition colour that belongs to neither theme.

for (const { path } of PAGES) {
  test(`${path} has no accessibility violations in dark mode`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
    });
    await page.goto(path);
    await expectNoAxeViolations(page);
  });
}
