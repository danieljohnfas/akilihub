import * as cheerio from 'cheerio';

async function testBurundiSouthSudan() {
  const urls = [
    'https://www.jobinburundi.com/emplois',
    'https://www.jobinburundi.com/offres-emploi',
    'https://www.jobinburundi.com/recrutement',
    'https://www.jobinburundi.com/fr',
    'https://burundi.ureport.in/',
    'https://commsouthsudan.org/category/vacancies/',
    'https://www.commsouthsudan.org/jobs/',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`${u} -> ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = [];
        $('a').each((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          if (text.length > 15 && (href.includes('job') || href.includes('emploi') || href.includes('vacanc') || href.includes('recrut'))) {
            links.push({ text: text.slice(0, 50), href });
          }
        });
        console.log(`  Found ${links.length} potential links. Sample:`, links.slice(0, 3));
      }
    } catch (e) {
      console.log(`${u} -> Error: ${e.message}`);
    }
  }
}

testBurundiSouthSudan();
