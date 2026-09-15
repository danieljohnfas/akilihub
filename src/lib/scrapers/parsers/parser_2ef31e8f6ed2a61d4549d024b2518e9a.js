// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const data = JSON.parse($(el).contents().text());
    const process = obj => {
      if (!obj || obj['@type'] !== 'JobPosting') return;
      const job = {};
      if (obj.title) job.title = obj.title;
      else if (obj.name) job.title = obj.name;
      if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = obj.hiringOrganization.name;
      if (obj.description) job.description = obj.description;
      if (obj.jobLocation && obj.jobLocation.address) {
        const addr = obj.jobLocation.address;
        job.location = addr.addressLocality || addr.addressRegion || addr.streetAddress || '';
      }
      if (obj.employmentType) {
        const type = obj.employmentType.toString().toLowerCase();
        if (type.includes('full')) job.jobType = 'full_time';
        else if (type.includes('part')) job.jobType = 'part_time';
        else if (type.includes('contract')) job.jobType = 'contract';
        else if (type.includes('intern')) job.jobType = 'internship';
        else if (type.includes('remote')) job.jobType = 'remote';
      }
      if (obj.sameAs) job.sourceUrl = obj.sameAs;
      else if (obj.url) job.sourceUrl = obj.url;
      if (obj.datePosted) job.postedDateIsoString = obj.datePosted;
      if (obj.validThrough) job.deadlineIsoString = obj.validThrough;
      if (obj.baseSalary) {
        const sal = obj.baseSalary;
        if (typeof sal === 'object') {
          if (sal.value) {
            if (sal.value.minValue) job.salaryMin = Number(sal.value.minValue);
            if (sal.value.maxValue) job.salaryMax = Number(sal.value.maxValue);
            if (sal.value.currency) job.salaryCurrency = sal.value.currency;
          } else {
            if (sal.minValue) job.salaryMin = Number(sal.minValue);
            if (sal.maxValue) job.salaryMax = Number(sal.maxValue);
            if (sal.currency) job.salaryCurrency = sal.currency;
          }
        }
      }
      if (job.title) result.push(job);
    };
    if (Array.isArray(data)) data.forEach(process);
    else if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
      data.itemListElement.forEach(item => process(item));
    } else {
      process(data);
    }
  } catch (_) {}
});

// Fallback: scrape common DOM patterns
const containers = $('.job-card, .job-listing, .job-item, .listing-item, article.job, li.job, [data-job-id]');
containers.each((_, el) => {
  const $c = $(el);
  const title = $c.find('h1, h2, h3, .title, a').first().text().trim();
  if (!title) return;
  const job = { title };
  const company = $c.find('.company, .company-name').first().text().trim();
  if (company) job.companyName = company;
  const desc = $c.find('.description, .summary, .job-description').first().text().trim();
  if (desc) job.description = desc;
  const loc = $c.find('.location, .job-location').first().text().trim();
  if (loc) job.location = loc;
  const typeText = $c.find('.type, .employment-type').first().text().toLowerCase();
  if (typeText) {
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
  }
  const link = $c.find('a[href]').first().attr('href');
  if (link) job.sourceUrl = link;
  const posted = $c.find('time[datetime]').first().attr('datetime');
  if (posted) job.postedDateIsoString = posted;
  const deadline = $c.find('.deadline time[datetime]').first().attr('datetime');
  if (deadline) job.deadlineIsoString = deadline;
  const salaryText = $c.find('.salary, .pay').first().text();
  if (salaryText) {
    const m = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)(?:\s*-\s*([A-Z]{3})?\s?(\d+(?:\.\d+)?))?/i);
    if (m) {
      if (m[2]) job.salaryMin = Number(m[2]);
      if (m[4]) job.salaryMax = Number(m[4]);
      if (m[1]) job.salaryCurrency = m[1];
      else if (m[3]) job.salaryCurrency = m[3];
    }
  }
  result.push(job);
});