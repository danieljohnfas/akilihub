import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function testJwk() {
  const url = 'https://jobwebkenya.com/jobs/senior-nurse-lecturer-karen-hospital/';
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const html = await res.text();
  
  const matches = html.match(/data-cfemail="([a-f0-9]+)"/gi) || [];
  console.log('CF email matches:', matches);

  // Print raw HTML of Method of Application
  const idx = html.indexOf('Method of Application');
  if (idx !== -1) {
    console.log('Raw HTML around Method of Application:');
    console.log(html.slice(idx, idx + 400));
  }
}

testJwk();
