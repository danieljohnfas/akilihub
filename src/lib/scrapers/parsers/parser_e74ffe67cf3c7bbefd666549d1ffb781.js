// Parse JSON‑LD for job listings
$('script[type="application/ld+json"]').each((_, script) => {
  let data;
  try {
    data = JSON.parse($(script).contents().first().text());
  } catch (e) {
    return;
  }

  const graphs = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);

  graphs.forEach(g => {
    if (g && g['@type'] === 'SearchResultsPage' && g.mainEntity && g.mainEntity.itemListElement) {
      const items = g.mainEntity.itemListElement;
      items.forEach(entry => {
        const item = entry.item;
        if (!item) return;
        const title = (item.name || '').trim();
        const sourceUrl = (item.url || '').trim();
        if (!title) return;

        const job = { title, sourceUrl };

        // Attempt to extract company name from title (e.g., "... job at Company")
        const compMatch = title.match(/(?:job at|at)\s+(.+)$/i);
        if (compMatch) {
          job.companyName = compMatch[1].trim();
        }

        // Additional optional fields
        if (item.description) job.description = item.description.trim();
        if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
        if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();

        result.push(job);
      });
    }
  });
});

// Fallback: look for visible job links if JSON‑LD gave no results
if (result.length === 0) {
  // Common selectors for job cards/links
  $('a[href*="/jobs/view/"], a[href*="/job/"], a.job-link, .job-card a, .listing-item a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().trim();
    if (!href || !text) return;

    // Heuristic: title should contain a keyword like "job" or be capitalized
    const isJob = /job/i.test(text) || /^[A-Z][\w\s]+$/.test(text);
    if (!isJob) return;

    const job = { title: text, sourceUrl: href };
    // Try to infer company name from surrounding markup
    const parent = $el.closest('.job-card, .listing-item, .job-item');
    if (parent.length) {
      const comp = parent.find('.company-name, .employer, .brand').first().text().trim();
      if (comp) job.companyName = comp;
    }
    result.push(job);
  });
}