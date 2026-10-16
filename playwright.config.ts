import { defineConfig } from '@playwright/test';

const PORT = 4300;

// Locally the installed Chrome is used; CI installs Playwright's Chromium (`npx playwright install --with-deps chromium`).
const channel = process.env['CI'] ? undefined : 'chrome';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'e2e-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
