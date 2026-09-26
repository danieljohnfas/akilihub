// Locate JSON‑LD scripts that may contain job listings
$('script[type="application/ld+json"]').each((_, scriptElem) => {
  let jsonText = $(scriptElem).contents().text().trim();
  if (!jsonText) return;

  // Some pages may include multiple JSON objects separated by newlines
  const possibleBlocks = jsonText.split('\n').filter(Boolean);
  for (let block of possibleBlocks) {
    try {
      const data = JSON.parse(block);
      // The structure may be an object with @graph array
      const graphs = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (const node of graphs) {
        if (node['@type'] === 'SearchResultsPage' && node.mainEntity && node.mainEntity.itemListElement) {
          const items = node.mainEntity.itemListElement;
          if (Array.isArray(items)) {
            items.forEach(itemObj => {
              const item = itemObj.item || {};
              const title = (item.name || '').trim();
              const sourceUrl = (item.url || '').trim();
              if (title) {
                const job = {
                  title,
                  sourceUrl
                };
                // Optional fields – include if present
                if (item.description) job.description = item.description.trim();
                if (item.hiringOrganization && item.hiringOrganization.name) {
                  job.companyName = item.hiringOrganization.name.trim();
                }
                if (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) {
                  job.location = item.jobLocation.address.addressLocality.trim();
                }
                if (item.employmentType) {
                  const typeMap = {
                    'FULL_TIME': 'full_time',
                    'PART_TIME': 'part_time',
                    'CONTRACT': 'contract',
                    'INTERNSHIP': 'internship',
                    'TEMPORARY': 'contract',
                    'REMOTE': 'remote'
                  };
                  const normalized = typeMap[item.employmentType.toUpperCase()] || item.employmentType.toLowerCase();
                  job.jobType = normalized;
                }
                if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
                if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
                if (item.baseSalary) {
                  const salary = item.baseSalary;
                  if (salary.value) {
                    if (salary.value.minValue) job.salaryMin = Number(salary.value.minValue);
                    if (salary.value.maxValue) job.salaryMax = Number(salary.value.maxValue);
                    if (salary.value.currency) job.salaryCurrency = salary.value.currency;
                  }
                }
                result.push(job);
              }
            });
          }
        }
      }
    } catch (e) {
      // ignore parse errors – move to next block
    }
  }
});