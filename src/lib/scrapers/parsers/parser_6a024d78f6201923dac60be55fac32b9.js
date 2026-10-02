let scripts = $('script[type="application/ld+json"]');
scripts.each((_, el) => {
  let txt = $(el).contents().first().text().trim();
  if (!txt) return;
  try {
    let data = JSON.parse(txt);
    if (data && data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
      data.itemListElement.forEach(item => {
        if (item && item['@type'] === 'ListItem' && item.name && item.url) {
          result.push({
            title: String(item.name).trim(),
            sourceUrl: String(item.url).trim()
          });
        }
      });
    }
  } catch (e) {
    // ignore malformed JSON
  }
});