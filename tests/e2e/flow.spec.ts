import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Device Repair Assistant - Full 7-Step User Flow', () => {
  let samplePhotoPath: string;

  test.beforeAll(() => {
    // Generate a minimal sample 1x1 JPG image for test uploads
    samplePhotoPath = path.resolve(process.cwd(), 'sample_test_device.jpg');
    // Minimal valid JPEG binary buffer
    const minimalJpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x00, 0xff, 0xd9
    ]);
    fs.writeFileSync(samplePhotoPath, minimalJpg);
  });

  test.afterAll(() => {
    if (fs.existsSync(samplePhotoPath)) {
      fs.unlinkSync(samplePhotoPath);
    }
  });

  test('completes the entire end-to-end 7-step customer repair journey', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // -------------------------------------------------------------------------
    // STEP 1: Authentication
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Customer Authentication');
    
    // Fill demo credentials
    await page.click('button:has-text("Insert Verified Demo Account")');
    await page.click('button[type="submit"]');

    // -------------------------------------------------------------------------
    // STEP 2: Photo Upload
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Upload Device Photo');
    
    // Upload sample file
    const fileInput = page.locator('#device-photo-input');
    await fileInput.setInputFiles(samplePhotoPath);

    // Wait for preview to appear
    await expect(page.locator('text=Photo Ready for Diagnostic Assessment')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Continue to Device Specs")');

    // -------------------------------------------------------------------------
    // STEP 3: Product Details
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Product Specifications & Fault Profile');
    
    // Verify brand rule validation works
    const modelInput = page.locator('#model-number');
    await modelInput.fill('A3106'); // Valid Apple model

    const serialInput = page.locator('#serial-number');
    await serialInput.fill('F2LNQ1P0M9'); // Valid Apple serial

    // Proceed to Step 4
    await page.click('button:has-text("Proceed to Budget & Area")');

    // -------------------------------------------------------------------------
    // STEP 4: Budget & Location
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Budget Threshold & Service Location');

    // Enter budget and pin code
    await page.locator('#budget-input').fill('25000');
    await page.locator('#pin-input').fill('560038');

    // Wait for service centre to be resolved
    await expect(page.locator('text=Indiranagar Central Service Hub')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=+91 80 4932 7700')).toBeVisible();

    // Submit Step 4
    await page.click('button:has-text("Generate Bench Estimate")');

    // -------------------------------------------------------------------------
    // STEP 5: Bench Estimate
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Bench Diagnostic Estimate', { timeout: 10000 });
    
    // Verify price figures and plain-language trade-off
    await expect(page.locator('text=Original Factory OEM Repair')).toBeVisible();
    await expect(page.locator('text=Certified Component-Level Alternative')).toBeVisible();
    await expect(page.locator('text=Plain-Language Technical Trade-off Note')).toBeVisible();

    // Click to compare replacement options (Step 6)
    await page.click('button:has-text("Compare 3 Replacement Options")');

    // -------------------------------------------------------------------------
    // STEP 6: Replacements Comparison Table
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Replacement Device Comparison', { timeout: 10000 });
    
    // Verify tabular layout (table rows)
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(3);
    await expect(page.locator('text=Algorithm Recommendation')).toBeVisible();

    // Click "Generate Itemised Final Bill"
    await page.click('button:has-text("Generate Itemised Final Bill")');

    // -------------------------------------------------------------------------
    // STEP 7: Final Bill
    // -------------------------------------------------------------------------
    await expect(page.locator('h2')).toContainText('Final Itemised Bill', { timeout: 10000 });
    
    // Check invoice elements
    await expect(page.locator('text=Taxable Subtotal:')).toBeVisible();
    await expect(page.locator('text=Total GST (18%):')).toBeVisible();
    await expect(page.locator('text=Grand Total (INR):')).toBeVisible();
    await expect(page.locator('text=Designated Authorised Service Centre')).toBeVisible();
    await expect(page.locator('text=+91 80 4932 7700')).toBeVisible();

    // Verify PDF download button exists
    const pdfButton = page.locator('button:has-text("Download Official PDF")');
    await expect(pdfButton).toBeVisible();

    // Verify "Start Over" resets the flow
    await page.click('button:has-text("Start Over")');
    await expect(page.locator('h2')).toContainText('Upload Device Photo');
  });
});
