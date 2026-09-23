import * as cheerio from 'cheerio';

async function printHNJText() {
  const url = 'https://www.hotnigerianjobs.com/hotjobs/961345/rand-merchant-bank-rmb-job-recruitment-5-positions.html';
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log($('.jobdetails_left_col').text().slice(0, 1000));
}

printHNJText();
