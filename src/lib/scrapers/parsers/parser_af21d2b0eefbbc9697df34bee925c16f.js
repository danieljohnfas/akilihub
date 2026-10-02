$('script[type="application/ld+json"]').each(function () {
  let data;
  try {
    data = JSON.parse($(this).html());
  } catch (e) {
    return;
  }
  const candidates = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
  candidates.forEach(function (item) {
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type'] || ''];
    if (!types.includes('JobPosting')) return;
    const job = {};
    if (item.title) job.title = item.title;
    else if (item.name) job.title = item.name;
    if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
    if (item.description) job.description = item.description;
    if (item.jobLocation && item.jobLocation.address) {
      const addr = item.jobLocation.address;
      job.location = addr.addressLocality || addr.addressRegion || addr.streetAddress || '';
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
      const typeVal = Array.isArray(item.employmentType) ? item.employmentType[0] : item.employmentType;
      const key = (typeVal || '').toUpperCase();
      job.jobType = map[key] || key.toLowerCase();
    }
    if (item.sameAs) job.sourceUrl = item.sameAs;
    else if (item.url) job.sourceUrl = item.url;
    if (item.datePosted) job.postedDateIsoString = item.datePosted;
    if (item.validThrough) job.deadlineIsoString = item.validThrough;
    if (item.baseSalary && item.baseSalary.value) {
      const val = item.baseSalary.value;
      if (val.minValue) job.salaryMin = Number(val.minValue);
      else if (val.value) job.salaryMin = Number(val.value);
      if (val.maxValue) job.salaryMax = Number(val.maxValue);
      if (val.currency) job.salaryCurrency = val.currency;
    }
    result.push(job);
  });
});