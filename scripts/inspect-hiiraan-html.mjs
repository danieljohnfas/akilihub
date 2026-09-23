import * as cheerio from 'cheerio';

async function inspectHiiraan() {
  const url = 'https://www.hiiraan.com/jobs.php';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('Tables:', $('table').length);
  $('tr, td, li, p').each((i, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.includes('Position') || text.includes('Closing Date') || text.includes('Mogadishu') || text.includes('Hargeisa') || text.includes('Somalia')) {
      if (text.length > 20 && text.length < 300) {
        console.log(`Element ${el.tagName}: ${text}`);
      }
    }
  });

  console.log('\nAll links on page:');
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 15) {
      console.log(`  [${text}] -> ${href}`);
    }
  });
}

inspectHiiraan();
