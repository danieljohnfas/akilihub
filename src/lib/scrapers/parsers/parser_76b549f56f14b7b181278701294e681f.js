const scripts = $('script[type="application/ld+json"]');
scripts.each((_, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().text());
  } catch (_) {
    return;
  }
  const extractJob = (job) => {
    if (!job || job['@type'] !== 'JobPosting' || !job.title) return;
    const obj = {
      title: job.title || '',
      companyName: job.hiringOrganization && job.hiringOrganization.name ? job.hiringOrganization.name : '',
      description: job.description || '',
      location: job.jobLocation && job.jobLocation.address && job.jobLocation.address.addressLocality
        ? job.jobLocation.address.addressLocality
        : '',
      jobType: (job.employmentType && typeof job.employmentType === 'string')
        ? job.employmentType.toLowerCase().replace(/\s+/g, '_')
        : '',
      sourceUrl: job.url || '',
      postedDateIsoString: job.datePosted || '',
      deadlineIsoString: job.validThrough || '',
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: ''
    };
    if (job.baseSalary) {
      const salary = job.baseSalary;
      if (salary['@type'] === 'MonetaryAmount') {
        obj.salaryCurrency = salary.currency || '';
        if (salary.value) {
          if (typeof salary.value === 'object') {
            obj.salaryMin = salary.value.minValue != null ? Number(salary.value.minValue) : null;
            obj.salaryMax = salary.value.maxValue != null ? Number(salary.value.maxValue) : null;
          } else {
            obj.salaryMin = Number(salary.value);
          }
        }
      }
    }
    result.push(obj);
  };
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item['@type'] === 'JobPosting') extractJob(item);
      else if (item.itemListElement) {
        const list = Array.isArray(item.itemListElement) ? item.itemListElement : [item.itemListElement];
        list.forEach(elem => {
          if (elem['@type'] === 'JobPosting') extractJob(elem);
        });
      }
    });
  } else {
    if (data['@type'] === 'JobPosting') extractJob(data);
    else if (data.itemListElement) {
      const list = Array.isArray(data.itemListElement) ? data.itemListElement : [data.itemListElement];
      list.forEach(elem => {
        if (elem['@type'] === 'JobPosting') extractJob(elem);
      });
    }
  }
});