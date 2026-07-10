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
      const scriptPath = new URL(entry.url).pathname || '/';
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

  console.log(
    `\nCoverage report written to ${path.join(outputDir, 'index.html')}`,
  );
}

// html-validate's report is written on every run (its tests always run);
// coverage is opt-in (see writeCoverageReport above, gated on COVERAGE=1).
export default async function globalTeardown(): Promise<void> {
  writeHtmlValidateReport();
  await writeCoverageReport();
}
