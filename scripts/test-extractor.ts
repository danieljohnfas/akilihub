import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
  const pythonScript = `
from curl_cffi import requests
r = requests.get('https://www.brightermonday.co.ke/jobs/accounting-auditing-finance', impersonate='chrome110', timeout=30)
print(r.text)
`;
  const html = execSync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  
  const $ = cheerio.load(html);
  
  // Find job cards. Let's look at all links that have /listings/
  const listings: any[] = [];
  $('a[href*="/listings/"]').each((i, el) => {
    const url = $(el).attr('href');
    const title = $(el).text().trim();
    if (url && title && title.length > 5) {
      listings.push({ title, url });
    }
  });

  console.log('Found listings via links:', listings.length);
  console.log(listings.slice(0, 3));
}

main().catch(console.error);
