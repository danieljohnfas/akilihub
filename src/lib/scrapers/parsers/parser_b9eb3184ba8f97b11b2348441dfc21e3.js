$('script[type="application/ld+json"]').each((_, el) => {
  let json;
  try {
    json = JSON.parse($(el).contents().text());
  } catch (e) {
    return;
  }
  const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
  items.forEach(item => {
    if (!item || (Array.isArray(item['@type']) ? !item['@type'].includes('JobPosting') : item['@type'] !== 'JobPosting')) return;
    const job = {};
    if (item.title) job.title = String(item.title).trim();
    if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = String(item.hiringOrganization.name).trim();
    if (item.description) job.description = String(item.description).trim();
    if (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) {
      job.location = String(item.jobLocation.address.addressLocality).trim();
    }
    if (item.employmentType) {
      const type = String(item.employmentType).toLowerCase();
      if (type.includes('full')) job.jobType = 'full_time';
      else if (type.includes('part')) job.jobType = 'part_time';
      else if (type.includes('contract')) job.jobType = 'contract';
      else if (type.includes('intern')) job.jobType = 'internship';
      else if (type.includes('remote')) job.jobType = 'remote';
    }
    if (item.sameAs) job.sourceUrl = String(item.sameAs).trim();
    if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
    if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
    if (item.baseSalary) {
      const salary = item.baseSalary;
      if (salary.value) {
        const val = salary.value;
        if (val.minValue) job.salaryMin = Number(val.minValue);
        if (val.maxValue) job.salaryMax = Number(val.maxValue);
        if (val.currency) job.salaryCurrency = String(val.currency).trim();
      }
    }
    result.push(job);
  });
});