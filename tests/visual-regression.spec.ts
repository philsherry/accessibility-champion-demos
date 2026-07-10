import { test, expect } from './fixtures';

// Full-page screenshot baseline for every page, at whichever viewport the
// current project runs (Mobile/Tablet/Desktop — see playwright.config.ts).
// Purpose: catch unintended visual side effects from CSS refactors (moving
// rules between files, deduplicating selectors) that the accessibility-tree
// and keyboard-behavior tests elsewhere in this suite can't see — those
// check *what* renders, not *how* it looks.
//
// Tagged @visual and excluded from the default `npm test` run (see the
// "test" script's --grep-invert in package.json) — these baselines were
// captured on macOS, but CI runs Ubuntu, and Playwright screenshots are
// platform-dependent (font rendering differs), so they'd fail there
// without Linux-specific baselines. Run explicitly via `npm run test:visual`.
const PAGES = [
  'index.html',
  'checkout.html',
  'orders.html',
  'subscriptions.html',
  'accessibility.html',
  'offline.html',
];

for (const page_ of PAGES) {
  test(`${page_} renders unchanged @visual`, async ({ page }) => {
    await page.goto(`/${page_}`);
    await expect(page).toHaveScreenshot(`${page_}.png`, { fullPage: true });
  });

  test(`${page_} renders unchanged in dark mode @visual`, async ({ page }) => {
    // Seeds localStorage before navigation, so theme-init.js's own
    // no-flash logic applies the attribute synchronously before first
    // paint — same code path a real returning user hits. (Setting
    // document.documentElement's attribute directly from addInitScript
    // doesn't work: documentElement isn't reliably available at that
    // very early execution point, so the call silently no-ops.) The
    // page renders directly in dark mode either way — no light-to-dark
    // transition ever fires, unlike setting it via page.evaluate() after
    // navigation, which risks capturing an in-transition frame of
    // tokens.css's --transition-theme animation.
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
    });
    await page.goto(`/${page_}`);
    await expect(page).toHaveScreenshot(
      `${page_.replace('.html', '')}-dark.png`,
      { fullPage: true },
    );
  });
}
