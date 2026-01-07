import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // All reports and artifacts go in e2e folder
  reporter: [
    ['html', { outputFolder: 'e2e/reports/html', open: 'never' }],
    ['json', { outputFile: 'e2e/reports/results.json' }],
    ['list'],
  ],

  // Test artifacts (traces, videos, screenshots on failure)
  outputDir: 'e2e/test-results',

  // Screenshot snapshots for visual testing
  snapshotDir: 'e2e/screenshots',

  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3333',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
