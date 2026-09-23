import * as cheerio from 'cheerio';

async function testETLink() {
  const url = 'https://jobwebethiopia.com/jobs/page/3/';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);

  const links = [];
  $('a[href*="/jobs/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text.length > 10) links.push({ href, text });
  });

  console.log(`Found ${links.length} links on page 3:`);
  links.slice(0, 5).forEach(l => console.log(`  ${l.text} -> ${l.href}`));
}

testETLink();
