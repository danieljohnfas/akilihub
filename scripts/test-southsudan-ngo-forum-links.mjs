import * as cheerio from 'cheerio';

async function printNgoForumLinks() {
  const res = await fetch('https://southsudanngoforum.org/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('All links on southsudanngoforum.org:');
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 2 && !href.startsWith('#')) {
      console.log(`  [${text}] -> ${href}`);
    }
  });
}

printNgoForumLinks();
