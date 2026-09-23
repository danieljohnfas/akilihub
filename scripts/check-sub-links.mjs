import * as cheerio from 'cheerio';

async function checkSubLinks() {
  const url = 'https://www.hotnigerianjobs.com/hotjobs/961345/rand-merchant-bank-rmb-job-recruitment-5-positions.html';
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  $('.jobdetails_left_col a').each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (href && href.includes('/hotjobs/')) {
      console.log(`Link: "${text}" -> ${href}`);
    }
  });
}

checkSubLinks();
