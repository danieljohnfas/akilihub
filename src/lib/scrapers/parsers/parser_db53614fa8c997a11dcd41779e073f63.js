const ldScripts = $('script[type="application/ld+json"]');
ldScripts.each((_, el) => {
  try {
    const jsonText = $(el).contents().text();
    if (!jsonText) return;
    const data = JSON.parse(jsonText);
    const items = Array.isArray(data) ? data : [data];
    items.forEach(item => {
      if (item['@type'] !== 'JobPosting') return;
      const job = {};
      if (item.title) job.title = item.title;
      else if (item.headline) job.title = item.headline;
      if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
      if (item.description) job.description = item.description;
      if (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) {
        job.location = item.jobLocation.address.addressLocality;
      }
      if (item.employmentType) {
        const type = item.employmentType.toString().toLowerCase();
        if (type.includes('full')) job.jobType = 'full_time';
        else if (type.includes('part')) job.jobType = 'part_time';
        else if (type.includes('contract')) job.jobType = 'contract';
        else if (type.includes('intern')) job.jobType = 'internship';
        else if (type.includes('remote')) job.jobType = 'remote';
      }
      if (item.identifier && item.identifier.url) job.sourceUrl = item.identifier.url;
      else if (item.url) job.sourceUrl = item.url;
      if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
      if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
      if (item.baseSalary) {
        const salary = item.baseSalary;
        if (salary.minValue) job.salaryMin = Number(salary.minValue);
        if (salary.maxValue) job.salaryMax = Number(salary.maxValue);
        if (salary.currency) job.salaryCurrency = salary.currency;
        if (!job.salaryMin && salary.value) job.salaryMin = Number(salary.value);
        if (!job.salaryMax && salary.value) job.salaryMax = Number(salary.value);
      }
      result.push(job);
    });
  } catch (e) {
    // ignore malformed JSON
  }
});