const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

async function checkAndScreenshot() {
  console.log('Waiting for Vercel deployment...');
  
  for (let i = 0; i < 20; i++) {
    console.log('Checking HTML (Attempt ' + (i+1) + ')...');
    try {
      const html = execSync('curl -s -H "User-Agent: Mozilla/5.0" https://akilibrain.com/jobs').toString();
      if (html.includes('Showing')) {
        console.log('SUCCESS! Jobs found in HTML. Taking screenshot...');
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto('https://akilibrain.com/jobs', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        
        await page.screenshot({ path: 'C:/Users/nnm/.gemini/antigravity/brain/a897c0c1-b2e8-4df5-a273-8b7084db86dd/screenshot_7.png', fullPage: true });
        console.log('Screenshot 7 saved successfully!');
        await browser.close();
        return;
      } else {
        console.log('Still no jobs in HTML. Waiting 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch(e) {
      console.error('Error during check:', e.message);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  console.log('Failed to find jobs after 10 attempts.');
}

checkAndScreenshot();
