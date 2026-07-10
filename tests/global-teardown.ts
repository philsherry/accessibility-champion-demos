import fs from 'node:fs';
import path from 'node:path';
import v8toIstanbul from 'v8-to-istanbul';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import { RAW_COVERAGE_DIR } from './utilities/coverage';
import { writeHtmlValidateReport } from './utilities/html-validate-report';

async function writeCoverageReport(): Promise<void> {
  if (!process.env.COVERAGE) return;
  if (!fs.existsSync(RAW_COVERAGE_DIR)) return;

  const map = libCoverage.createCoverageMap({});

  const files = fs
    .readdirSync(RAW_COVERAGE_DIR)
    .filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(RAW_COVERAGE_DIR, file), 'utf8');
    const entries: Array<{
      url: string;
      source: string;
      functions: Parameters<
        ReturnType<typeof v8toIstanbul>['applyCoverage']
      >[0];
    }> = JSON.parse(raw);

    for (const entry of entries) {
      // http-server serves public/ as the web root, so entry.url's path
      // (e.g. /assets/js/checkout.js) is missing the public/ prefix that
      // the rest of the repo (and tools like `fallow --coverage`) expect
      // relative to the project root — add it back.
      const scriptPath = 'public' + (new URL(entry.url).pathname || '/');
      const converter = v8toIstanbul(scriptPath, 0, { source: entry.source });
      await converter.load();
      converter.applyCoverage(entry.functions);
      map.merge(converter.toIstanbul());
    }
  }

  fs.rmSync(RAW_COVERAGE_DIR, { recursive: true, force: true });

  const outputDir = path.resolve('reports/coverage');
  fs.mkdirSync(outputDir, { recursive: true });

  const context = libReport.createContext({
    dir: outputDir,
    coverageMap: map,
  });
  reports.create('text').execute(context);
  reports.create('text-summary').execute(context);
  reports.create('html').execute(context);
  // Istanbul's standard coverage-final.json — not for humans, consumed by
  // `fallow health/audit --coverage` for real (not export-reference-
  // estimated) CRAP complexity scoring.
  reports.create('json').execute(context);
  sanitizeCoverageJson(path.join(outputDir, 'coverage-final.json'));

  console.log(
    `\nCoverage report written to ${path.join(outputDir, 'index.html')}`,
  );
}

/**
 * v8-to-istanbul emits `column: -1` on some synthetic branch locations
 * (e.g. an implicit default case) — a valid sentinel for "no exact
 * column", but fallow's coverage parser expects an unsigned integer and
 * rejects the file outright if it sees a negative one. Clamping to 0
 * loses nothing complexity scoring cares about (the branch's line number
 * is still exact) and keeps the file consumable by strict parsers.
 *
 * @param {string} filePath - Path to the coverage-final.json to rewrite in place.
 * @returns {void}
 */
function sanitizeCoverageJson(filePath: string): void {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const clampNegativeColumns = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(clampNegativeColumns);
      return;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.column === 'number' && obj.column < 0) obj.column = 0;
      Object.values(obj).forEach(clampNegativeColumns);
    }
  };
  clampNegativeColumns(data);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

// html-validate's report is written on every run (its tests always run);
// coverage is opt-in (see writeCoverageReport above, gated on COVERAGE=1).
export default async function globalTeardown(): Promise<void> {
  writeHtmlValidateReport();
  await writeCoverageReport();
}
