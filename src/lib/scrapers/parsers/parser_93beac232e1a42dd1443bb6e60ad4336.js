const containers = $('[class*="job"], [class*="position"], [class*="vacancy"], .career-item, .listing-item');

containers.each((_, el) => {
  const $el = $(el);

  const title = $el.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;

  const job = { title };

  const company = $el.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;

  const description = $el.find('.description, .job-description, p').text().trim();
  if (description) job.description = description;

  const location = $el.find('.location, .job-location').first().text().trim();
  if (location) job.location = location;

  const typeText = $el.find('.job-type, .employment-type').first().text().toLowerCase().trim();
  if (typeText) {
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
  }

  const sourceUrl = $el.find('a[href*="apply"], a.apply-link').first().attr('href');
  if (sourceUrl) job.sourceUrl = sourceUrl;

  const posted = $el.find('.posted-date, time[datetime]').first().attr('datetime') ||
                 $el.find('.posted-date').first().text().trim();
  if (posted) job.postedDateIsoString = new Date(posted).toISOString();

  const deadline = $el.find('.deadline-date').first().attr('datetime') ||
                   $el.find('.deadline-date').first().text().trim();
  if (deadline) job.deadlineIsoString = new Date(deadline).toISOString();

  const salaryText = $el.find('.salary, .compensation').first().text().trim();
  if (salaryText) {
    const match = salaryText.match(/([A-Z]{3})?\s*([\d,]+)\s*(?:-|\sto\s)\s*([A-Z]{3})?\s*([\d,]+)/i);
    if (match) {
      const currency = match[1] || match[3] || '';
      const min = parseFloat(match[2].replace(/,/g, ''));
      const max = parseFloat(match[4].replace(/,/g, ''));
      if (!isNaN(min)) job.salaryMin = min;
      if (!isNaN(max)) job.salaryMax = max;
      if (currency) job.salaryCurrency = currency;
    }
  }

  result.push(job);
});