import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Opt-in: `npm test` runs with this unset, so startCoverage/stopCoverage are
// no-ops and every other test keeps its normal near-zero overhead. Only
// `npm run test:coverage` sets COVERAGE=1.
const ENABLED = !!process.env.COVERAGE;

export const RAW_COVERAGE_DIR = path.resolve('reports/coverage/.raw');

export async function startCoverage(page: Page): Promise<void> {
  if (!ENABLED) return;
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
}

export async function stopCoverage(page: Page, testId: string): Promise<void> {
  if (!ENABLED) return;

  const entries = await page.coverage.stopJSCoverage();

  // Only this site's own served files — nothing third-party is loaded, but
  // Chromium occasionally reports internal/extension scripts with no
  // meaningful source, so keep the filter anyway rather than assume.
  const ownEntries = entries.filter(
    (entry) => entry.url.includes('127.0.0.1:4310') && entry.source,
  );
  if (ownEntries.length === 0) return;

  fs.mkdirSync(RAW_COVERAGE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RAW_COVERAGE_DIR, `${testId}.json`),
    JSON.stringify(ownEntries),
  );
}
