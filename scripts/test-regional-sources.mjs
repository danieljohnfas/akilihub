import * as cheerio from 'cheerio';

async function testPortals() {
  const portals = [
    { name: 'JobWebEthiopia', url: 'https://jobwebethiopia.com/' },
    { name: 'JobWebZambia', url: 'https://jobwebzambia.com/' },
    { name: 'JobWebGhana', url: 'https://jobwebghana.com/' },
  ];

  for (const p of portals) {
    try {
      console.log(`Checking ${p.name} (${p.url})...`);
      const res = await fetch(p.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000)
      });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const jobLinks = [];
        $('a[href*="/jobs/"]').each((i, el) => {
          const href = $(el).attr('href');
          const title = $(el).text().trim();
          if (href && title.length > 15 && !jobLinks.some(j => j.href === href)) {
            jobLinks.push({ href, title });
          }
        });
        console.log(`  Found ${jobLinks.length} job links on homepage. Sample:`);
        jobLinks.slice(0, 3).forEach(j => console.log(`    - [${j.title}] -> ${j.href}`));

        const categories = [];
        $('a[href*="/job-category/"]').each((i, el) => {
          const href = $(el).attr('href');
          const cat = $(el).text().trim();
          if (href && cat.length > 2 && !categories.some(c => c.href === href)) {
            categories.push({ href, cat });
          }
        });
        console.log(`  Found ${categories.length} categories. Sample:`);
        categories.slice(0, 5).forEach(c => console.log(`    - [${c.cat}] -> ${c.href}`));
      }
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }
}

testPortals();
