// Parse all JSON‑LD script tags safely
$('script[type="application/ld+json"]').each((_, el) => {
  const raw = $(el).contents().text().trim();
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  const wrappers = Array.isArray(data) ? data : [data];
  wrappers.forEach(wrapper => {
    const graphs = wrapper['@graph'] ? (Array.isArray(wrapper['@graph']) ? wrapper['@graph'] : [wrapper['@graph']]) : [wrapper];
    graphs.forEach(g => {
      const main = g?.mainEntity;
      const list = main?.itemListElement;
      if (!list) return;
      const items = Array.isArray(list) ? list : [list];
      items.forEach(li => {
        const item = li?.item || {};
        const rawTitle = item.name || '';
        if (!rawTitle) return; // no clear job title, skip
        const job = {
          title: rawTitle.trim(),
          sourceUrl: item.url ? item.url.trim() : ''
        };
        // attempt to extract company name if pattern "... at Company"
        const atPos = rawTitle.lastIndexOf(' at ');
        if (atPos !== -1) {
          job.title = rawTitle.slice(0, atPos).trim();
          job.companyName = rawTitle.slice(atPos + 4).trim();
        }
        result.push(job);
      });
    });
  });
});