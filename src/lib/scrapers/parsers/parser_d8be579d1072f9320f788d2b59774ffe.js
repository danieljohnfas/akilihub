const ldScripts = $('script[type="application/ld+json"]');
ldScripts.each((_, el) => {
  let json;
  try {
    json = JSON.parse($(el).contents().text());
  } catch {
    return;
  }
  const queue = Array.isArray(json) ? [...json] : [json];
  while (queue.length) {
    const item = queue.shift();
    if (item && typeof item === 'object') {
      if (item['@type'] === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting'))) {
        const job = {};
        if (item.title) job.title = String(item.title).trim();
        else if (item.name) job.title = String(item.name).trim();
        if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = String(item.hiringOrganization.name).trim();
        if (item.description) job.description = String(item.description).trim();
        if (item.jobLocation && item.jobLocation.address) {
          const a = item.jobLocation.address;
          const parts = [];
          if (a.streetAddress) parts.push(a.streetAddress);
          if (a.addressLocality) parts.push(a.addressLocality);
          if (a.addressRegion) parts.push(a.addressRegion);
          if (a.postalCode) parts.push(a.postalCode);
          if (a.addressCountry) parts.push(a.addressCountry);
          job.location = parts.join(', ');
        }
        if (item.employmentType) {
          const t = String(item.employmentType).toLowerCase();
          if (t.includes('full')) job.jobType = 'full_time';
          else if (t.includes('part')) job.jobType = 'part_time';
          else if (t.includes('contract')) job.jobType = 'contract';
          else if (t.includes('intern')) job.jobType = 'internship';
          else if (t.includes('remote')) job.jobType = 'remote';
        }
        if (item.url) job.sourceUrl = String(item.url).trim();
        if (item.datePosted) job.postedDateIsoString = String(item.datePosted).trim();
        if (item.validThrough) job.deadlineIsoString = String(item.validThrough).trim();
        const salary = item.baseSalary;
        if (salary && salary.value) {
          const v = salary.value;
          if (v.minValue != null) job.salaryMin = Number(v.minValue);
          if (v.maxValue != null) job.salaryMax = Number(v.maxValue);
          if (v.currency) job.salaryCurrency = String(v.currency).trim();
        }
        result.push(job);
      } else {
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          queue.push(...item['@graph']);
        }
        for (const key in item) {
          if (item.hasOwnProperty(key) && typeof item[key] === 'object') {
            queue.push(item[key]);
          }
        }
      }
    }
  }
});