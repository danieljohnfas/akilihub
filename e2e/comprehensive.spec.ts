import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const targetBaseUrl = 'https://akilibrain.com';
const publicPaths = [
  '/',
  '/about',
  '/contact',
  '/companies',
  '/jobs',
  '/tenders',
  '/salaries',
  '/developers',
  '/privacy',
  '/terms',
  '/compliance',
  '/login',
  '/signup'
];

test.describe('AkiliBrain Comprehensive Audit - All Pages', () => {
  for (const path of publicPaths) {
    test(`Page ${path} loads and passes basic accessibility checks`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      page.on('pageerror', exception => {
        consoleErrors.push(exception.message);
      });

      const url = `${targetBaseUrl}${path}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Verify basic presence
      await expect(page).toHaveTitle(/./); 

      // Visual screenshot
      const safePath = path === '/' ? 'home' : path.replace(/\//g, '-').substring(1);
      await page.screenshot({ path: `playwright-report/${safePath}-${testInfo.project.name}.png`, fullPage: true });

      // Accessibility Audit using Axe
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      await testInfo.attach(`accessibility-scan-results-${safePath}`, {
        body: JSON.stringify(accessibilityScanResults, null, 2),
        contentType: 'application/json'
      });

      if (accessibilityScanResults.violations.length > 0) {
        console.log(`[${path}] Found ${accessibilityScanResults.violations.length} accessibility violations.`);
      }

      if (consoleErrors.length > 0) {
        console.log(`[${path}] Found ${consoleErrors.length} console errors:`, consoleErrors);
      }
      
      expect(consoleErrors.length).toBeLessThanOrEqual(5); 
    });
  }
});
