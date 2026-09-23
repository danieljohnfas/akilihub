import * as cheerio from 'cheerio';

async function testSubDetail() {
  const url = 'https://www.hotnigerianjobs.com/hotjobs/961330/debt-financing-solutions-senior-transactor-at-rand.html';
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const desc = $('.jobdetails_left_col').text().replace(/\s+/g, ' ').trim();

  console.log('Title:', title);
  console.log('Desc length:', desc.length);
  console.log('Desc preview:', desc.slice(0, 300));
}

testSubDetail();
