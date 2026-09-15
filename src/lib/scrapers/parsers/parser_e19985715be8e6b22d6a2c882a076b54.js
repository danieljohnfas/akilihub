const jobSelectors = ['.job-card', '.job-listing', '.job-item', '[data-job]', 'article.job'];
let anyFound = false;
jobSelectors.forEach(sel => {
  $(sel).each((_, el) => {
    anyFound = true;
    const $el = $(el);
    const job = {};
    const title = $el.find('h1, h2, .title, .job-title').first().text().trim();
    if (title) job.title = title;
    const company = $el.find('.company, .company-name').first().text().trim();
    if (company) job.companyName = company;
    const location = $el.find('.location, .job-location').first().text().trim();
    if (location) job.location = location;
    const description = $el.find('.description, .job-description').first().text().trim();
    if (description) job.description = description;
    const typeText = $el.find('.job-type, .employment-type').first().text().trim().toLowerCase();
    if (typeText) {
      const map = { fulltime: 'full_time', parttime: 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
      job.jobType = map[typeText.replace(/\s+/g, '')] || null;
    }
    const salary = $el.find('.salary').first().text().trim();
    if (salary) {
      const match = salary.match(/([\d,]+)\s*-\s*([\d,]+)/);
      if (match) {
        job.salaryMin = Number(match[1].replace(/,/g, ''));
        job.salaryMax = Number(match[2].replace(/,/g, ''));
      }
    }
    result.push(job);
  });
});
if (!anyFound) {
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const processJob = obj => {
        if (obj && obj['@type'] === 'JobPosting') {
          const job = {};
          if (obj.title) job.title = obj.title;
          if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = obj.hiringOrganization.name;
          if (obj.jobLocation && obj.jobLocation.address && obj.jobLocation.address.addressLocality) job.location = obj.jobLocation.address.addressLocality;
          if (obj.description) job.description = obj.description;
          if (obj.url) job.sourceUrl = obj.url;
          if (obj.datePosted) job.postedDateIsoString = obj.datePosted;
          if (obj.validThrough) job.deadlineIsoString = obj.validThrough;
          if (obj.employmentType) {
            const map = { FULL_TIME: 'full_time', PART_TIME: 'part_time', CONTRACT: 'contract', INTERNSHIP: 'internship', REMOTE: 'remote' };
            const type = Array.isArray(obj.employmentType) ? obj.employmentType[0] : obj.employmentType;
            job.jobType = map[type.toUpperCase()] || null;
          }
          if (obj.baseSalary && obj.baseSalary.value) {
            const val = obj.baseSalary.value;
            if (val.minValue) job.salaryMin = Number(val.minValue);
            if (val.maxValue) job.salaryMax = Number(val.maxValue);
            if (val.currency) job.salaryCurrency = val.currency;
          }
          result.push(job);
        }
      };
      const traverse = node => {
        if (Array.isArray(node)) {
          node.forEach(traverse);
        } else if (node && typeof node === 'object') {
          processJob(node);
          Object.values(node).forEach(traverse);
        }
      };
      traverse(data);
    } catch (e) {}
  });
}