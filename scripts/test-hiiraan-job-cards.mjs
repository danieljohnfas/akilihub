import * as cheerio from 'cheerio';

async function parseHiiraanCards() {
  const url = 'https://www.hiiraan.com/jobs.php';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const cards = [];
  $('.job-card').each((i, el) => {
    const a = $(el).find('a').first();
    const href = a.attr('href');
    const img = a.find('img').first();
    const alt = img.attr('alt');
    if (href) {
      cards.push({ href: href.startsWith('http') ? href : `https://www.hiiraan.com${href}`, employer: alt || 'Federal Government of Somalia' });
    }
  });

  console.log(`Found ${cards.length} official Somali vacancies / RFPs on Hiiraan:`);
  cards.slice(0, 10).forEach((c, idx) => {
    console.log(`  [${idx+1}] ${c.employer} -> ${c.href}`);
  });
}

parseHiiraanCards();
