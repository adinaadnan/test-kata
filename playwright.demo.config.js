import { defineConfig, devices } from '@playwright/test';

const automatic = process.env.DESK_DEMO_AUTO === '1';

export default defineConfig({
  testDir: './tests/demos',
  timeout: automatic ? 30000 : 0,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.DESK_URL || 'http://127.0.0.1:8088',
    viewport: { width: 1280, height: 800 },
    headless: automatic,
    launchOptions: { slowMo: automatic ? 0 : 450 },
  },
});
