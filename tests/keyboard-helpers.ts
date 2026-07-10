import { expect, type Page } from '@playwright/test';

export async function expectSkipLinkBypassesHeader(page: Page): Promise<void> {
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');

  const bypassedHeader = await page.evaluate(() => {
    const active = document.activeElement;
    return active !== null && active.closest('header') === null;
  });
  expect(bypassedHeader, 'Tab after the skip link should not land back inside <header>').toBe(true);
}

export async function expectFullKeyboardTraversalStaysVisible(
  page: Page,
  tabPresses: number
): Promise<void> {
  for (let i = 0; i < tabPresses; i++) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return { skip: true } as const;

      // Check the focused element AND every ancestor — a focusable element
      // can be hidden by an ancestor's [hidden]/aria-hidden/display:none/
      // visibility:hidden without carrying any of those attributes itself.
      let node: HTMLElement | null = el;
      while (node) {
        const style = getComputedStyle(node);
        const hiddenHere =
          node.hasAttribute('hidden') ||
          node.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' ||
          style.visibility === 'hidden';
        if (hiddenHere) {
          return { skip: false, hidden: true, focusedTag: el.tagName, hiddenTag: node.tagName } as const;
        }
        node = node.parentElement;
      }
      return { skip: false, hidden: false } as const;
    });

    if (result.skip) continue;
    expect(
      result.hidden,
      result.hidden
        ? `Tab ${i + 1} landed on <${result.focusedTag}>, hidden via an ancestor <${result.hiddenTag}>`
        : ''
    ).toBe(false);
  }
}
