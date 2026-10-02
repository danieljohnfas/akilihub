const jsonLd = [];
$('script[type="application/ld+json"]').each((i, el) => {
  try {
    const data = JSON.parse($(el).contents().first().text());
    jsonLd.push(data);
  } catch (_) {}
});
function extractFromObject(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(extractFromObject);
  } else if (obj && typeof obj === 'object') {
    const type = obj['@type'];
    const isJob = type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
    if (isJob) {
      const job = {};
      if (obj.title) job.title = obj.title;
      if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = obj.hiringOrganization.name;
      if (obj.description) job.description = obj.description;
      if (obj.jobLocation && obj.jobLocation.address) {
        const addr = obj.jobLocation.address;
        if (addr.addressLocality) job.location = addr.addressLocality;
        else if (addr.streetAddress) job.location = addr.streetAddress;
      }
      if (obj.employmentType) {
        const et = obj.employmentType.toString().toLowerCase();
        if (et.includes('full')) job.jobType = 'full_time';
        else if (et.includes('part')) job.jobType = 'part_time';
        else if (et.includes('contract')) job.jobType = 'contract';
        else if (et.includes('intern')) job.jobType = 'internship';
        else if (et.includes('remote')) job.jobType = 'remote';
      }
      if (obj.url) job.sourceUrl = obj.url;
      if (obj.datePosted) job.postedDateIsoString = new Date(obj.datePosted).toISOString();
      if (obj.validThrough) job.deadlineIsoString = new Date(obj.validThrough).toISOString();
      if (obj.baseSalary && obj.baseSalary.value) {
        const val = obj.baseSalary.value;
        if (val.minValue) job.salaryMin = Number(val.minValue);
        if (val.maxValue) job.salaryMax = Number(val.maxValue);
        if (val.currency) job.salaryCurrency = val.currency;
      }
      result.push(job);
    } else {
      Object.values(obj).forEach(extractFromObject);
    }
  }
}
jsonLd.forEach(extractFromObject);