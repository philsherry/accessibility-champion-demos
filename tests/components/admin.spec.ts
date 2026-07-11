import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures';
import { expectNoAxeViolations } from '../axe-helpers';

// .filter-btn animates its colour change on `aria-pressed` toggling
// (transition: all var(--transition-fast) in base.css) — scanning
// immediately after a click can catch axe mid-transition on an
// interpolated colour that belongs to neither state and isn't what any
// real user ends up looking at. Same class of flake already fixed for
// the theme toggle's bg/text transition (theme-toggle.spec.ts);
// --transition-fast is 150ms, so a 300ms fallback matches that fix's
// safety margin.
async function waitForFilterTransition(button: Locator): Promise<void> {
  await button.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        const done = () => {
          el.removeEventListener('transitionend', done);
          resolve();
        };
        el.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 300);
      }),
  );
}

test.describe('admin — order management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin.html');
  });

  test('is reachable with no login prompt', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Staff — order management',
    );
  });

  test('shows the current status for each order', async ({ page }) => {
    const row = page.locator('tr[data-order-id="1042"]');
    await expect(row.getByRole('combobox')).toHaveValue('processing');
    await expect(row.locator('.status-badge')).toHaveText('Processing');
  });

  test('changing the select does not save until Save is pressed', async ({
    page,
  }) => {
    const row = page.locator('tr[data-order-id="1042"]');
    await row.getByRole('combobox').selectOption('shipped');

    // Badge unchanged — selecting a value alone must not commit it
    // (avoids a WCAG 3.2.2 change-of-context from the <select> itself).
    await expect(row.locator('.status-badge')).toHaveText('Processing');
  });

  test('pressing Save updates the badge and announces the change', async ({
    page,
  }) => {
    const row = page.locator('tr[data-order-id="1042"]');
    await row.getByRole('combobox').selectOption('shipped');
    await row
      .getByRole('button', { name: 'Save status for order #1042' })
      .click();

    await expect(row.locator('.status-badge')).toHaveText('Shipped');
    await expect(page.locator('#admin-status')).toHaveText(
      'Order #1042 marked as Shipped.',
    );
  });

  test('filtering to one status shows only matching rows and announces the count', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Shipped' }).click();

    await expect(page.locator('tr[data-order-id="1041"]')).toBeVisible();
    await expect(page.locator('tr[data-order-id="1040"]')).toBeVisible();
    await expect(page.locator('tr[data-order-id="1042"]')).toBeHidden();
    await expect(page.locator('#admin-status')).toHaveText(
      'Showing 2 Shipped orders.',
    );
  });

  test('returning to "All orders" shows every row again', async ({ page }) => {
    await page.getByRole('button', { name: 'Shipped' }).click();
    await page.getByRole('button', { name: 'All orders' }).click();

    await expect(page.locator('tr[data-order-id]')).toHaveCount(6);
    await expect(page.locator('#admin-status')).toHaveText(
      'Showing all 6 orders.',
    );
  });

  test('has no accessibility violations, filtered and with a status mid-edit', async ({
    page,
  }) => {
    await expectNoAxeViolations(page);

    await page.getByRole('button', { name: 'Processing' }).click();
    await waitForFilterTransition(
      page.getByRole('button', { name: 'All orders' }),
    );
    await expectNoAxeViolations(page);

    // Mid-edit: a value selected but not yet saved.
    await page
      .locator('tr[data-order-id="1038"]')
      .getByRole('combobox')
      .selectOption('delivered');
    await expectNoAxeViolations(page);
  });

  test('status select options are colour-coded and icon-tagged for every status', async ({
    page,
  }) => {
    // This repo's Chromium (bundled with the pinned Playwright version)
    // supports `appearance: base-select` unconditionally — confirmed
    // directly via getComputedStyle() before writing this test, see
    // docs/superpowers/specs/2026-07-11-admin-status-select-icons-design.md's
    // "Verification" section. No feature-detection/skip needed here.
    //
    // Every <select> on this page carries all 4 <option>s regardless of
    // which one is selected for that row, so checking row #1042's select
    // alone (mixing its one selected option with three unselected ones)
    // covers all 4 statuses' styling without looping over every row.
    const expectations = [
      {
        value: 'processing',
        label: 'Processing',
        bg: 'rgb(254, 243, 199)',
        color: 'rgb(146, 64, 14)',
      },
      {
        value: 'shipped',
        label: 'Shipped',
        bg: 'rgb(224, 242, 254)',
        color: 'rgb(7, 89, 133)',
      },
      {
        value: 'delivered',
        label: 'Delivered',
        bg: 'rgb(220, 252, 231)',
        color: 'rgb(22, 101, 52)',
      },
      {
        value: 'cancelled',
        label: 'Cancelled',
        bg: 'rgb(243, 244, 246)',
        color: 'rgb(87, 83, 78)',
      },
    ];

    for (const { value, label, bg, color } of expectations) {
      const result = await page.evaluate((value) => {
        const option = document.querySelector(
          `#status-1042 option[value="${value}"]`,
        );
        if (!option) return null;
        const style = getComputedStyle(option);
        const use = option.querySelector('svg.icon use');
        const span = option.querySelector('span');
        const symbolId = use ? use.getAttribute('href')?.slice(1) : null;
        return {
          display: style.display,
          gap: style.gap,
          backgroundColor: style.backgroundColor,
          color: style.color,
          spanText: span ? span.textContent : null,
          symbolId,
          symbolExists: symbolId
            ? Boolean(document.getElementById(symbolId))
            : false,
        };
      }, value);

      expect(result?.display).toBe('flex');
      expect(result?.gap).toBe('8px');
      expect(result?.backgroundColor).toBe(bg);
      expect(result?.color).toBe(color);
      expect(result?.spanText).toBe(label);
      expect(result?.symbolId).toBe(`icon-${value}`);
      expect(result?.symbolExists).toBe(true);
    }
  });
});
