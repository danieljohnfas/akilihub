const selectors = [
  '.job-listing',
  '.job',
  '.position',
  'article.job',
  'li.job-item',
  '.career-item',
  '.vacancy',
  '.opening',
  '.posting'
];
const jobContainers = $(selectors.join(','));
jobContainers.each((_, el) => {
  const container = $(el);
  const title = container.find('h1, h2, h3, .job-title, .title').first().text().trim();
  if (!title) return;
  const job = { title };
  const company = container.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;
  const description = container.find('.description, .job-description, p').first().text().trim();
  if (description) job.description = description;
  const location = container.find('.location, .job-location, .city').first().text().trim();
  if (location) job.location = location;
  const typeText = container.find('.job-type, .type').first().text().toLowerCase();
  if (typeText.includes('full')) job.jobType = 'full_time';
  else if (typeText.includes('part')) job.jobType = 'part_time';
  else if (typeText.includes('contract')) job.jobType = 'contract';
  else if (typeText.includes('intern')) job.jobType = 'internship';
  else if (typeText.includes('remote')) job.jobType = 'remote';
  const sourceLink = container.find('a').filter((_, a) => {
    const href = $(a).attr('href') || '';
    return href && !href.includes('#') && !href.startsWith('javascript:');
  }).first().attr('href');
  if (sourceLink) job.sourceUrl = sourceLink;
  const posted = container.find('time[datetime]').first().attr('datetime') || container.find('.posted-date').first().text().trim();
  if (posted) job.postedDateIsoString = new Date(posted).toISOString();
  const deadline = container.find('.deadline, time[deadline]').first().attr('datetime') || container.find('.deadline-date').first().text().trim();
  if (deadline) job.deadlineIsoString = new Date(deadline).toISOString();
  const salaryText = container.find('.salary, .pay').first().text().replace(/,/g, '').trim();
  if (salaryText) {
    const match = salaryText.match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)(?:\s?-\s?([A-Z]{3})?\s?(\d+(?:\.\d+)?))?/i);
    if (match) {
      const currency1 = match[1] || '';
      const amount1 = parseFloat(match[2]);
      const currency2 = match[3] || currency1;
      const amount2 = match[4] ? parseFloat(match[4]) : amount1;
      if (!isNaN(amount1)) {
        job.salaryMin = amount1;
        job.salaryCurrency = currency1 || 'USD';
      }
      if (!isNaN(amount2) && amount2 !== amount1) {
        job.salaryMax = amount2;
        if (!job.salaryCurrency) job.salaryCurrency = currency2 || 'USD';
      }
    }
  }
  result.push(job);
});