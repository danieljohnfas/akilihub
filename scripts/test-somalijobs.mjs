import * as cheerio from 'cheerio';

async function testSomaliJobs() {
  const urls = [
    'https://somalijobs.com/jobs',
    'https://somalijobs.com/jobs/category',
    'https://somalijobs.com/jobs/all',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000)
      });
      console.log(`${u} -> ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        console.log(`Title: ${$('title').text()}`);
        const jobs = [];
        $('a[href*="/jobs/"]').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          if (href && text.length > 5 && !jobs.some(j => j.href === href)) {
            jobs.push({ href, text });
          }
        });
        console.log(`Found ${jobs.length} job links. Sample:`, jobs.slice(0, 5));
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testSomaliJobs();
