let jsonLd = [];
$('script[type="application/ld+json"]').each((i, el) => {
  try {
    let data = JSON.parse($(el).html());
    if (Array.isArray(data)) {
      jsonLd.push(...data);
    } else {
      jsonLd.push(data);
    }
  } catch (e) {}
});
jsonLd.forEach(item => {
  if (item['@type'] === 'JobPosting') {
    let job = {};
    if (item.title) job.title = item.title;
    if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
    if (item.description) job.description = item.description;
    if (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) job.location = item.jobLocation.address.addressLocality;
    if (item.employmentType) {
      let type = item.employmentType.toString().toLowerCase();
      if (type.includes('full')) job.jobType = 'full_time';
      else if (type.includes('part')) job.jobType = 'part_time';
      else if (type.includes('contract')) job.jobType = 'contract';
      else if (type.includes('intern')) job.jobType = 'internship';
      else if (type.includes('remote')) job.jobType = 'remote';
    }
    if (item.url) job.sourceUrl = item.url;
    if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
    if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
    if (item.baseSalary) {
      let sal = item.baseSalary;
      if (sal.value) job.salaryMin = Number(sal.value);
      if (sal.maxValue) job.salaryMax = Number(sal.maxValue);
      if (sal.currency) job.salaryCurrency = sal.currency;
    }
    result.push(job);
  }
});