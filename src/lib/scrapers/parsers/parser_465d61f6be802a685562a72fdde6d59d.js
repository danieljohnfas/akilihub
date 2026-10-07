// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const data = JSON.parse($(el).contents().text());
    const items = Array.isArray(data) ? data : [data];
    items.forEach(item => {
      if (item && item['@type'] === 'JobPosting') {
        const job = {};
        if (item.title) job.title = item.title;
        if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
        if (item.description) job.description = item.description;
        if (item.jobLocation && item.jobLocation.address) {
          const addr = item.jobLocation.address;
          if (addr.addressLocality) job.location = addr.addressLocality;
          else if (addr.streetAddress) job.location = addr.streetAddress;
        }
        if (item.employmentType) {
          const type = item.employmentType.toString().toLowerCase();
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
          const salary = item.baseSalary;
          if (salary.value) {
            if (salary.value.minValue) job.salaryMin = Number(salary.value.minValue);
            if (salary.value.maxValue) job.salaryMax = Number(salary.value.maxValue);
          }
          if (salary.currency) job.salaryCurrency = salary.currency;
        }
        result.push(job);
      }
    });
  } catch (e) {
    // ignore parsing errors
  }
});