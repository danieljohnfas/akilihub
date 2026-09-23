import * as cheerio from 'cheerio';

async function testETDetailUpdated() {
  const url = 'https://jobwebethiopia.com/jobs/accountant-dega-group-trading-plc/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const $$ = cheerio.load(html);

  let description = $$('.job-detail-description, .job-detail-description-details, .section_content, .entry-content, #mainContent').first().text().replace(/\s+/g, ' ').trim();
  console.log('Description length:', description.length);
  console.log('Preview:', description.slice(0, 150));
}

testETDetailUpdated();
