const jsonLdScripts = $('script[type="application/ld+json"]');
jsonLdScripts.each((i, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().first().text());
  } catch (e) {
    return;
  }
  const items = Array.isArray(data) ? data : [data];
  items.forEach(item => {
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (!types.includes('JobPosting')) return;
    const job = {};
    job.title = item.title || item.name || '';
    const org = item.hiringOrganization || {};
    job.companyName = org.name || '';
    job.description = item.description || '';
    if (item.jobLocation && item.jobLocation.address) {
      const addr = item.jobLocation.address;
      job.location = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean).join(', ');
    }
    const emp = item.employmentType;
    if (emp) {
      const empStr = Array.isArray(emp) ? emp[0] : emp;
      const lower = empStr.toLowerCase();
      if (lower.includes('full')) job.jobType = 'full_time';
      else if (lower.includes('part')) job.jobType = 'part_time';
      else if (lower.includes('contract')) job.jobType = 'contract';
      else if (lower.includes('intern')) job.jobType = 'internship';
      else if (lower.includes('remote')) job.jobType = 'remote';
    }
    job.sourceUrl = item.url || item.sameAs || '';
    job.postedDateIsoString = item.datePosted || '';
    job.deadlineIsoString = item.validThrough || '';
    const salary = item.baseSalary;
    if (salary && salary.value) {
      const val = salary.value;
      if (typeof val.minValue === 'number') job.salaryMin = val.minValue;
      if (typeof val.maxValue === 'number') job.salaryMax = val.maxValue;
      job.salaryCurrency = val.currency || '';
    } else if (salary && typeof salary.minValue === 'number') {
      job.salaryMin = salary.minValue;
      job.salaryMax = salary.maxValue;
      job.salaryCurrency = salary.currency || '';
    }
    result.push(job);
  });
});
if (result.length === 0) {
  const containers = $('.job, .job-listing, .vacancy, .career-item, article.job, .post');
  containers.each((i, el) => {
    const $c = $(el);
    const title = $c.find('h1, h2, h3, a').first().text().trim();
    if (!title) return;
    const job = { title };
    const comp = $c.find('.company, .company-name, .employer').first().text().trim();
    if (comp) job.companyName = comp;
    const desc = $c.find('.description, .job-description, p').first().text().trim();
    if (desc) job.description = desc;
    const loc = $c.find('.location, .job-location').first().text().trim();
    if (loc) job.location = loc;
    const type = $c.find('.job-type, .employment-type').first().text().trim().toLowerCase();
    if (type) {
      if (type.includes('full')) job.jobType = 'full_time';
      else if (type.includes('part')) job.jobType = 'part_time';
      else if (type.includes('contract')) job.jobType = 'contract';
      else if (type.includes('intern')) job.jobType = 'internship';
      else if (type.includes('remote')) job.jobType = 'remote';
    }
    const link = $c.find('a').first().attr('href');
    if (link) job.sourceUrl = link;
    const dateAttr = $c.find('time').first().attr('datetime');
    const dateText = dateAttr || $c.find('.date-posted').first().text().trim();
    if (dateText) job.postedDateIsoString = dateText;
    const deadlineAttr = $c.find('time.deadline').first().attr('datetime');
    const deadlineText = deadlineAttr || $c.find('.deadline').first().text().trim();
    if (deadlineText) job.deadlineIsoString = deadlineText;
    const salaryText = $c.find('.salary, .pay').first().text().trim();
    if (salaryText) {
      const cleaned = salaryText.replace(/,/g, '');
      const match = cleaned.match(/([A-Z]{3})?\s*(\d+(?:\.\d+)?)(?:\s*-\s*([A-Z]{3})?\s*(\d+(?:\.\d+)?))?/i);
      if (match) {
        if (match[2]) job.salaryMin = parseFloat(match[2]);
        if (match[4]) job.salaryMax = parseFloat(match[4]);
        job.salaryCurrency = (match[1] || match[3] || '').toUpperCase();
      }
    }
    result.push(job