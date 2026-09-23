import * as cheerio from 'cheerio';

async function testNextData() {
  const res = await fetch('https://somalijobs.com/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(8000)
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const nextData = $('#__NEXT_DATA__').html();
  if (nextData) {
    console.log('Found __NEXT_DATA__!');
    try {
      const parsed = JSON.parse(nextData);
      console.log('Keys in pageProps:', Object.keys(parsed.props?.pageProps || {}));
      console.log('Sample data:', JSON.stringify(parsed.props?.pageProps).slice(0, 500));
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
    }
  } else {
    console.log('No __NEXT_DATA__ found.');
    // Check script tags or fetch /api
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      if (src) console.log('Script:', src);
    });
  }
}

testNextData();
