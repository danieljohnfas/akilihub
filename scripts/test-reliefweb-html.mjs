import * as cheerio from 'cheerio';

async function testReliefwebCities() {
  const urls = [
    'https://reliefweb.int/jobs?search=Mogadishu',
    'https://reliefweb.int/jobs?search=Juba',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000)
      });
      console.log(`${u} -> ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = [];
        $('.rw-river-article__title a').each((i, el) => {
          const href = $(el).attr('href');
          const title = $(el).text().trim();
          if (href && title && href.includes('/job/')) {
            links.push({ href: href.startsWith('http') ? href : `https://reliefweb.int${href}`, title });
          }
        });
        console.log(`  Found ${links.length} verified jobs. Sample:`, links.slice(0, 3));
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testReliefwebCities();
