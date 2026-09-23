import * as cheerio from 'cheerio';

async function testDetail() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  const listRes = await fetch('https://www.mediacongo.net/emplois-search--tri-offres_recentes-page-1.html', { headers });
  const listHtml = await listRes.text();
  const $ = cheerio.load(listHtml);

  const sampleLinks = [];
  $('a[href*="emploi-societe-"], a[href*="emploi-offre-"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !sampleLinks.includes(href)) sampleLinks.push(href);
  });

  console.log(`Found ${sampleLinks.length} distinct links. Testing first 3:`);
  for (let i = 0; i < Math.min(3, sampleLinks.length); i++) {
    const link = sampleLinks[i];
    const fullUrl = link.startsWith('http') ? link : `https://www.mediacongo.net/${link.replace(/^\//, '')}`;
    console.log(`\nURL: ${fullUrl}`);
    const dRes = await fetch(fullUrl, { headers });
    const dHtml = await dRes.text();
    const d$ = cheerio.load(dHtml);

    const title = d$('h1').first().text().replace(/\s+/g, ' ').trim();
    console.log(`Title: ${title}`);

    // Try employer
    let employer = '';
    const pAfterH1 = d$('h1').first().next('p').text().replace(/\s+/g, ' ').trim();
    if (pAfterH1 && pAfterH1.length > 2 && pAfterH1.length < 60) employer = pAfterH1;

    if (!employer) {
      const urlMatch = link.match(/emploi-societe-\d+_([a-z0-9_]+?)_(?:[a-z0-9_]+)\.html/i);
      if (urlMatch && urlMatch[1]) {
        employer = urlMatch[1].replace(/_/g, ' ').toUpperCase();
      }
    }
    console.log(`Employer: ${employer}`);

    // Find description
    let desc = '';
    const h1Parent = d$('h1').first().parent().text().replace(/\s+/g, ' ').trim();
    if (h1Parent.length > 200) desc = h1Parent;
    else {
      d$('table, div').each((_, el) => {
        const t = d$(el).text().replace(/\s+/g, ' ').trim();
        if (t.length > 300 && t.length < 20000 && (t.includes('Poste') || t.includes('Profil') || t.includes('Candidature') || t.includes('Responsabilités') || t.includes('Mission'))) {
          if (t.length > desc.length) desc = t;
        }
      });
    }
    console.log(`Desc length: ${desc.length}`);
    console.log(`Desc preview: ${desc.slice(0, 150)}...`);
  }
}

testDetail();
