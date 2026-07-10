import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/playwright/html', open: 'never' }],
  ],
  outputDir: './reports/playwright/test-results',
  // No-op unless COVERAGE=1 (see tests/utilities/coverage.ts) — merges and
  // reports the JS coverage collected by tests/fixtures.ts's page fixture.
  globalTeardown: './tests/global-teardown.ts',
  use: {
    baseURL: 'http://127.0.0.1:4310',
    trace: 'retain-on-failure',
  },
  // Ordered mobile-first, matching this project's accessibility-first,
  // mobile-second design priority. Mobile and desktop viewports match the
  // README's documented screenshot standards (390×844 / 1440×900); tablet
  // sits between this site's two CSS breakpoints (640px, 900px).
  //
  // All three run under Chromium rather than each device preset's default
  // engine (iPhone/iPad presets default to WebKit) — this repo only installs
  // the Chromium browser (see .github/workflows/test.yml), and WebKit's
  // keyboard-Tab focus handling under touch emulation is unreliable in a
  // way that isn't a real product bug (Desktop/Chromium passes the same
  // assertions cleanly). Chromium with mobile viewport/touch emulation
  // still exercises the thing these tests care about: does keyboard
  // navigation survive this site's responsive layout at each width.
  projects: [
    {
      name: 'Mobile',
      use: { ...devices['iPhone 14'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npx http-server ./public -p 4310 -s',
    url: 'http://127.0.0.1:4310',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
