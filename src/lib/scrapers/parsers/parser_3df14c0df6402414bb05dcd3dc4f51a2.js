$('script[type="application/ld+json"]').each(function () {
  let json;
  try {
    json = JSON.parse($(this).html());
  } catch (e) {
    return;
  }
  const items = Array.isArray(json) ? json : [json];
  items.forEach(function (item) {
    const extractJobs = function (obj) {
      if (!obj) return;
      const type = obj['@type'] || (Array.isArray(obj['@type']) && obj['@type'][0]);
      if (type && type.toString().toLowerCase() === 'jobposting') {
        const job = {};
        if (obj.title) job.title = String(obj.title).trim();
        else if (obj.name) job.title = String(obj.name).trim();

        if (obj.hiringOrganization && obj.hiringOrganization.name) {
          job.companyName = String(obj.hiringOrganization.name).trim();
        }

        if (obj.description) job.description = String(obj.description).trim();

        if (obj.jobLocation && obj.jobLocation.address) {
          const addr = obj.jobLocation.address;
          const parts = [];
          if (addr.streetAddress) parts.push(addr.streetAddress);
          if (addr.addressLocality) parts.push(addr.addressLocality);
          if (addr.addressRegion) parts.push(addr.addressRegion);
          if (addr.addressCountry) parts.push(addr.addressCountry);
          job.location = parts.join(', ');
        }

        if (obj.employmentType) {
          const et = String(obj.employmentType).toLowerCase();
          if (et.includes('full')) job.jobType = 'full_time';
          else if (et.includes('part')) job.jobType = 'part_time';
          else if (et.includes('contract')) job.jobType = 'contract';
          else if (et.includes('intern')) job.jobType = 'internship';
          else if (et.includes('remote')) job.jobType = 'remote';
        }

        if (obj.url) job.sourceUrl = String(obj.url).trim();

        if (obj.datePosted) job.postedDateIsoString = new Date(obj.datePosted).toISOString();

        if (obj.validThrough) job.deadlineIsoString = new Date(obj.validThrough).toISOString();

        if (obj.baseSalary && typeof obj.baseSalary === 'object') {
          const val = obj.baseSalary.value || obj.baseSalary;
          if (val && typeof val === 'object') {
            if (val.minValue != null) job.salaryMin = Number(val.minValue);
            if (val.maxValue != null) job.salaryMax = Number(val.maxValue);
            if (val.currency) job.salaryCurrency = String(val.currency).trim();
          }
        }

        result.push(job);
      } else {
        // Recursively search nested objects/arrays for JobPosting
        Object.values(obj).forEach(function (v) {
          if (Array.isArray(v)) v.forEach(extractJobs);
          else if (v && typeof v === 'object') extractJobs(v);
        });
      }
    };
    extractJobs(item);
  });
});