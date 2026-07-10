import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FileSystemConfigLoader, HtmlValidate } from 'html-validate/node';
import { PAGES } from './utilities/pages';
import { recordHtmlValidateResult } from './utilities/html-validate-report';

// Validates browser-rendered HTML (after any inline <script> DOM manipulation
// has run) against html-validate:recommended — catches invalid nesting,
// duplicate IDs, and similar structural issues that a static-file linter like
// djlint can't see because they only exist once the page's JS has run.
// Config: .htmlvalidate.json at project root.

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const loader = new FileSystemConfigLoader();
const htmlvalidate = new HtmlValidate(loader);

async function validatePageHtml(page: Page): Promise<string[]> {
  const html = await page.content();
  const result = await htmlvalidate.validateString(
    html,
    path.join(PROJECT_ROOT, 'validate.html'),
  );
  if (result.valid) return [];
  return result.results.flatMap((r) =>
    r.messages.map(
      (m) => `[${m.ruleId}] line ${m.line}, col ${m.column}: ${m.message}`,
    ),
  );
}

test.describe('HTML structural validation', () => {
  for (const { path: pagePath } of PAGES) {
    test(`${pagePath} — clean state`, async ({ page }, testInfo) => {
      await page.goto(pagePath);
      const violations = await validatePageHtml(page);
      recordHtmlValidateResult(testInfo.testId, {
        label: `[${testInfo.project.name}] ${pagePath} — clean state`,
        violations,
      });
      expect(
        violations,
        `HTML violations on ${pagePath}:\n${violations.join('\n')}`,
      ).toHaveLength(0);
    });
  }

  test('/checkout.html — error state', async ({ page }, testInfo) => {
    await page.goto('/checkout.html');
    await page.locator('#cvc').fill('');
    await page.locator('#postcode').fill('NOTAPOSTCODE');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    const violations = await validatePageHtml(page);
    recordHtmlValidateResult(testInfo.testId, {
      label: `[${testInfo.project.name}] /checkout.html — error state`,
      violations,
    });
    expect(
      violations,
      `HTML violations on /checkout.html (error state):\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });
});
