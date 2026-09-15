// Ensure result is defined (provided globally)
$('script[type="application/ld+json"]').each((_, script) => {
  let data;
  try {
    data = JSON.parse($(script).contents().first().text());
  } catch (e) {
    return;
  }
  const items = Array.isArray(data) ? data : [data];
  items.forEach(item => {
    // Handle nested @graph arrays
    const candidates = item['@graph'] ? (Array.isArray(item['@graph']) ? item['@graph'] : [item['@graph']]) : [item];
    candidates.forEach(job => {
      if (!job['@type']) return;
      const types = Array.isArray(job['@type']) ? job['@type'] : [job['@type']];
      if (!types.includes('JobPosting')) return;

      const jobObj = {};

      // Title
      jobObj.title = job.title || job.name || null;

      // Company name
      if (job.hiringOrganization && typeof job.hiringOrganization === 'object') {
        jobObj.companyName = job.hiringOrganization.name || null;
      }

      // Description (strip HTML tags if present)
      if (job.description) {
        jobObj.description = typeof job.description === 'string' ? job.description.replace(/<[^>]*>/g, '').trim() : null;
      }

      // Location
      if (job.jobLocation && job.jobLocation.address) {
        const addr = job.jobLocation.address;
        const parts = [];
        if (addr.streetAddress) parts.push(addr.streetAddress);
        if (addr.addressLocality) parts.push(addr.addressLocality);
        if (addr.addressRegion) parts.push(addr.addressRegion);
        if (addr.postalCode) parts.push(addr.postalCode);
        if (addr.addressCountry) parts.push(addr.addressCountry);
        jobObj.location = parts.join(', ') || null;
      }

      // Job type normalization
      if (job.employmentType) {
        const typeStr = Array.isArray(job.employmentType) ? job.employmentType[0] : job.employmentType;
        const lowered = typeStr.toLowerCase();
        if (lowered.includes('full')) jobObj.jobType = 'full_time';
        else if (lowered.includes('part')) jobObj.jobType = 'part_time';
        else if (lowered.includes('contract')) jobObj.jobType = 'contract';
        else if (lowered.includes('intern')) jobObj.jobType = 'internship';
        else if (lowered.includes('remote')) jobObj.jobType = 'remote';
        else jobObj.jobType = lowered;
      }

      // Source URL
      jobObj.sourceUrl = job.sameAs || job.url || null;

      // Dates
      if (job.datePosted) jobObj.postedDateIsoString = job.datePosted;
      if (job.validThrough) jobObj.deadlineIsoString = job.validThrough;

      // Salary handling
      if (job.baseSalary && typeof job.baseSalary === 'object') {
        const sal = job.baseSalary;
        if (sal.value && typeof sal.value === 'object') {
          jobObj.salaryMin = sal.value.minValue != null ? Number(sal.value.minValue) : null;
          jobObj.salaryMax = sal.value.maxValue != null ? Number(sal.value.maxValue) : null;
          jobObj.salaryCurrency = sal.value.currency || null;
        } else if (sal.minValue != null || sal.maxValue != null) {
          jobObj.salaryMin = sal.minValue != null ? Number(sal.minValue) : null;
          jobObj.salaryMax = sal.maxValue != null ? Number(sal.maxValue) : null;
          jobObj.salaryCurrency = sal.currency || null;
        }
      }

      // Push only if we have a clear title
      if (jobObj.title) {
        result.push(jobObj);
      }
    });
  });
});