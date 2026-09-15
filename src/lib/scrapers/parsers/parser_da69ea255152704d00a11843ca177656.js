$('script[type="application/ld+json"]').each(function () {
  var text = $(this).contents().first().text().trim();
  if (!text) return;
  try {
    var data = JSON.parse(text);
  } catch (e) {
    return;
  }
  var items = Array.isArray(data) ? data : [data];
  items.forEach(function (obj) {
    if (!obj || !obj['@type']) return;
    var types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
    if (!types.includes('JobPosting')) return;
    var job = {};
    if (obj.title) job.title = String(obj.title).trim();
    else if (obj.headline) job.title = String(obj.headline).trim();
    if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = String(obj.hiringOrganization.name).trim();
    if (obj.description) job.description = String(obj.description).trim();
    if (obj.jobLocation && obj.jobLocation.address) {
      var addr = obj.jobLocation.address;
      var parts = [];
      if (addr.streetAddress) parts.push(addr.streetAddress);
      if (addr.addressLocality) parts.push(addr.addressLocality);
      if (addr.addressRegion) parts.push(addr.addressRegion);
      if (addr.postalCode) parts.push(addr.postalCode);
      if (addr.addressCountry) parts.push(addr.addressCountry);
      job.location = parts.join(', ');
    }
    if (obj.employmentType) {
      var typeMap = {
        'FULL_TIME': 'full_time',
        'PART_TIME': 'part_time',
        'CONTRACT': 'contract',
        'INTERNSHIP': 'internship',
        'TEMPORARY': 'contract',
        'REMOTE': 'remote'
      };
      var et = String(obj.employmentType).toUpperCase();
      job.jobType = typeMap[et] || et.toLowerCase();
    }
    if (obj.url) job.sourceUrl = String(obj.url).trim();
    if (obj.datePosted) job.postedDateIsoString = String(obj.datePosted).trim();
    if (obj.validThrough) job.deadlineIsoString = String(obj.validThrough).trim();
    if (obj.baseSalary) {
      var salary = obj.baseSalary;
      if (salary.value) {
        if (salary.value.minValue) job.salaryMin = Number(salary.value.minValue);
        if (salary.value.maxValue) job.salaryMax = Number(salary.value.maxValue);
        if (salary.value.currency) job.salaryCurrency = String(salary.value.currency).trim();
      } else if (salary.minValue || salary.maxValue) {
        if (salary.minValue) job.salaryMin = Number(salary.minValue);
        if (salary.maxValue) job.salaryMax = Number(salary.maxValue);
        if (salary.currency) job.salaryCurrency = String(salary.currency).trim();
      }
    }
    result.push(job);
  });
});