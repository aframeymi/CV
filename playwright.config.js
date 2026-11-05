// Playwright helper for defining the test configuration
import { defineConfig } from '@playwright/test';


export default defineConfig({
  // Folder that contains the browser (end-to-end) tests
  testDir: './tests/E2E', 
  // Retry a failed test once before reporting it as failed
  retries: 1, 
  // Browser settings
  use: {
    // Run without opening a visible browser window
    headless: true, 
  },
});

