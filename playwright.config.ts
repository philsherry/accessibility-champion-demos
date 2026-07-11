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
    baseURL: 'http://127.0.0.1:4312',
    trace: 'retain-on-failure',
    // html { scroll-behavior: smooth } (base.css) animates
    // programmatic/anchor scrolling; without this, Playwright's
    // auto-scroll-then-click can dispatch the click before the scroll
    // animation settles, landing it on whatever element is still
    // sliding past instead of the intended target — a real failure
    // mode found clicking a CTA deep in subscriptions.html's
    // horizontally-scrollable comparison table, not something a real
    // touchscreen user hits (they don't tap until the scroll visually
    // stops). tokens.css already defines `scroll-behavior: auto` under
    // `prefers-reduced-motion: reduce`; emulating that preference here
    // exercises that existing CSS path instead of adding new behaviour,
    // and removes this whole class of scroll-timing race for every test.
    contextOptions: {
      reducedMotion: 'reduce',
    },
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
    command: 'npx http-server ./public -p 4312 -s',
    url: 'http://127.0.0.1:4312',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
