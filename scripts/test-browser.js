const puppeteer = require('puppeteer');
(async () => {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  console.log('Navigating to https://akilibrain.com/jobs...');
  await page.goto('https://akilibrain.com/jobs', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => document.body.innerText);
  const showingMatch = text.match(/Showing \d+ of \d+ active positions/);
  
  if (showingMatch) {
    console.log('\nSUCCESS! Found text on page:', showingMatch[0]);
  } else if (text.includes('No active jobs found')) {
    console.log('\nFAILED! Found empty state on page: No active jobs found');
  } else {
    console.log('\nCOULD NOT FIND MATCH!');
  }
  
  await browser.close();
})();
