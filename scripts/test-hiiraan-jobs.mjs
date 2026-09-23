import * as cheerio from 'cheerio';

async function checkJobs() {
  const url = 'https://www.hiiraan.com/jobs.php';
  console.log(`Fetching ${url}...`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log('Title:', $('title').text().trim());

  const firstA = $('a[href*=".pdf"]').first();
  console.log('firstA outerHTML:', firstA.prop('outerHTML'));
  console.log('firstA parent outerHTML:', firstA.parent().prop('outerHTML'));
  console.log('firstA grandparent outerHTML:', firstA.parent().parent().prop('outerHTML'));
}

checkJobs();
