try {
  const scripts = $('script[type="application/ld+json"]');
  scripts.each((_, el) => {
    let json;
    try {
      json = JSON.parse($(el).contents().first().text());
    } catch {
      return;
    }
    const graphs = Array.isArray(json['@graph']) ? json['@graph'] : [json];
    graphs.forEach((g) => {
      if (g['@type'] === 'SearchResultsPage' && g.mainEntity && g.mainEntity.itemListElement) {
        const items = g.mainEntity.itemListElement;
        items.forEach((it) => {
          const item = it.item || {};
          const title = typeof item.name === 'string' ? item.name.trim() : null;
          const sourceUrl = typeof item.url === 'string' ? item.url.trim() : null;
          if (!title) return;
          const job = { title };
          if (sourceUrl) job.sourceUrl = sourceUrl;
          const atIdx = title.lastIndexOf(' at ');
          if (atIdx > -1) {
            job.companyName = title.slice(atIdx + 4).trim();
            job.title = title.slice(0, atIdx).trim();
          }
          result.push(job);
        });
      }
    });
  });
} catch (e) {
  // leave result empty on any unexpected error
}