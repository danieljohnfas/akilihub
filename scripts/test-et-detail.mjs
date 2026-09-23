import * as cheerio from 'cheerio';

async function testETDetail() {
  const url = 'https://jobwebethiopia.com/jobs/accountant-dega-group-trading-plc/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
  const res = await fetch(url, { headers });
  console.log(`Status: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('h1').text();
  const body = $('.entry-content, .job-description, .job-overview').first().text();
  console.log('Title:', title);
  console.log('Body length:', body.length);
  console.log('Article length:', $('article').text().length);
}

testETDetail();
