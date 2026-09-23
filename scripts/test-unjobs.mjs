import * as cheerio from 'cheerio';

async function testUnJobs() {
  const stations = [
    { name: 'Juba (South Sudan)', url: 'https://unjobs.org/duty_stations/juba' },
    { name: 'Goma (DRC)', url: 'https://unjobs.org/duty_stations/goma' },
    { name: 'Mogadishu (Somalia)', url: 'https://unjobs.org/duty_stations/mogadishu' },
    { name: 'Bujumbura (Burundi)', url: 'https://unjobs.org/duty_stations/bujumbura' },
  ];

  for (const st of stations) {
    try {
      console.log(`Testing ${st.name} at ${st.url}...`);
      const res = await fetch(st.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000)
      });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const jobs = [];
        $('.job, .job-item, a[href*="/vacancies/"]').each((i, el) => {
          const href = $(el).attr('href') || $(el).find('a').attr('href');
          const title = $(el).text().replace(/\s+/g, ' ').trim();
          if (href && title.length > 10 && !jobs.some(j => j.href === href)) {
            jobs.push({ href, title });
          }
        });
        console.log(`  Found ${jobs.length} jobs. Sample:`);
        jobs.slice(0, 3).forEach(j => console.log(`    - ${j.title.slice(0, 60)} -> ${j.href}`));
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testUnJobs();
