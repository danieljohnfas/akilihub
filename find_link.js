const cheerio = require('cheerio');
fetch('https://www.ajiraport.com/blog/facility-cleaner-job-vacancy-at-dnata-tanzania-zanzibar-september-2026')
  .then(r => r.text())
  .then(t => {
    const $ = cheerio.load(t);
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) {
        links.push({text, href});
      }
    });
    const extLinks = links.filter(l => l.href.startsWith('http') && !l.href.includes('ajiraport.com') && !l.href.includes('facebook') && !l.href.includes('twitter') && !l.href.includes('linkedin') && !l.href.includes('whatsapp') && !l.href.includes('pinterest'));
    console.log(extLinks);
  });
