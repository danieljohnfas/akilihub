// Parse all JSON‑LD blocks and extract JobPosting entries
$('script[type="application/ld+json"]').each((_, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().text());
  } catch (e) {
    // ignore malformed JSON
    return;
  }

  // The JSON may be an object with @graph or an array
  const candidates = [];
  if (Array.isArray(data)) {
    candidates.push(...data);
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data['@graph'])) {
      candidates.push(...data['@graph']);
    } else {
      candidates.push(data);
    }
  }

  candidates.forEach(item => {
    if (!item || item['@type'] !== 'JobPosting') return;

    const job = {};

    // Title
    if (item.title) job.title = String(item.title).trim();
    else if (item.name) job.title = String(item.name).trim();

    // Company
    if (item.hiringOrganization && item.hiringOrganization.name) {
      job.companyName = String(item.hiringOrganization.name).trim();
    }

    // Description
    if (item.description) job.description = String(item.description).trim();

    // Location
    if (item.jobLocation && item.jobLocation.address) {
      const addr = item.jobLocation.address;
      const parts = [];
      if (addr.addressLocality) parts.push(addr.addressLocality);
      if (addr.addressRegion) parts.push(addr.addressRegion);
      if (addr.addressCountry) parts.push(addr.addressCountry);
      job.location = parts.join(', ');
    }

    // Job type mapping
    if (item.employmentType) {
      const typeStr = String(item.employmentType).toLowerCase();
      if (typeStr.includes('full')) job.jobType = 'full_time';
      else if (typeStr.includes('part')) job.jobType = 'part_time';
      else if (typeStr.includes('contract')) job.jobType = 'contract';
      else if (typeStr.includes('intern')) job.jobType = 'internship';
      else if (typeStr.includes('remote')) job.jobType = 'remote';
    }

    // Source URL
    if (item.url) job.sourceUrl = String(item.url).trim();

    // Dates
    if (item.datePosted) job.postedDateIsoString = String(item.datePosted).trim();
    if (item.validThrough) job.deadlineIsoString = String(item.validThrough).trim();

    // Salary handling – supports both single value and range objects
    if (item.baseSalary) {
      const salary = item.baseSalary;
      // Currency
      if (salary.currency) job.salaryCurrency = String(salary.currency).trim();

      // Value can be a number or an object with minValue/maxValue/value
      if (typeof salary.value === 'object' && salary.value !== null) {
        if (salary.value.minValue != null) job.salaryMin = Number(salary.value.minValue);
        if (salary.value.maxValue != null) job.salaryMax = Number(salary.value.maxValue);
        if (salary.value.value != null && job.salaryMin == null && job.salaryMax == null) {
          const val = Number(salary.value.value);
          job.salaryMin = val;
          job.salaryMax = val;
        }
      } else if (salary.value != null) {
        const val = Number(salary.value);
        job.salaryMin = val;
        job.salaryMax = val;
      }
    }

    // Only push if we have at least a title (clear job listing)
    if (job.title) result.push(job);
  });
});