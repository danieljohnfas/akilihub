import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch('https://www.ajiraleo.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const posts = [];
  $('article, .post, .entry-title a, h2 a, h3 a').each((i, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href');
    if (href && title && title.length > 10 && href.includes('ajiraleo.com/') && !posts.some(p => p.href === href)) {
      posts.push({ title, href });
    }
  });
  console.log('Posts found:', posts.length);
  for (const p of posts.slice(0, 5)) {
    console.log(`- ${p.title} -> ${p.href}`);
  }
}

test();
