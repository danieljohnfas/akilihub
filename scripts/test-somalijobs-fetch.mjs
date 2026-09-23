import * as cheerio from 'cheerio';

async function parseJobsFetch() {
  const res = await fetch('https://somalijobs.com/jobs/fetch/', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: 'page=1&limit=20'
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('Links in response:');
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (href && (href.includes('job') || href.includes('detail') || href.includes('view') || text.length > 10)) {
      console.log(`  [${text}] -> ${href}`);
    }
  });

  // Also print card or item titles
  $('.job-item, .card, h3, h4, h5, .title').each((i, el) => {
    console.log(`  Item ${el.tagName}: ${$(el).text().replace(/\s+/g, ' ').trim().slice(0, 60)}`);
  });
}

parseJobsFetch();
