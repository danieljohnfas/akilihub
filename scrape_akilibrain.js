const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  console.log('Navigating to https://akilibrain.com ...');
  try {
    await page.goto('https://akilibrain.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log('Caught navigation error, continuing anyway:', e.message);
  }
  
  // Wait a moment for dynamic content
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Extracting page title and main headings...');
  const data = await page.evaluate(() => {
    const title = document.title;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()).filter(t => t);
    const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text);
    return { title, headings, links: links.slice(0, 10) };
  });
  
  console.log('--- SCRAPE RESULTS ---');
  console.log(JSON.stringify(data, null, 2));
  
  await browser.close();
})();
