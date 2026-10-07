const jobData = [];
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const json = JSON.parse($(el).html());
    const items = Array.isArray(json) ? json : [json];
    items.forEach(item => {
      if (item['@type'] === 'JobPosting') {
        const job = {
          title: item.title || '',
          companyName: (item.hiringOrganization && item.hiringOrganization.name) || '',
          description: item.description || '',
          location: (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) || '',
          jobType: (item.employmentType && item.employmentType.toLowerCase().replace(/\s+/g, '_')) || '',
          sourceUrl: item.url || '',
          postedDateIsoString: item.datePosted || '',
          deadlineIsoString: item.validThrough || '',
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: null
        };
        if (item.baseSalary) {
          const salary = item.baseSalary;
          if (salary.value) {
            job.salaryMin = salary.value.minValue != null ? Number(salary.value.minValue) : null;
            job.salaryMax = salary.value.maxValue != null ? Number(salary.value.maxValue) : null;
            job.salaryCurrency = salary.value.currency || null;
          }
        }
        jobData.push(job);
      }
    });
  } catch (e) {}
});
jobData.forEach(j => result.push(j));