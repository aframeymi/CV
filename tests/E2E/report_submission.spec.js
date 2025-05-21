import { test, expect } from '@playwright/test';

test.describe('Report Submission Flow', () => {
  test('should submit a report and display it on the track page', async ({ page }) => {
    await page.goto('http://localhost:4000/report'); 
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="slug"]', 'Test Report Title');
    await page.fill('textarea[name="detail"]', 'This is a detailed description of the test report.');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*track/); 
    await expect(page.locator('.report-card:has-text("John Doe")')).toBeVisible();
    await expect(page.locator('text=Test Report Title')).toBeVisible(); 
    await expect(page.locator('text=This is a detailed description of the test report.')).toBeVisible(); 
  });
});
