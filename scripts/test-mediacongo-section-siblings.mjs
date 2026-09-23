import * as cheerio from 'cheerio';

async function testSectionSiblings() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  const res = await fetch('https://www.mediacongo.net/emploi-societe-44698_apdi_asbl_administrateur_gestionnaire.html', { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  $('.emploi_section').each((i, el) => {
    const nextElem = $(el).next();
    console.log(`Section: "${$(el).text()}" -> Next: "${nextElem.text().replace(/\s+/g, ' ').trim().slice(0, 100)}"`);
  });
}

testSectionSiblings();
