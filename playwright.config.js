// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/E2E', // Specify the Playwright test directory
  retries: 1, // Retry failed tests once
  use: {
    headless: true, // Run tests in headless mode
  },
});
