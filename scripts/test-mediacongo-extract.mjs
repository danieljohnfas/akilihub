import * as cheerio from 'cheerio';

async function testRegex() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  const urls = [
    'https://www.mediacongo.net/emploi-societe-44698_apdi_asbl_administrateur_gestionnaire.html',
    'https://www.mediacongo.net/emploi-societe-44697_apdi_asbl_medecin_directeur.html',
    'https://www.mediacongo.net/emploi-societe-44702_pana_resilience_au_medd_nec_consultants_nationaux.html'
  ];

  for (const u of urls) {
    const res = await fetch(u, { headers });
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('h1').first().text().replace(/\s+/g, ' ').trim();
    const allText = $('body').text().replace(/\s+/g, ' ').trim();

    const orgMatch = allText.match(/(?:Organisme|Société|Employeur)\s*[:]?\s*([A-Za-z0-9\s\.\-&]{3,50})/i);
    const locMatch = allText.match(/Lieu\s*[:]?\s*([A-Za-z0-9\s,\.\-]{3,60})/i);

    console.log(`\nURL: ${u}`);
    console.log(`Title: ${title}`);
    console.log(`Extracted Org: ${orgMatch ? orgMatch[1].trim() : 'NONE'}`);
    console.log(`Extracted Loc: ${locMatch ? locMatch[1].trim() : 'NONE'}`);
  }
}

testRegex();
