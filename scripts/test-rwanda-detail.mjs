import * as cheerio from 'cheerio';

async function testRwandaDetail() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  const listRes = await fetch('https://www.jobinrwanda.com/jobs/all', { headers });
  const listHtml = await listRes.text();
  const $ = cheerio.load(listHtml);

  const sampleLinks = [];
  $('a[href*="/job/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text.length > 5 && !sampleLinks.some(s => s.href === href)) {
      sampleLinks.push({ href: href.startsWith('http') ? href : `https://www.jobinrwanda.com${href}`, title: text });
    }
  });

  console.log(`Found ${sampleLinks.length} distinct job links. Testing first 3:`);
  for (let i = 0; i < Math.min(3, sampleLinks.length); i++) {
    const item = sampleLinks[i];
    console.log(`\nURL: ${item.href}`);
    const res = await fetch(item.href, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.log(`  HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const $$ = cheerio.load(html);

    const title = $$('h1').first().text().replace(/\s+/g, ' ').trim() || item.title;
    const employer = $$('.employer-title, a[href*="/employer/"], .field--name-field-employer').first().text().replace(/\s+/g, ' ').trim();
    const bodyText = $$('.field--name-body, .job-body, article').first().text().replace(/\s+/g, ' ').trim();
    const deadline = $$('.field--name-field-deadline, .deadline').first().text().replace(/\s+/g, ' ').trim();

    console.log(`  Title: ${title}`);
    console.log(`  Employer: ${employer}`);
    console.log(`  Deadline: ${deadline}`);
    console.log(`  Body length: ${bodyText.length}`);
    console.log(`  Preview: ${bodyText.slice(0, 150)}...`);
  }
}

testRwandaDetail();
