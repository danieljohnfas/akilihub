import * as cheerio from 'cheerio';

async function testSites() {
  console.log('Testing MediaCongo pages 1 to 5...');
  for (let p = 1; p <= 5; p++) {
    try {
      const url = `https://www.mediacongo.net/emplois-${p}.html`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`MediaCongo page ${p}: HTTP ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = $('a[href*="emploi-societe-"], a[href*="emploi-offre-"]').length;
        console.log(`  Found ${links} job links on page ${p}`);
      }
    } catch (e) {
      console.log(`  Error on page ${p}: ${e.message}`);
    }
  }

  console.log('\nTesting JobInBurundi pages 0 to 6...');
  for (let p = 0; p <= 6; p++) {
    try {
      const url = `https://www.jobinburundi.com/adverts/jobs?page=${p}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`JobInBurundi page ${p}: HTTP ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = $('a[href*="/job/"]').length;
        console.log(`  Found ${links} job links on page ${p}`);
      }
    } catch (e) {
      console.log(`  Error on page ${p}: ${e.message}`);
    }
  }
}

testSites();
