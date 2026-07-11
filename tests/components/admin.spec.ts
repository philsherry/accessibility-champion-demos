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
});
