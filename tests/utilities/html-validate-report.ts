import fs from 'node:fs';
import path from 'node:path';

export interface HtmlValidateResult {
  label: string;
  violations: string[];
}

const RAW_DIR = path.resolve('reports/html-validate/.raw');
const OUTPUT_DIR = path.resolve('reports/html-validate');

// Always records — unlike coverage, html-validate.spec.ts runs on every
// `npm test`, so this report is generated on every run, not just an opt-in one.
export function recordHtmlValidateResult(
  testId: string,
  result: HtmlValidateResult,
): void {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RAW_DIR, `${testId}.json`),
    JSON.stringify(result),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function writeHtmlValidateReport(): void {
  if (!fs.existsSync(RAW_DIR)) return;

  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json'));
  const results: HtmlValidateResult[] = files
    .map((f) => JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), 'utf8')))
    .sort((a, b) => a.label.localeCompare(b.label));

  fs.rmSync(RAW_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'results.json'),
    JSON.stringify(results, null, 2),
  );

  const rows = results
    .map((r) => {
      const status =
        r.violations.length === 0
          ? '<span style="color: #1a7f37">pass</span>'
          : `<span style="color: #c9282d">${r.violations.length} violation${r.violations.length === 1 ? '' : 's'}</span>`;
      const detail = r.violations.length
        ? `<ul>${r.violations.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`
        : '';
      return `<tr><td>${escapeHtml(r.label)}</td><td>${status}${detail}</td></tr>`;
    })
    .join('\n');

  const totalViolations = results.reduce((n, r) => n + r.violations.length, 0);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.html'),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HTML validation report</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin: 2rem; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
  th { background: #f6f6f6; }
  ul { margin: 0.25rem 0 0; padding-left: 1.25rem; }
</style>
</head>
<body>
<h1>HTML validation report</h1>
<p>${results.length} page state${results.length === 1 ? '' : 's'} checked, ${totalViolations} violation${totalViolations === 1 ? '' : 's'} total.</p>
<table>
<thead><tr><th>Page state</th><th>Result</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`,
  );

  console.log(
    `\nHTML validation report written to ${path.join(OUTPUT_DIR, 'index.html')}`,
  );
}
