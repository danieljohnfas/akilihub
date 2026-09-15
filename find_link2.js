const cheerio = require('cheerio');
fetch('https://www.dyampaye.co.tz/2026/09/direct-sales-agents-50-positions-at.html')
  .then(r => r.text())
  .then(t => {
    const $ = cheerio.load(t);
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) links.push({text, href});
    });
    const extLinks = links.filter(l => l.href.startsWith('http') && !l.href.includes('dyampaye.co.tz') && !l.href.includes('blogger') && !l.href.includes('google'));
    console.log(extLinks);
  });
