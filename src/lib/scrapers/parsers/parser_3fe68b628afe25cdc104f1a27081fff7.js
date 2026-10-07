$('script[type="application/ld+json"]').each((_, elem) => {
  let scriptText = $(elem).text();
  if (!scriptText) return;
  scriptText = scriptText.trim();
  let data;
  try {
    data = JSON.parse(scriptText);
  } catch (e) {
    return;
  }
  if (Array.isArray(data)) {
    data.forEach(processItem);
  } else {
    processItem(data);
  }
});

function processItem(item) {
  if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
    item.itemListElement.forEach(processItem);
    return;
  }
  if (item['@type'] !== 'JobPosting') return;
  const job = {};
  job.title = item.name || item.headline || '';
  if (!job.title) return;
  if (item.hiringOrganization && typeof item.hiringOrganization === 'object') {
    job.companyName = item.hiringOrganization.name || '';
  } else if (item.employer && typeof item.employer === 'object') {
    job.companyName = item.employer.name || '';
  }
  job.description = item.description || '';
  if (item.address && typeof item.address === 'object') {
    job.location = item.address.locality || item.address.region || item.address.streetAddress || '';
  } else if (item.jobLocation && typeof item.jobLocation === 'object' && item.jobLocation.address) {
    const addr = item.jobLocation.address;
    job.location = addr.locality || addr.region || '';
  }
  if (item.employmentType) {
    const et = item.employmentType.toLowerCase();
    if (['full-time','full_time','fulltime'].includes(et)) job.jobType = 'full_time';
    else if (['part-time','part_time','parttime'].includes(et)) job.jobType = 'part_time';
    else if (et === 'contract') job.jobType = 'contract';
    else if (et === 'internship') job.jobType = 'internship';
    else if (et === 'remote') job.jobType = 'remote';
    else job.jobType = et;
  }
  job.sourceUrl = item.url || '';
  if (item.datePosted) job.postedDateIsoString = item.datePosted;
  if (item.validThrough) job.deadlineIsoString = item.validThrough;
  if (item.salarySpecification && typeof item.salarySpecification === 'object') {
    const spec = item.salarySpecification;
    if (spec.currency) job.salaryCurrency = spec.currency;
    if (spec.minValue !== undefined) job.salaryMin = Number(spec.minValue);
    if (spec.maxValue !== undefined) job.salaryMax = Number(spec.maxValue);
  }
  result.push(job);
}