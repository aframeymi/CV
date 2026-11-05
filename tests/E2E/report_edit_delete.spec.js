//An E2E test to see if we are able to add,edit & delete reports

// Playwright test helpers
import { test, expect } from '@playwright/test';

// Browser (end-to-end) tests for creating, deleting and editing a report
test.describe('Report Actions', () => {

  // Unique values so each run creates a different report
  const uniqueId = Date.now(); 
  const mockReport = {
    name: `Test Report ${uniqueId}`,
    slug: `test-report-${uniqueId}`,
    detail: 'This is a test report detail.',
  };


   // Before each test: reset the database, then create a report through the form
  test.beforeEach(async ({ page }) => {

    // Ask the server to clear the database
    await page.request.post('http://localhost:4000/reset-database');

    // Open the report form and wait until it is ready
    await page.goto('http://localhost:4000/report');
    await page.waitForSelector('form');
    await page.waitForSelector('textarea[name="detail"]');

    // Fill in and submit the form
    await page.fill('input[name="name"]', mockReport.name);
    await page.fill('input[name="slug"]', mockReport.slug);
    await page.fill('textarea[name="detail"]', mockReport.detail);
    await page.click('button[type="submit"]');

    
    // Check that the new report is listed on the track page
    await page.goto('http://localhost:4000/track');
    await expect(page.locator(`.report-card:has-text("${mockReport.name}")`)).toBeVisible();
  });

  // Test 1: clicking Delete removes the report from the list
  test('should delete a report', async ({ page }) => {
   
    await page.goto('http://localhost:4000/track');

    await page.locator(`form[action="/track/${mockReport.slug}/delete"] button`).click();

    await expect(page.locator(`.report-card:has-text("${mockReport.name}")`)).not.toBeVisible();
  });

  // Test 2: editing a report updates what the track page shows
  test('should edit a report', async ({ page }) => {
    const updatedReport = {
      name: 'Updated Report',
      slug: 'updated-report',
      detail: 'This is an updated test report detail.',
    };

    await page.goto(`http://localhost:4000/track/${mockReport.slug}/edit`);
    await page.waitForSelector('form'); 
    await page.waitForSelector('input[name="details"]'); 

    await expect(page.locator('form')).toBeVisible(); 

    await page.fill('input[name="details"]', updatedReport.detail); 
    await page.fill('input[name="name"]', updatedReport.name);
    await page.fill('input[name="slug"]', updatedReport.slug);
    await page.click('input[type="submit"]');

    await expect(page.locator(`.report-card:has-text("${updatedReport.name}")`)).toBeVisible();
    await expect(page.locator(`.report-card:has-text("${mockReport.name}")`)).not.toBeVisible();
  });
});
