// Parse JSON‑LD script blocks for JobPosting data
$('script[type="application/ld+json"]').each((_, elem) => {
  let data;
  try {
    data = JSON.parse($(elem).contents().first().text());
  } catch (e) {
    return;
  }

  const entries = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];

  entries.forEach(item => {
    // Handle cases where @type may be an array
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];

    if (!types.includes('JobPosting')) return;

    const job = {};

    // Title
    if (item.title) job.title = String(item.title).trim();
    else if (item.name) job.title = String(item.name).trim();

    // Description
    if (item.description) job.description = String(item.description).trim();

    // Company name
    if (item.hiringOrganization && item.hiringOrganization.name) {
      job.companyName = String(item.hiringOrganization.name).trim();
    } else if (item.employer && item.employer.name) {
      job.companyName = String(item.employer.name).trim();
    }

    // Location (concatenate available address parts)
    if (item.jobLocation && item.jobLocation.address) {
      const addr = item.jobLocation.address;
      const parts = [
        addr.streetAddress,
        addr.addressLocality,
        addr.addressRegion,
        addr.postalCode,
        addr.addressCountry
      ].filter(Boolean).map(p => String(p).trim());
      if (parts.length) job.location = parts.join(', ');
    }

    // Job type mapping
    if (item.employmentType) {
      const map = {
        full_time: 'full_time',
        part_time: 'part_time',
        contract: 'contract',
        internship: 'internship',
        remote: 'remote',
        temporary: 'contract',
        permanent: 'full_time'
      };
      const clean = String(item.employmentType).replace(/_/g, ' ').toLowerCase().trim();
      job.jobType = map[clean] || clean.replace(/\s+/g, '_');
    }

    // Source URL
    if (item.url) job.sourceUrl = String(item.url).trim();

    // Posted date
    if (item.datePosted) job.postedDateIsoString = String(item.datePosted).trim();

    // Deadline / validThrough
    if (item.validThrough) job.deadlineIsoString = String(item.validThrough).trim();

    // Salary parsing
    if (item.baseSalary) {
      const salary = item.baseSalary;
      // MonetaryAmount with QuantitativeValue
      if (salary.value && salary.value['@type'] === 'QuantitativeValue') {
        const q = salary.value;
        if (q.minValue !== undefined) job.salaryMin = Number(q.minValue);
        if (q.maxValue !== undefined) job.salaryMax = Number(q.maxValue);
        if (q.currency) job.salaryCurrency = String(q.currency).trim();
      } else if (salary.minValue !== undefined || salary.maxValue !== undefined) {
        if (salary.minValue !== undefined) job.salaryMin = Number(salary.minValue);
        if (salary.maxValue !== undefined) job.salaryMax = Number(salary.maxValue);
        if (salary.currency) job.salaryCurrency = String(salary.currency).trim();
      } else if (salary['@type'] === 'MonetaryAmount' && salary.value) {
        const val = salary.value;
        if (typeof val === 'number') job.salaryMin = job.salaryMax = val;
        else if (typeof val === 'string') {
          const num = Number(val.replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num)) job.salaryMin = job.salaryMax = num;
        }
        if (salary.currency) job.salaryCurrency = String(salary.currency).trim();
      }
    }

    // Push only if we have at least a title (ensures it's a real job)
    if (job.title) result.push(job);
  });
});