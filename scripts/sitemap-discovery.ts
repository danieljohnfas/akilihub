import { execSync } from 'child_process';
import * as fs from 'fs';

const sitemaps = [
  'https://www.brightermonday.co.ke/sitemap-category-en.xml',
  'https://www.brightermonday.co.tz/sitemap-category-en.xml'
];

async function main() {
  let allUrls: string[] = [];

  for (const sitemap of sitemaps) {
    console.log(`Fetching ${sitemap}...`);
    try {
      const pythonScript = `
from curl_cffi import requests
import sys

try:
    r = requests.get('${sitemap}', impersonate='chrome110', timeout=30)
    parts = r.text.split('<loc>')
    for i in range(1, len(parts)):
        url = parts[i].split('</loc>')[0].strip()
        print(url)
except Exception as e:
    sys.exit(1)
`;
      const result = execSync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
      
      const urls = result.split('\n').map(s => s.trim()).filter(s => s.length > 0 && s.startsWith('http'));
      console.log(`Found ${urls.length} URLs in ${sitemap}`);
      allUrls.push(...urls);
    } catch (e) {
      console.error(`Failed to fetch ${sitemap}`);
    }
  }

  fs.writeFileSync('discovery-queue.json', JSON.stringify(allUrls, null, 2));
  console.log(`Total URLs discovered: ${allUrls.length}`);
}

main().catch(console.error);
