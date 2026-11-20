import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/marymath/',
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    locale: 'uk-UA',
  },
  projects: [{ name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, hasTouch: true } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/marymath/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
