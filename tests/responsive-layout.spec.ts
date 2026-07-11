import { test, expect } from './fixtures';
import { PAGES } from './utilities/pages';

// A plain (uncalled) function declaration, not a conditional inline in the
// test body — see CONVENTIONS.md ("no-conditional-in-test"). viewportWidth
// is only known once the test runs (it comes from the active Playwright
// project), so unlike the path-based branches elsewhere in this suite, it
// can't be decided at test-registration time.
function expectedHeaderDisplay(viewportWidth: number): 'grid' | 'flex' {
  return viewportWidth <= 640 ? 'grid' : 'flex';
}

// Guards against horizontal overflow at each of this project's three
// configured viewports (Mobile/Tablet/Desktop — see playwright.config.ts),
// and confirms the header actually renders in the layout mode expected
// for that viewport (stacked grid below 640px, single flex row above).
//
// Written after a real bug: adding the connectivity badge as a naive
// extra flex/grid item made the header overflow horizontally at Tablet
// width (768px) — content got pushed past the header's painted
// background, which axe's color-contrast check happened to catch as a
// side effect, but nothing checked the actual root cause directly. This
// does.
//
// The overflow check deliberately does NOT compare
// document.documentElement.scrollWidth against clientWidth — scrollWidth
// can be inflated by an element's own legitimate internal
// `overflow-x: auto` scrolling region (e.g. subscriptions.html's comparison
// table, which is intentionally wider than the viewport and horizontally
// scrollable within its own wrapper — the documented responsive-table
// pattern, not a bug) without the page itself ever becoming scrollable.
// Attempting to actually scroll the page and checking whether it moved
// is the signal that matches what a user can really do.

for (const { path } of PAGES) {
  test.describe(`responsive layout — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('page cannot be scrolled horizontally', async ({ page }) => {
      const scrollX = await page.evaluate(() => {
        window.scrollTo({ left: 10_000 });
        return window.scrollX;
      });
      expect(
        scrollX,
        `Page scrolled ${scrollX}px horizontally — some element is overflowing the viewport outside an intentionally scrollable container`,
      ).toBe(0);
    });

    test('header switches to the stacked mobile layout only below 640px', async ({
      page,
    }) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      const display = await page
        .locator('.site-header .inner')
        .evaluate((el) => getComputedStyle(el).display);

      expect(display).toBe(expectedHeaderDisplay(viewportWidth));
    });
  });
}
