import { test, expect } from '../fixtures';

// Complements admin.spec.ts's per-page checks with "does a saved status
// actually survive a reload" — same escalation theme-persistence.spec.ts
// applies to the colour-scheme toggle.

test('a saved status change survives a page reload', async ({ page }) => {
  await page.goto('/admin.html');

  const row = page.locator('tr[data-order-id="1042"]');
  await row.getByRole('combobox').selectOption('delivered');
  await row
    .getByRole('button', { name: 'Save status for order #1042' })
    .click();
  await expect(row.locator('.status-badge')).toHaveText('Delivered');

  await page.reload();

  const reloadedRow = page.locator('tr[data-order-id="1042"]');
  await expect(reloadedRow.locator('.status-badge')).toHaveText('Delivered');
  await expect(reloadedRow.getByRole('combobox')).toHaveValue('delivered');
});
