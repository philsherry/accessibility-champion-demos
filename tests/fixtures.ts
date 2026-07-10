import { test as base } from '@playwright/test';
import { startCoverage, stopCoverage } from './utilities/coverage';

// Every spec file imports test/expect from here instead of directly from
// @playwright/test, so JS coverage (see utilities/coverage.ts) is captured
// uniformly across the whole suite. A no-op wrapper when COVERAGE isn't set.
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await startCoverage(page);
    await use(page);
    await stopCoverage(page, testInfo.testId);
  },
});

export { expect } from '@playwright/test';
