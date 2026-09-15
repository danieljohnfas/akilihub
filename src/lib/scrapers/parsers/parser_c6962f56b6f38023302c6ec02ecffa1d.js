$('script[type="application/ld+json"]').each(function () {
  var txt = $(this).html();
  if (!txt) return;
  try {
    var data = JSON.parse(txt);
  } catch (e) {
    return;
  }
  var candidates = [];
  function collect(item) {
    if (Array.isArray(item)) {
      item.forEach(collect);
    } else if (item && typeof item === 'object') {
      if (item['@type'] === 'JobPosting') {
        candidates.push(item);
      } else if (item['@graph']) {
        item['@graph'].forEach(collect);
      } else {
        Object.values(item).forEach(function (v) {
          if (typeof v === 'object') collect(v);
        });
      }
    }
  }
  collect(data);
  candidates.forEach(function (job) {
    if (!job.title && !job.name) return;
    var obj = {};
    obj.title = job.title || job.name || '';
    if (job.hiringOrganization && job.hiringOrganization.name) obj.companyName = job.hiringOrganization.name;
    if (job.description) obj.description = job.description;
    if (job.jobLocation) {
      var loc = job.jobLocation;
      if (loc.address) {
        var parts = [];
        if (loc.address.streetAddress) parts.push(loc.address.streetAddress);
        if (loc.address.addressLocality) parts.push(loc.address.addressLocality);
        if (loc.address.addressRegion) parts.push(loc.address.addressRegion);
        if (loc.address.postalCode) parts.push(loc.address.postalCode);
        if (loc.address.addressCountry) parts.push(loc.address.addressCountry);
        obj.location = parts.join(', ');
      } else if (typeof loc === 'string') {
        obj.location = loc;
      }
    }
    var emp = (job.employmentType || '').toString().toLowerCase();
    if (emp.includes('full')) obj.jobType = 'full_time';
    else if (emp.includes('part')) obj.jobType = 'part_time';
    else if (emp.includes('contract')) obj.jobType = 'contract';
    else if (emp.includes('intern')) obj.jobType = 'internship';
    else if (emp.includes('remote')) obj.jobType = 'remote';
    if (job.url) obj.sourceUrl = job.url;
    if (job.datePosted) obj.postedDateIsoString = job.datePosted;
    if (job.validThrough) obj.deadlineIsoString = job.validThrough;
    var salary = job.baseSalary;
    if (salary) {
      if (salary.minValue) obj.salaryMin = Number(salary.minValue);
      else if (salary.value) obj.salaryMin = Number(salary.value);
      if (salary.maxValue) obj.salaryMax = Number(salary.maxValue);
      if (salary.currency) obj.salaryCurrency = salary.currency;
    }
    result.push(obj);
  });
});
if (result.length === 0) {
  $('[itemtype*="JobPosting"], .job-card, .job-item, article[data-job-id]').each(function () {
    var $c = $(this);
    var title = $c.find('h1, h2, h3, a').first().text().trim();
    if (!title) return;
    var obj = { title: title };
    var comp = $c.find('.company, .company-name').first().text().trim();
    if (comp) obj.companyName = comp;
    var desc = $c.find('.description, .job-description').first().text().trim();
    if (desc) obj.description = desc;
    var loc = $c.find('.location, .job-location').first().text().trim();
    if (loc) obj.location = loc;
    result.push(obj);
  });
}