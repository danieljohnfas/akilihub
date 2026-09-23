import * as cheerio from 'cheerio';

async function testHNJDetail() {
  const url = 'https://www.hotnigerianjobs.com/hotjobs/961345/rand-merchant-bank-rmb-job-recruitment-5-positions.html';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Title:', $('h1').first().text());
  console.log('Job details text length:', $('.jobdetails_left_col').text().length);

  // Check if there are sub job links or headings
  $('.jobdetails_left_col strong, .jobdetails_left_col b, .jobdetails_left_col h2, .jobdetails_left_col h3').each((i, el) => {
    const t = $(el).text().trim();
    if (t.toLowerCase().includes('job title') || t.toLowerCase().includes('position')) {
      console.log(`Sub-position: "${t}" -> Parent text: "${$(el).parent().text().slice(0, 100)}"`);
    }
  });
}

testHNJDetail();
