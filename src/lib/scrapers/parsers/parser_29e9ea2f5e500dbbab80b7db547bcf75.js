const jobData = [];
$('script[type="application/ld+json"]').each(function () {
  try {
    const parsed = JSON.parse($(this).html());
    const items = Array.isArray(parsed) ? parsed : [parsed];
    items.forEach(item => {
      if (item['@type'] === 'JobPosting') {
        const job = {};
        if (item.title) job.title = item.title;
        if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
        if (item.description) job.description = item.description;
        if (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) job.location = item.jobLocation.address.addressLocality;
        if (item.employmentType) {
          const type = item.employmentType.toLowerCase();
          if (type.includes('full')) job.jobType = 'full_time';
          else if (type.includes('part')) job.jobType = 'part_time';
          else if (type.includes('contract')) job.jobType = 'contract';
          else if (type.includes('intern')) job.jobType = 'internship';
          else if (type.includes('remote')) job.jobType = 'remote';
        }
        if (item.url) job.sourceUrl = item.url;
        if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
        if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
        if (item.baseSalary && item.baseSalary.value) {
          const val = item.baseSalary.value;
          if (val.minValue != null) job.salaryMin = Number(val.minValue);
          if (val.maxValue != null) job.salaryMax = Number(val.maxValue);
          if (val.currency) job.salaryCurrency = val.currency;
        }
        jobData.push(job);
      }
    });
  } catch (e) {}
});
jobData.forEach(j => result.push(j));