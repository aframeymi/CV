import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/E2E', 
  retries: 1, 
  use: {
    headless: true, 
  },
});
