$('script[type="application/ld+json"]').each((_, el) => {
  const txt = $(el).contents().first().text().trim();
  if (!txt) return;
  try {
    const data = JSON.parse(txt);
    const candidates = Array.isArray(data)
      ? data
      : data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)
      ? data.itemListElement
      : [data];
    candidates.forEach(item => {
      if (item['@type'] !== 'JobPosting') return;
      const job = {};
      if (item.title) job.title = item.title;
      if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
      if (item.description) job.description = item.description;
      if (item.jobLocation && item.jobLocation.address) {
        const addr = item.jobLocation.address;
        const parts = [];
        if (addr.addressLocality) parts.push(addr.addressLocality);
        if (addr.addressRegion) parts.push(addr.addressRegion);
        if (addr.addressCountry) parts.push(addr.addressCountry);
        if (parts.length) job.location = parts.join(', ');
      }
      if (item.employmentType) {
        const map = {
          FULL_TIME: 'full_time',
          PART_TIME: 'part_time',
          CONTRACT: 'contract',
          INTERNSHIP: 'internship',
          TEMPORARY: 'contract',
          REMOTE: 'remote'
        };
        const typeKey = Array.isArray(item.employmentType) ? item.employmentType[0] : item.employmentType;
        job.jobType = map[typeKey] || typeKey.toLowerCase();
      }
      if (item.url) job.sourceUrl = item.url;
      if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
      if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
      if (item.baseSalary) {
        const sal = item.baseSalary;
        if (sal.value && typeof sal.value === 'object') {
          if (sal.value.minValue) job.salaryMin = Number(sal.value.minValue);
          if (sal.value.maxValue) job.salaryMax = Number(sal.value.maxValue);
          if (sal.value.currency) job.salaryCurrency = sal.value.currency;
        } else if (sal.minValue) {
          job.salaryMin = Number(sal.minValue);
          if (sal.maxValue) job.salaryMax = Number(sal.maxValue);
          if (sal.currency) job.salaryCurrency = sal.currency;
        }
      }
      result.push(job);
    });
  } catch (e) {
    // ignore malformed JSON
  }
});