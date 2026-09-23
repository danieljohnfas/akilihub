import * as cheerio from 'cheerio';

async function testHiiraanJobs() {
  const url = 'https://www.hiiraan.com/jobs.php';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  console.log(`Status: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('Title:', $('title').text());
  const jobLinks = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (href.includes('job') || href.includes('detail') || href.includes('view') || href.includes('article')) {
      if (text.length > 10 && !jobLinks.some(j => j.href === href)) {
        jobLinks.push({ text, href: href.startsWith('http') ? href : `https://www.hiiraan.com/${href.replace(/^\//, '')}` });
      }
    }
  });

  console.log(`Found ${jobLinks.length} job links on Hiiraan. Sample:`);
  jobLinks.slice(0, 5).forEach(j => console.log(`  [${j.text}] -> ${j.href}`));
}

testHiiraanJobs();
