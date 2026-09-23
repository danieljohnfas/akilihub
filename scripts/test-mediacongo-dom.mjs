import * as cheerio from 'cheerio';

async function testDom() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  const res = await fetch('https://www.mediacongo.net/emploi-societe-44698_apdi_asbl_administrateur_gestionnaire.html', { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Look for text matching Lieu
  $('*').each((i, el) => {
    const t = $(el).clone().children().remove().end().text().trim();
    if (t.includes('Lieu') || t.includes('Organisme') || t.includes('Date limite')) {
      console.log(`Tag: <${el.name} class="${$(el).attr('class')}">: "${t}" | Parent text: "${$(el).parent().text().replace(/\s+/g, ' ').slice(0, 100)}"`);
    }
  });
}

testDom();
