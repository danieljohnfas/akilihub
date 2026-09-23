import * as cheerio from 'cheerio';

async function testMediaCongo() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  const urls = [
    'https://www.mediacongo.net/emplois.html',
    'https://www.mediacongo.net/emplois-1.html',
    'https://www.mediacongo.net/emplois-7.html',
    'https://www.mediacongo.net/emplois-21.html',
    'https://www.mediacongo.net/emplois-22.html'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, { headers, signal: AbortSignal.timeout(8000) });
      console.log(`${u}: HTTP ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = $('a[href*="emploi-societe-"], a[href*="emploi-offre-"]').length;
        console.log(`  Found ${links} job links`);
      }
    } catch (e) {
      console.log(`  Error ${u}: ${e.message}`);
    }
  }
}

testMediaCongo();
