// Find all JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, script) => {
  let jsonText = $(script).contents().first().text().trim();
  if (!jsonText) return;
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return;
  }

  // Handle both direct object or @graph array
  const candidates = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);

  candidates.forEach(item => {
    if (item['@type'] !== 'SearchResultsPage') return;
    const list = item.mainEntity && item.mainEntity.itemListElement;
    if (!Array.isArray(list)) return;

    list.forEach(listItem => {
      const jobInfo = listItem.item;
      if (!jobInfo || !jobInfo.name || !jobInfo.url) return;

      const job = {};

      // Title (full string)
      const rawTitle = jobInfo.name.trim();
      job.title = rawTitle;

      // Attempt to extract company name from pattern "title at Company"
      const atIndex = rawTitle.lastIndexOf(' at ');
      if (atIndex !== -1) {
        job.title = rawTitle.slice(0, atIndex).trim();
        job.companyName = rawTitle.slice(atIndex + 4).trim();
      }

      // URL
      job.sourceUrl = jobInfo.url.trim();

      // Add empty placeholders for optional fields to keep a consistent shape
      job.description = '';
      job.location = '';
      job.jobType = '';
      job.postedDateIsoString = '';
      job.deadlineIsoString = '';
      job.salaryMin = null;
      job.salaryMax = null;
      job.salaryCurrency = '';

      result.push(job);
    });
  });
});