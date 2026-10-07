const possibleContainers = $('article, .job, .post, .job-listing, .job-item, .listing-item, .job-card, .listing');

possibleContainers.each((_, el) => {
  const container = $(el);

  // Find a plausible title element
  let titleEl = container.find('h1 a, h2 a, h3 a, .job-title a, .entry-title a').first();
  if (!titleEl.length) titleEl = container.find('a').first();
  const title = titleEl.text().trim();
  if (!title) return; // not a job entry

  const job = { title };

  // source URL
  const href = titleEl.attr('href');
  if (href) job.sourceUrl = href;

  // company name
  const company = container.find('.company, .company-name, .meta .author, .entry-meta a, .author a').first().text().trim();
  if (company) job.companyName = company;

  // location
  const location = container.find('.location, .job-location, .meta .location, .place').first().text().trim();
  if (location) job.location = location;

  // description
  const description = container.find('.description, .job-description, .entry-content, .summary').first().text().trim();
  if (description) job.description = description;

  // job type
  let typeText = container.find('.job-type, .type, .meta .type, .employment-type').first().text().toLowerCase();
  if (typeText) {
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
  }

  // posted date
  let posted = container.find('time, .posted, .date, .post-date').first();
  let postedVal = posted.attr('datetime') || posted.text();
  if (postedVal) {
    const iso = new Date(postedVal).toISOString();
    if (!isNaN(Date.parse(postedVal))) job.postedDateIsoString = iso;
  }

  // deadline date
  let deadline = container.find('.deadline, .closing, .apply-by, .expire').first().text().trim();
  if (deadline) {
    const iso = new Date(deadline).toISOString();
    if (!isNaN(Date.parse(deadline))) job.deadlineIsoString = iso;
  }

  // salary extraction
  const salaryText = container.find('.salary, .pay, .compensation, .pay-range').first().text().replace(/,/g, '');
  if (salaryText) {
    const rangeMatch = salaryText.match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)\s*[-–]\s*([A-Z]{3})?\s?(\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
      const cur = rangeMatch[1] || rangeMatch[3] || '';
      job.salaryCurrency = cur.toUpperCase();
      job.salaryMin = parseFloat(rangeMatch[2]);
      job.salaryMax = parseFloat(rangeMatch[4]);
    } else {
      const singleMatch = salaryText.match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)/i);
      if (singleMatch) {
        job.salaryCurrency = (singleMatch[1] || '').toUpperCase();
        job.salaryMin = parseFloat(singleMatch[2]);
      }
    }
  }

  result.push(job);
});