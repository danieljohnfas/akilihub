const jobContainers = $('.job, .job-listing, .vacancy, .career-item, .listing-item, article').filter((_, el) => {
  const $el = $(el);
  const titleText = $el.find('h1, h2, h3, .job-title, .title, a').first().text().trim();
  return titleText.length > 0;
});

jobContainers.each((_, el) => {
  const $el = $(el);
  const title = $el.find('h1, h2, h3, .job-title, .title, a').first().text().trim();
  if (!title) return;

  const job = { title };

  const company = $el.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;

  const description = $el.find('.description, .job-description, .content, p').first().text().trim();
  if (description) job.description = description;

  const location = $el.find('.location, .job-location, .address').first().text().trim();
  if (location) job.location = location;

  const typeRaw = $el.find('.type, .job-type, .employment-type').first().text().toLowerCase().trim();
  if (typeRaw) {
    if (typeRaw.includes('full')) job.jobType = 'full_time';
    else if (typeRaw.includes('part')) job.jobType = 'part_time';
    else if (typeRaw.includes('contract')) job.jobType = 'contract';
    else if (typeRaw.includes('intern')) job.jobType = 'internship';
    else if (typeRaw.includes('remote')) job.jobType = 'remote';
    else job.jobType = typeRaw;
  }

  const sourceLink = $el.find('a[href][rel="nofollow"], a[href][target="_blank"]').first().attr('href');
  if (sourceLink) job.sourceUrl = sourceLink;

  const posted = $el.find('time[datetime]').first().attr('datetime');
  if (posted) job.postedDateIsoString = posted;

  const deadline = $el.find('.deadline time[datetime]').first().attr('datetime');
  if (deadline) job.deadlineIsoString = deadline;

  const salaryText = $el.find('.salary, .pay, .compensation').first().text();
  if (salaryText) {
    const match = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*([\d\.]+)\s*(?:-|\sto\s)\s*([A-Z]{3})?\s*([\d\.]+)/i);
    if (match) {
      const currency = match[1] || match[3] || '';
      const min = parseFloat(match[2]);
      const max = parseFloat(match[4]);
      if (!isNaN(min)) job.salaryMin = min;
      if (!isNaN(max)) job.salaryMax = max;
      if (currency) job.salaryCurrency = currency;
    } else {
      const singleMatch = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*([\d\.]+)/i);
      if (singleMatch) {
        const currency = singleMatch[1] || '';
        const amount = parseFloat(singleMatch[2]);
        if (!isNaN(amount)) {
          job.salaryMin = amount;
          job.salaryMax = amount;
          if (currency) job.salaryCurrency = currency;
        }
      }
    }
  }

  result.push(job);
});