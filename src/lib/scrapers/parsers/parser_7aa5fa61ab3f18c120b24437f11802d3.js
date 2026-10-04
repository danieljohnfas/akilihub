let scripts = $('script[type="application/ld+json"]');
scripts.each((i, el) => {
  let jsonText = $(el).contents().first().text();
  if (!jsonText) return;
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return;
  }
  let candidates = [];
  if (Array.isArray(data)) {
    candidates = data;
  } else if (data['@graph']) {
    candidates = data['@graph'];
  } else {
    candidates = [data];
  }
  candidates.forEach(item => {
    let types = item['@type'];
    if (!types) return;
    if (Array.isArray(types) ? types.includes('JobPosting') : types === 'JobPosting') {
      let job = {};
      if (item.title) job.title = String(item.title).trim();
      else if (item.name) job.title = String(item.name).trim();
      else if (item.headline) job.title = String(item.headline).trim();

      if (item.hiringOrganization && item.hiringOrganization.name) {
        job.companyName = String(item.hiringOrganization.name).trim();
      }

      if (item.description) job.description = String(item.description).trim();

      if (item.jobLocation && item.jobLocation.address) {
        let addr = item.jobLocation.address;
        let parts = [];
        if (addr.addressLocality) parts.push(addr.addressLocality);
        if (addr.addressRegion) parts.push(addr.addressRegion);
        if (addr.addressCountry) parts.push(addr.addressCountry);
        job.location = parts.join(', ');
      }

      if (item.employmentType) {
        let typeStr = Array.isArray(item.employmentType) ? item.employmentType[0] : item.employmentType;
        typeStr = typeStr.toLowerCase();
        if (typeStr.includes('full')) job.jobType = 'full_time';
        else if (typeStr.includes('part')) job.jobType = 'part_time';
        else if (typeStr.includes('contract')) job.jobType = 'contract';
        else if (typeStr.includes('intern')) job.jobType = 'internship';
        else if (typeStr.includes('remote')) job.jobType = 'remote';
      }

      if (item.url) job.sourceUrl = String(item.url).trim();
      else if (item.sameAs) job.sourceUrl = String(item.sameAs).trim();

      if (item.datePosted) job.postedDateIsoString = String(item.datePosted).trim();
      if (item.validThrough) job.deadlineIsoString = String(item.validThrough).trim();

      if (item.baseSalary) {
        let salary = item.baseSalary;
        if (salary['@type'] === 'MonetaryAmount' && salary.value) {
          let val = salary.value;
          if (typeof val === 'object') {
            if (val.minValue != null) job.salaryMin = Number(val.minValue);
            if (val.maxValue != null) job.salaryMax = Number(val.maxValue);
            if (val.value != null) {
              job.salaryMin = Number(val.value);
              job.salaryMax = Number(val.value);
            }
            if (val.currency) job.salaryCurrency = String(val.currency).trim();
          } else if (typeof val === 'number' || typeof val === 'string') {
            let num = Number(val);
            if (!isNaN(num)) {
              job.salaryMin = num;
              job.salaryMax = num;
            }
          }
          if (salary.currency) job.salaryCurrency = String(salary.currency).trim();
        }
      }

      result.push(job);
    }
  });
});