// Gather all JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().first().text());
  } catch {
    return;
  }
  const nodes = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
  nodes.forEach(node => {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type'] || ''];
    if (!types.includes('JobPosting')) return;
    const job = {};

    // Title
    job.title = node.title || node.headline || node.name || '';

    // Company
    if (node.hiringOrganization && typeof node.hiringOrganization === 'object') {
      job.companyName = node.hiringOrganization.name || '';
    }

    // Description
    job.description = node.description || '';

    // Location
    if (node.jobLocation && node.jobLocation.address) {
      const addr = node.jobLocation.address;
      const parts = [];
      if (addr.streetAddress) parts.push(addr.streetAddress);
      if (addr.addressLocality) parts.push(addr.addressLocality);
      if (addr.addressRegion) parts.push(addr.addressRegion);
      if (addr.postalCode) parts.push(addr.postalCode);
      if (addr.addressCountry) parts.push(addr.addressCountry);
      job.location = parts.join(', ');
    }

    // Job type mapping
    const emp = node.employmentType;
    if (emp) {
      const map = {
        FULL_TIME: 'full_time',
        PART_TIME: 'part_time',
        CONTRACT: 'contract',
        INTERNSHIP: 'internship',
        TEMPORARY: 'contract',
        VOLUNTEER: 'part_time',
        REMOTE: 'remote'
      };
      const key = Array.isArray(emp) ? emp[0] : emp;
      job.jobType = map[key.toUpperCase()] || '';
    }

    // URLs and dates
    job.sourceUrl = node.url || '';
    job.postedDateIsoString = node.datePosted || '';
    job.deadlineIsoString = node.validThrough || '';

    // Salary
    if (node.baseSalary && typeof node.baseSalary === 'object') {
      const salary = node.baseSalary;
      if (salary.value) {
        const val = salary.value;
        job.salaryMin = Number(val.minValue) || undefined;
        job.salaryMax = Number(val.maxValue) || undefined;
        job.salaryCurrency = val.currency || '';
      } else {
        job.salaryMin = Number(salary.minValue) || undefined;
        job.salaryMax = Number(salary.maxValue) || undefined;
        job.salaryCurrency = salary.currency || '';
      }
    }

    result.push(job);
  });
});