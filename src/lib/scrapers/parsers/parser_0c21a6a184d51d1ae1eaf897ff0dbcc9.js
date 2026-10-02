// Collect JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().first().text());
  } catch {
    return;
  }
  const items = Array.isArray(data) ? data : [data];
  items.forEach(item => {
    const process = obj => {
      if (!obj || obj['@type'] !== 'JobPosting') return;
      const job = {};
      if (obj.title) job.title = String(obj.title).trim();
      else if (obj.name) job.title = String(obj.name).trim();

      if (obj.hiringOrganization && obj.hiringOrganization.name)
        job.companyName = String(obj.hiringOrganization.name).trim();

      if (obj.description) job.description = String(obj.description).trim();

      if (obj.jobLocation && obj.jobLocation.address) {
        const addr = obj.jobLocation.address;
        const parts = [];
        if (addr.addressLocality) parts.push(addr.addressLocality);
        if (addr.addressRegion) parts.push(addr.addressRegion);
        if (addr.addressCountry) parts.push(addr.addressCountry);
        if (parts.length) job.location = parts.join(', ');
      }

      if (obj.employmentType) {
        const type = String(obj.employmentType).toLowerCase();
        if (type.includes('full')) job.jobType = 'full_time';
        else if (type.includes('part')) job.jobType = 'part_time';
        else if (type.includes('contract')) job.jobType = 'contract';
        else if (type.includes('intern')) job.jobType = 'internship';
        else if (type.includes('remote')) job.jobType = 'remote';
      }

      if (obj.sameAs) job.sourceUrl = String(obj.sameAs);
      else if (obj.url) job.sourceUrl = String(obj.url);

      if (obj.datePosted) job.postedDateIsoString = new Date(obj.datePosted).toISOString();
      if (obj.validThrough) job.deadlineIsoString = new Date(obj.validThrough).toISOString();

      if (obj.baseSalary) {
        const salary = obj.baseSalary;
        if (salary.value) {
          const val = salary.value;
          if (typeof val === 'object') {
            if (val.minValue != null) job.salaryMin = Number(val.minValue);
            if (val.maxValue != null) job.salaryMax = Number(val.maxValue);
            if (val.currency) job.salaryCurrency = String(val.currency);
          } else if (!isNaN(Number(val))) {
            const num = Number(val);
            job.salaryMin = num;
            job.salaryMax = num;
          }
        }
        if (salary.currency && !job.salaryCurrency) job.salaryCurrency = String(salary.currency);
      }

      // Only push if a clear title exists
      if (job.title) result.push(job);
    };

    if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
      item.itemListElement.forEach(elem => process(elem));
    } else {
      process(item);
    }
  });
});