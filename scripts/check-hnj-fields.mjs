import * as cheerio from 'cheerio';

async function checkFields() {
  const res = await fetch('https://www.hotnigerianjobs.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Category/field links on HNJ:');
  const fields = [];
  $('a[href*="/field/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && !fields.some(f => f.href === href)) {
      fields.push({ href, text });
    }
  });

  fields.forEach(f => console.log(`  ${f.text} -> ${f.href}`));
}

checkFields();
