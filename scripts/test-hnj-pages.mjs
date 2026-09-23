import * as cheerio from 'cheerio';

async function testHNJ() {
  for (let p = 4; p <= 7; p++) {
    const u = `https://www.hotnigerianjobs.com/page/${p}/`;
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`HNJ page ${p}: HTTP ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = $('a[href*="/hotjobs/"]').length;
        console.log(`  Found ${links} job links on page ${p}`);
      }
    } catch (e) {
      console.log(`  Error on page ${p}: ${e.message}`);
    }
  }
}

testHNJ();
