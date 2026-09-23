import * as cheerio from 'cheerio';

async function testHNJField() {
  const url = 'https://www.hotnigerianjobs.com/field/229/'; // Finance
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  const res = await fetch(url, { headers });
  console.log(`Finance Field status: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobLinks = [];
  $('a[href*="/hotjobs/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (href && text.length > 10 && !jobLinks.some(j => j.href === href)) {
      jobLinks.push({ href: href.startsWith('http') ? href : `https://www.hotnigerianjobs.com${href}`, text });
    }
  });

  console.log(`Found ${jobLinks.length} finance job links on HNJ. Sample:`);
  jobLinks.slice(0, 5).forEach(j => console.log(`  [${j.text}] -> ${j.href}`));
}

testHNJField();
