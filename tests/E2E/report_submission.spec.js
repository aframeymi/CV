// E2E test. We check if users can fill out the form, submit it & then it being displayed in the right place.

// Playwright test helpers
import { test, expect } from '@playwright/test';

// Browser (end-to-end) test of the report form
test.describe('Report Submission Flow', () => {

// Fill in and submit the form, then check the report shows up on the track page
  test('should submit a report and display it on the track page', async ({ page }) => {
    
    // Open the report form
    await page.goto('http://localhost:4000/report'); 
    
    // Fill in the form fields
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="slug"]', 'Test Report Title');
    await page.fill('textarea[name="detail"]', 'This is a detailed description of the test report.');

    // Submit the form
    await page.click('button[type="submit"]');

    // Check that we were sent to the track page
    await expect(page).toHaveURL(/.*track/);
    
    // Check that the new report is visible there
    await expect(page.locator('.report-card:has-text("John Doe")')).toBeVisible();
    await expect(page.locator('text=Test Report Title')).toBeVisible(); 
    await expect(page.locator('text=This is a detailed description of the test report.')).toBeVisible(); 
  });
});
