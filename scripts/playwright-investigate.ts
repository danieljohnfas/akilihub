import { chromium } from 'playwright';

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to Safaricom careers...");
  await page.goto('https://www.safaricom.co.ke/careers/');
  
  console.log("Extracting external links to find the ATS portal...");
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href.includes('oraclecloud.com') || href.includes('myworkdayjobs') || href.includes('taleo.net') || href.includes('successfactors') || href.includes('apply'));
  });

  console.log("Found Links:", Array.from(new Set(links)));

  console.log("Navigating to KCB Group careers...");
  await page.goto('https://kcbgroup.com/careers');
  const linksKCB = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href.includes('taleo.net') || href.includes('myworkdayjobs') || href.includes('oraclecloud') || href.includes('apply') || href.includes('vacancies') || href.includes('jobs'));
  });

  console.log("Found KCB Links:", Array.from(new Set(linksKCB)));

  await browser.close();
}

main().catch(console.error);
