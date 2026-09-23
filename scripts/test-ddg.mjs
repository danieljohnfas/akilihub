import * as cheerio from 'cheerio';

async function test() {
  const query = 'site:lever.co jobs Tanzania';
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    body: 'q=' + encodeURIComponent(query),
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls = [];
  $('a.result__url, a.result__snippet, .result__title a').each((i, el) => {
    let href = $(el).attr('href');
    if (href && href.startsWith('//duckduckgo.com/l/?uddg=')) {
      href = decodeURIComponent(href.replace('//duckduckgo.com/l/?uddg=', '').split('&')[0]);
    }
    if (href && !urls.includes(href)) urls.push(href);
  });
  console.log('Found URLs:', urls.length);
  for (const u of urls.slice(0, 8)) {
    console.log('-', u);
  }
}

test();
