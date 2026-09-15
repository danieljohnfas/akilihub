// Gather potential JSON‑LD blocks
$('script[type="application/ld+json"]').each((_, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().text());
  } catch (e) {
    return;
  }
  // Ensure we have a graph array
  const graphs = Array.isArray(data['@graph']) ? data['@graph'] : [data];
  graphs.forEach(g => {
    if (g['@type'] !== 'SearchResultsPage') return;
    const list = g.mainEntity && g.mainEntity.itemListElement;
    if (!Array.isArray(list)) return;
    list.forEach(itemWrapper => {
      const item = itemWrapper.item || itemWrapper;
      if (!item || !item.name || !item.url) return;
      const name = item.name.trim();
      const url = item.url.trim();
      // Derive title and companyName from pattern "Title job at Company"
      let title = name;
      let companyName = null;
      const atIdx = name.lastIndexOf(' at ');
      if (atIdx !== -1) {
        title = name.substring(0, atIdx).replace(/job$/i, '').trim();
        companyName = name.substring(atIdx + 4).trim();
      }
      const job = {
        title,
        companyName,
        description: null,
        location: null,
        jobType: null,
        sourceUrl: url,
        postedDateIsoString: null,
        deadlineIsoString: null,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null
      };
      result.push(job);
    });
  });
});

// Fallback: DOM based extraction if JSON‑LD yielded nothing
if (result.length === 0) {
  // Common selectors for job cards on this site
  const cardSel = '.job-card, .job-item, .listing-item, .search-result';
  $(cardSel).each((_, el) => {
    const $el = $(el);
    const link = $el.find('a[href*="/jobs/view/"]').first();
    if (!link.length) return;
    const title = link.text().trim();
    const sourceUrl = link.attr('href').trim();
    // Try to locate company name
    let companyName = null;
    const compEl = $el.find('.company, .company-name, .employer').first();
    if (compEl.length) companyName = compEl.text().trim();
    // Location
    let location = null;
    const locEl = $el.find('.location, .job-location').first();
    if (locEl.length) location = locEl.text().trim();
    // Job type
    let jobType = null;
    const typeEl = $el.find('.job-type, .type').first();
    if (typeEl.length) {
      const txt = typeEl.text().toLowerCase();
      if (txt.includes('full')) jobType = 'full_time';
      else if (txt.includes('part')) jobType = 'part_time';
      else if (txt.includes('contract')) jobType = 'contract';
      else if (txt.includes('intern')) jobType = 'internship';
      else if (txt.includes('remote')) jobType = 'remote';
    }
    const job = {
      title,
      companyName,
      description: null,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString: null,
      deadlineIsoString: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null
    };
    result.push(job);
  });
}
// Ensure result is empty if no clear job titles were found
if (result.some(j => !j.title)) {
  result.length = 0;
}