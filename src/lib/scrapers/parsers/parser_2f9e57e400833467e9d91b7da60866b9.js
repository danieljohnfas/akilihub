const ldScripts = $('script[type="application/ld+json"]');
ldScripts.each((_, el) => {
  try {
    const jsonText = $(el).contents().first().text();
    const data = JSON.parse(jsonText);
    const graphs = Array.isArray(data) ? data : data['@graph'] || [];
    for (const g of graphs) {
      if (g && g['@type'] === 'ItemList' && Array.isArray(g.itemListElement)) {
        g.itemListElement.forEach(item => {
          if (item && item['@type'] === 'ListItem' && item.name && item.url) {
            const job = {
              title: String(item.name).trim(),
              sourceUrl: String(item.url).trim()
            };
            result.push(job);
          }
        });
      }
    }
  } catch (e) {}
});