import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { expectSkipLinkBypassesHeader } from '../keyboard-helpers';
import { PAGES } from '../utilities/pages';

// One region (header, including its nested nav — see CONVENTIONS.md for why
// nav isn't split into its own spec) tested in isolation, but exercised on
// every page that mounts it. The header's markup is currently shared/
// identical across all 5 pages, but that's exactly what a component test
// should verify rather than assume — drift between pages (a missing
// aria-current, a tagline that disappears) is the bug class this file
// exists to catch.

for (const { path, currentNavLabel, cartHasAriaCurrent } of PAGES) {
  test.describe(`header — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('skip link bypasses the header navigation', async ({ page }) => {
      await expectSkipLinkBypassesHeader(page);
    });

    test('tagline stays visible next to the wordmark on mobile', async ({
      page,
    }) => {
      // Explicit sub-640px viewport — the tagline was only ever hidden below
      // that breakpoint historically. Without forcing it here, this test
      // would trivially pass under the Tablet/Desktop projects regardless of
      // whether the bug still existed, since the CSS rule in question never
      // applied there.
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
        // document.activeElement is never null (it falls back to <body>),
        // so this can push unconditionally instead of branching on a null
        // check — see CONVENTIONS.md ("no-conditional-in-test").
        const box = await page.evaluate(() => {
          const r = document.activeElement!.getBoundingClientRect();
          return { x: r.left, y: r.top };
        });
        positions.push({ label, ...box });
      };

      await page.keyboard.press('Tab'); // skip link
      await page.keyboard.press('Tab'); // logo
      await capture('logo');
      for (let i = 0; i < 4; i++) {
        // 3 nav links, then cart link (DOM order: logo, status badge
        // [not focusable], nav, cart)
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
      }

      // Filtering to same-row pairs first, rather than branching on
      // `sameRow` inside the loop above, keeps the x-order assertion
      // unconditional — see CONVENTIONS.md ("no-conditional-in-test").
      const sameRowPairs = positions
        .slice(1)
        .map((curr, i) => ({ curr, prev: positions[i] }))
        .filter(({ curr, prev }) => Math.abs(curr.y - prev.y) <= ROW_TOLERANCE);

      for (const { curr, prev } of sameRowPairs) {
        expect(
          curr.x,
          `Tab order goes right-to-left within a row: "${curr.label}" (x=${curr.x}) appears to ` +
            `the left of "${prev.label}" (x=${prev.x}), both on the same row`,
        ).toBeGreaterThanOrEqual(prev.x);
      }
    });

    const NAV_LABELS = ['Products', 'Subscriptions', 'My Orders'];

    // Both branches are picked here, outside the test callback, from data
    // that's fixed per page (PAGES) — this is what lets the test body below
    // run its assertions unconditionally. See CONVENTIONS.md
    // ("no-conditional-in-test").
    const currentLabels = NAV_LABELS.filter(
      (label) => label === currentNavLabel,
    );
    const otherLabels = NAV_LABELS.filter((label) => label !== currentNavLabel);
    const assertCartAriaCurrent = cartHasAriaCurrent
      ? (page: Page) =>
          expect(page.getByRole('link', { name: /^Cart,/ })).toHaveAttribute(
            'aria-current',
            'page',
          )
      : (page: Page) =>
          expect(
            page.getByRole('link', { name: /^Cart,/ }),
          ).not.toHaveAttribute('aria-current', 'page');

    test('aria-current marks exactly the right element as current', async ({
      page,
    }) => {
      const nav = page.getByRole('navigation', { name: 'Main' });
      for (const label of currentLabels) {
        await expect(nav.getByRole('link', { name: label })).toHaveAttribute(
          'aria-current',
          'page',
        );
      }
      for (const label of otherLabels) {
        await expect(
          nav.getByRole('link', { name: label }),
        ).not.toHaveAttribute('aria-current', 'page');
      }

      await assertCartAriaCurrent(page);
    });
  });
}
