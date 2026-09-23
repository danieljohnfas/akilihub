import * as cheerio from 'cheerio';

async function inspectBurundiCongo() {
  // 1. Burundi
  try {
    const resB = await fetch('https://www.jobinburundi.com/jobs', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    console.log(`JobInBurundi /jobs: ${resB.status}`);
    if (resB.ok) {
      const htmlB = await resB.text();
      const $B = cheerio.load(htmlB);
      const jobsB = [];
      $B('article, .views-row, a[href*="/job/"]').each((i, el) => {
        const link = $B(el).find('a[href*="/job/"]').first();
        const href = link.attr('href') || $B(el).attr('href');
        const title = link.text().trim() || $B(el).text().trim();
        if (href && title.length > 5 && !jobsB.some(j => j.href === href)) {
          jobsB.push({ href: href.startsWith('http') ? href : `https://www.jobinburundi.com${href}`, title });
        }
      });
      console.log(`  Found ${jobsB.length} Burundi job links. Sample:`);
      jobsB.slice(0, 5).forEach(j => console.log(`    - ${j.title.slice(0, 50)} -> ${j.href}`));
    }
  } catch (e) {
    console.log(`Burundi error: ${e.message}`);
  }

  // 2. MediaCongo
  try {
    const resC = await fetch('https://www.mediacongo.net/emplois.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    console.log(`MediaCongo /emplois.html: ${resC.status}`);
    if (resC.ok) {
      const htmlC = await resC.text();
      const $C = cheerio.load(htmlC);
      const jobsC = [];
      $C('a[href*="emploi-"]').each((i, el) => {
        const href = $C(el).attr('href');
        const title = $C(el).text().replace(/\s+/g, ' ').trim();
        if (href && title.length > 10 && !jobsC.some(j => j.href === href)) {
          jobsC.push({ href: href.startsWith('http') ? href : `https://www.mediacongo.net/${href.replace(/^\//, '')}`, title });
        }
      });
      console.log(`  Found ${jobsC.length} MediaCongo job links. Sample:`);
      jobsC.slice(0, 5).forEach(j => console.log(`    - ${j.title.slice(0, 50)} -> ${j.href}`));
    }
  } catch (e) {
    console.log(`MediaCongo error: ${e.message}`);
  }
}

inspectBurundiCongo();
