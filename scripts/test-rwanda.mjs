import * as cheerio from 'cheerio';

async function testRwanda() {
  const urls = [
    'https://www.jobinrwanda.com/jobs/all',
    'https://www.jobinrwanda.com/jobs/all?page=1',
    'https://www.jobinrwanda.com/jobs/all?page=2',
    'https://www.jobinrwanda.com/jobs/all?page=3',
    'https://www.jobinrwanda.com/jobs/all?page=4',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`${u} -> HTTP ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = $('a[href*="/job/"]').length;
        console.log(`  Found ${links} job links on ${u}`);
      }
    } catch (e) {
      console.log(`  Error on ${u}: ${e.message}`);
    }
  }
}

testRwanda();
