import * as cheerio from 'cheerio';

async function testPager() {
  const r0 = await fetch('https://www.jobinrwanda.com/jobs/all?page=0', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
  const r1 = await fetch('https://www.jobinrwanda.com/jobs/all?page=1', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
  const r10 = await fetch('https://www.jobinrwanda.com/jobs/all?page=10', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
  const r20 = await fetch('https://www.jobinrwanda.com/jobs/all?page=20', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());

  const ch0 = cheerio.load(r0);
  const ch1 = cheerio.load(r1);
  const ch10 = cheerio.load(r10);
  const ch20 = cheerio.load(r20);

  console.log('page 0 first job:', ch0('a[href*="/job/"]').first().text().trim());
  console.log('page 1 first job:', ch1('a[href*="/job/"]').first().text().trim());
  console.log('page 10 first job:', ch10('a[href*="/job/"]').first().text().trim());
  console.log('page 20 first job:', ch20('a[href*="/job/"]').first().text().trim());
  console.log('page 0 pager links:');
  ch0('ul.pagination a, .pager a').each((i, el) => {
    console.log(`  ${ch0(el).text().trim()} -> ${ch0(el).attr('href')}`);
  });
}

testPager();
