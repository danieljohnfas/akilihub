import * as cheerio from 'cheerio';

async function testJobWebPages() {
  const configs = [
    { name: 'Ethiopia', base: 'https://jobwebethiopia.com/jobs/page/' },
    { name: 'Zambia', base: 'https://jobwebzambia.com/jobs/page/' },
    { name: 'Ghana', base: 'https://jobwebghana.com/jobs/page/' },
    { name: 'Kenya', base: 'https://jobwebkenya.com/jobs/page/' }
  ];

  for (const c of configs) {
    console.log(`\nTesting ${c.name}...`);
    for (let p = 3; p <= 6; p++) {
      try {
        const u = `${c.base}${p}/`;
        const res = await fetch(u, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          const links = $('a[href*="/jobs/"]').length;
          console.log(`  Page ${p}: HTTP 200, ~${links} links`);
        } else {
          console.log(`  Page ${p}: HTTP ${res.status}`);
        }
      } catch (e) {
        console.log(`  Page ${p}: Error ${e.message}`);
      }
    }
  }
}

testJobWebPages();
