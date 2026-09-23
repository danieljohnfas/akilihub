import * as cheerio from 'cheerio';

async function checkPagination() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  const res = await fetch('https://www.mediacongo.net/emplois.html', { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Pagination links on mediacongo:');
  $('a[href*="emploi"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (text.match(/^\d+$/) || text.includes('Page') || text.includes('Suivant') || href.includes('page') || href.includes('p='))) {
      console.log(`Text: "${text}" -> href: "${href}"`);
    }
  });
}

checkPagination();
