import * as cheerio from 'cheerio';

async function testBurundiHome() {
  const res = await fetch('https://www.jobinburundi.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(10000)
  });
  console.log(`Status: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('Title:', $('title').text());
  console.log('Links count:', $('a').length);
  $('a').slice(0, 20).each((i, el) => {
    console.log(`  [${$(el).text().trim()}] -> ${$(el).attr('href')}`);
  });
}

testBurundiHome();
