import { test, expect } from '@playwright/test';

// The header markup is structurally the same across all 5 pages (same
// elements, same shared CSS via _shared/base.css) — only per-page details
// like which nav/cart link carries aria-current="page" differ. These
// checks run once against index.html rather than being repeated per page.

test.describe('site header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('tagline stays visible next to the wordmark', async ({ page }) => {
    // Explicit sub-640px viewport — the tagline was only ever hidden below
    // that breakpoint. Without forcing it here, this test would trivially
    // pass under the Tablet/Desktop projects regardless of whether the bug
    // still existed, since the CSS rule in question never applied there.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.tagline')).toBeVisible();
  });

  // Deliberately NOT pinned to one viewport — unlike the tagline check
  // above, this test's value comes from running across the full Mobile/
  // Tablet/Desktop project matrix (see playwright.config.ts), since the
  // property being verified (DOM/tab order matches visual order) must hold
  // at every breakpoint, not just one arbitrarily chosen size.
  test('tab order visually flows top-to-bottom, left-to-right through the header', async ({
    page,
  }) => {
    const positions: { label: string; x: number; y: number }[] = [];
    const capture = async (label: string) => {
      const box = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top };
      });
      if (box) positions.push({ label, ...box });
    };

    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // logo
    await capture('logo');
    for (let i = 0; i < 4; i++) {
      // 3 nav links + cart link
      await page.keyboard.press('Tab');
      await capture(`header item ${i + 1}`);
    }

    const ROW_TOLERANCE = 20; // same-row icon/padding baseline variance — a real row-order defect jumps by tens of pixels, not single digits
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      expect(
        curr.y,
        `Tab order jumped backward: "${curr.label}" (y=${curr.y}) appears above ` +
          `"${prev.label}" (y=${prev.y}) — tab order doesn't match visual layout`,
      ).toBeGreaterThanOrEqual(prev.y - ROW_TOLERANCE);

      const sameRow = Math.abs(curr.y - prev.y) <= ROW_TOLERANCE;
      if (sameRow) {
        expect(
          curr.x,
          `Tab order goes right-to-left within a row: "${curr.label}" (x=${curr.x}) appears to ` +
            `the left of "${prev.label}" (x=${prev.x}), both on the same row`,
        ).toBeGreaterThanOrEqual(prev.x);
      }
    }
  });
});

test.describe('index.html in-page jump link', () => {
  test('"Browse strains" moves focus to the products section', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Browse strains' }).click();
    await expect(page.locator('#products')).toBeFocused();
  });
});
