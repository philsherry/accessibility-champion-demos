import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { expectNoAxeViolations } from '../axe-helpers';
import { PAGES } from '../utilities/pages';

// One region (the theme toggle), tested in isolation but exercised on
// every page that mounts it — same rationale as header-site.spec.ts.
//
// The radio inputs are visually hidden (clip-path sr-only, associated via
// a wrapping <label>) so a sighted mouse user always clicks the visible
// label/icon, never the input directly — the input's clipped hit area is
// intentionally near zero-size. `check({ force: true })` bypasses
// Playwright's pointer-actionability check for that reason; it still
// dispatches a real check + change event, exercising the same code path
// a label click does.

// Waits for tokens.css's --transition-theme bg/text colour animation to
// finish, so a colour-contrast check afterwards samples the settled
// colour rather than an interpolated mid-transition one that belongs to
// neither theme. Event-driven (transitionend) with a fallback timeout in
// case the transition already finished or --transition-theme is 0ms
// (reduced-motion).
async function waitForThemeTransition(page: Page): Promise<void> {
  await page.locator('body').evaluate(
    (body) =>
      new Promise<void>((resolve) => {
        const done = () => {
          body.removeEventListener('transitionend', done);
          resolve();
        };
        body.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 300);
      }),
  );
}

for (const { path } of PAGES) {
  test.describe(`theme toggle — ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('all 3 options are present with correct accessible names, auto checked by default', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });
      const auto = group.getByRole('radio', { name: 'System default' });
      const light = group.getByRole('radio', { name: 'Light theme' });
      const dark = group.getByRole('radio', { name: 'Dark theme' });

      await expect(auto).toBeChecked();
      await expect(light).not.toBeChecked();
      await expect(dark).not.toBeChecked();
    });

    test('selecting dark sets the attribute and persists to localStorage', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });
      await group
        .getByRole('radio', { name: 'Dark theme' })
        .check({ force: true });

      await expect(page.locator('html')).toHaveAttribute(
        'data-user-color-scheme',
        'dark',
      );
      const stored = await page.evaluate(() => localStorage.getItem('theme'));
      expect(stored).toBe('dark');
    });

    test('selecting light sets the attribute and persists to localStorage', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });
      await group
        .getByRole('radio', { name: 'Light theme' })
        .check({ force: true });

      await expect(page.locator('html')).toHaveAttribute(
        'data-user-color-scheme',
        'light',
      );
      const stored = await page.evaluate(() => localStorage.getItem('theme'));
      expect(stored).toBe('light');
    });

    test('returning to system default removes the attribute and clears localStorage', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });
      await group
        .getByRole('radio', { name: 'Dark theme' })
        .check({ force: true });
      await group
        .getByRole('radio', { name: 'System default' })
        .check({ force: true });

      await expect(page.locator('html')).not.toHaveAttribute(
        'data-user-color-scheme',
      );
      const stored = await page.evaluate(() => localStorage.getItem('theme'));
      expect(stored).toBeNull();
    });

    test('reload with a stored preference shows the right radio checked, no flash', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });
      await group
        .getByRole('radio', { name: 'Dark theme' })
        .check({ force: true });

      await page.reload();

      // theme-init.js applies the attribute synchronously before first
      // paint — checking it immediately after navigation (not waiting for
      // any UI settle) is the point of this assertion.
      await expect(page.locator('html')).toHaveAttribute(
        'data-user-color-scheme',
        'dark',
      );
      await expect(
        group.getByRole('radio', { name: 'Dark theme' }),
      ).toBeChecked();
    });

    test('keyboard-operable via native radio-group arrow keys', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });
      await group.getByRole('radio', { name: 'System default' }).focus();

      await page.keyboard.press('ArrowRight');
      await expect(
        group.getByRole('radio', { name: 'Light theme' }),
      ).toBeFocused();
      await expect(
        group.getByRole('radio', { name: 'Light theme' }),
      ).toBeChecked();

      await page.keyboard.press('ArrowRight');
      await expect(
        group.getByRole('radio', { name: 'Dark theme' }),
      ).toBeFocused();
      await expect(
        group.getByRole('radio', { name: 'Dark theme' }),
      ).toBeChecked();
    });

    test('has no accessibility violations in any of the 3 states', async ({
      page,
    }) => {
      const group = page.getByRole('group', { name: 'Colour scheme' });

      await expectNoAxeViolations(page);

      // Waits below let the 200ms bg/text colour transition (tokens.css's
      // --transition-theme) finish before axe samples colours — otherwise
      // it can catch an interpolated mid-transition colour that belongs
      // to neither theme and isn't what any real user ends up looking at.
      await group
        .getByRole('radio', { name: 'Light theme' })
        .check({ force: true });
      await waitForThemeTransition(page);
      await expectNoAxeViolations(page);

      await group
        .getByRole('radio', { name: 'Dark theme' })
        .check({ force: true });
      await waitForThemeTransition(page);
      await expectNoAxeViolations(page);
    });
  });
}
