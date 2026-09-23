import * as cheerio from 'cheerio';

async function checkBurundiJobs() {
  const res = await fetch('https://www.jobinburundi.com/adverts/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(10000)
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('a[href*="/job/"]').each((i, el) => {
    console.log(`Job link: ${$(el).text().trim()} -> ${$(el).attr('href')}`);
  });
}

checkBurundiJobs();
