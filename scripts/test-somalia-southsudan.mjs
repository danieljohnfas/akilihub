import * as cheerio from 'cheerio';

async function testSomaliaSouthSudan() {
  const domains = [
    'https://www.somalijobs.net/',
    'https://somalijobs.com/',
    'https://www.somalijobs.org/',
    'https://southsudanjob.com/',
    'https://www.southsudanjobs.com/',
    'https://www.southsudanjob.net/',
  ];

  for (const d of domains) {
    try {
      const res = await fetch(d, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000)
      });
      console.log(`${d} -> Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = [];
        $('a').each((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          if (text.length > 15 && (href.includes('job') || href.includes('vacancy') || href.includes('detail'))) {
            links.push({ href, text });
          }
        });
        console.log(`  Found ${links.length} potential vacancy links. Sample:`, links.slice(0, 3));
      }
    } catch (e) {
      console.log(`${d} -> Error: ${e.message}`);
    }
  }
}

testSomaliaSouthSudan();
