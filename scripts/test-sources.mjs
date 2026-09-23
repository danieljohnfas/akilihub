import * as cheerio from 'cheerio';

async function test() {
  for (const station of ['mogadishu', 'bujumbura', 'kinshasa']) {
    try {
      const url = `https://unjobs.org/duty_stations/${station}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(8000)
      });
      console.log(`Station ${station} Status:`, res.status);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const jobs = [];
        $('a[class*="job"], div.job a').each((i, el) => {
          jobs.push({ text: $(el).text().trim(), href: $(el).attr('href') });
        });
        console.log(`  Found ${jobs.length} jobs for ${station}:`, jobs.slice(0, 3));
      }
    } catch (e) {
      console.log(`Station ${station} Error:`, e.message);
    }
  }
}
test();
