$('script[type="application/ld+json"]').each((_, el) => {
  const raw = $(el).contents().first().text().trim();
  if (!raw) return;
  try {
    const json = JSON.parse(raw);
    const items = [];
    if (Array.isArray(json)) {
      items.push(...json);
    } else if (json['@graph']) {
      items.push(...json['@graph']);
    } else {
      items.push(json);
    }
    items.forEach(obj => {
      if (obj['@type'] === 'SearchResultsPage' && obj.mainEntity && Array.isArray(obj.mainEntity.itemListElement)) {
        obj.mainEntity.itemListElement.forEach(li => {
          const job = li.item || {};
          const title = (job.name || '').trim();
          const sourceUrl = (job.url || '').trim();
          if (title && sourceUrl) {
            result.push({
              title,
              sourceUrl
            });
          }
        });
      }
    });
  } catch (_) {}
});

if (!result.length) {
  $('a[href*="/jobs/view/"]').each((_, el) => {
    const title = $(el).text().trim();
    const sourceUrl = $(el).attr('href')?.trim() || '';
    if (title && sourceUrl) {
      result.push({ title, sourceUrl });
    }
  });
}