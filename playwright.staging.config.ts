import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL?.trim();

if (!baseURL || !/^https:\/\//i.test(baseURL)) {
  throw new Error('E2E_BASE_URL must be the deployed staging HTTPS origin');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.staging.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/staging' }]],
  outputDir: 'test-results/staging',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'staging-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
