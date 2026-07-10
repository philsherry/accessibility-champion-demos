import { test, expect } from '../fixtures';

// A keyboard-only journey across multiple pages via the header nav —
// complements header-site.spec.ts's per-page aria-current snapshots with
// "does this still hold across a real multi-hop journey," and confirms
// each hop is actually keyboard-operable (focus + Enter), not just
// clickable.

test('keyboard-only journey across pages keeps aria-current correct at every stop', async ({
  page,
}) => {
  await page.goto('/index.html');
  const nav = page.getByRole('navigation', { name: 'Main' });

  await nav.getByRole('link', { name: 'Subscriptions' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/subscriptions\.html/);
  await expect(
    nav.getByRole('link', { name: 'Subscriptions' }),
  ).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'My Orders' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/orders\.html/);
  await expect(nav.getByRole('link', { name: 'My Orders' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // Cart link, not a nav link — checkout.html's special case (see
  // tests/utilities/pages.ts).
  await page.getByRole('link', { name: /^Cart,/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/checkout\.html/);
  await expect(page.getByRole('link', { name: /^Cart,/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
