import * as cheerio from 'cheerio';

async function testSomaliaPortals() {
  const urls = [
    'https://somaliangoconsortium.org/',
    'https://somaliangoconsortium.org/career/',
    'https://somalia.un.org/en/jobs',
    'https://www.somalijobs.com/jobs/category/ngo-social-services',
  ];

  for (const u of urls) {
    try {
      console.log(`Checking ${u}...`);
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000)
      });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        console.log(`  Title: ${$('title').text().trim()}`);
        const links = [];
        $('a').each((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          if (href.includes('job') || href.includes('career') || href.includes('vacanc')) {
            links.push({ text: text.slice(0, 40), href });
          }
        });
        console.log(`  Found ${links.length} relevant links. Sample:`, links.slice(0, 3));
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testSomaliaPortals();
