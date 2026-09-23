import * as cheerio from 'cheerio';

async function checkHNJ() {
  const res = await fetch('https://www.hotnigerianjobs.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Pagination links on HNJ:');
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (text.match(/^\d+$/) || text.includes('Next') || href.includes('page') || href.includes('p='))) {
      console.log(`Text: "${text}" -> href: "${href}"`);
    }
  });
}

checkHNJ();
