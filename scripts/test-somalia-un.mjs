import * as cheerio from 'cheerio';

async function inspectUnSomalia() {
  const res = await fetch('https://somalia.un.org/en/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Main content text len:', $('main').text().length);
  $('.views-row, article, .job, a[href*="inspira"], a[href*="careers.un.org"]').each((i, el) => {
    console.log(`Element ${el.tagName}: ${$(el).text().replace(/\s+/g, ' ').trim().slice(0, 100)}`);
  });
}

inspectUnSomalia();
