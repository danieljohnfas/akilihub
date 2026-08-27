const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to https://akilibrain.com/jobs...');
  await page.goto('https://akilibrain.com/jobs', { waitUntil: 'domcontentloaded' });
  
  // Wait a bit for any client-side rendering (just in case)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const path = 'C:\\Users\\nnm\\.gemini\\antigravity\\brain\\a897c0c1-b2e8-4df5-a273-8b7084db86dd\\screenshot_8.png';
  await page.screenshot({ path: path, fullPage: true });
  
  console.log(`Screenshot saved to ${path}`);
  await browser.close();
})();
