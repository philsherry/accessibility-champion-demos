import { test, expect } from '../fixtures';

// A cross-page journey — complements theme-toggle.spec.ts's per-page
// checks with "does the choice actually survive navigating to a
// different page," the same escalation cross-page-nav.spec.ts applies to
// aria-current.

test('dark mode chosen on one page persists after navigating to another', async ({
  page,
}) => {
  await page.goto('/index.html');
  await page
    .getByRole('group', { name: 'Colour scheme' })
    .getByRole('radio', { name: 'Dark theme' })
    // Required — see theme-toggle.spec.ts for why: the radio's own hit
    // area is clipped to 1x1px by design, so Playwright's actionability
    // check needs bypassing even though a real click event still fires.
    // eslint-disable-next-line playwright/no-force-option
    .check({ force: true });

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Subscriptions' })
    .click();
  await expect(page).toHaveURL(/subscriptions\.html/);

  await expect(page.locator('html')).toHaveAttribute(
    'data-user-color-scheme',
    'dark',
  );
  await expect(
    page
      .getByRole('group', { name: 'Colour scheme' })
      .getByRole('radio', { name: 'Dark theme' }),
  ).toBeChecked();
});
