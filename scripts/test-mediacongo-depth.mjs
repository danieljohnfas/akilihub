import * as cheerio from 'cheerio';

async function testPages() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  for (let p = 1; p <= 10; p++) {
    const url = `https://www.mediacongo.net/emplois-search--tri-offres_recentes-page-${p}.html`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log(`Page ${p}: HTTP ${res.status}`);
      break;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const links = $('a[href*="emploi-societe-"], a[href*="emploi-offre-"]').length;
    console.log(`Page ${p}: Found ${links} links`);
  }
}

testPages();
