import * as cheerio from 'cheerio';

async function testUgandaPages() {
  for (const p of [31, 35, 40, 50]) {
    const url = `https://www.brightermonday.co.ug/jobs?page=${p}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000)
      });
      console.log(`Page ${p} -> Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = [];
        $('a[href*="/listings/"]').each((i, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        console.log(`  Page ${p} has ${links.length} listing links.`);
      }
    } catch (e) {
      console.log(`Page ${p} error: ${e.message}`);
    }
  }
}

testUgandaPages();
