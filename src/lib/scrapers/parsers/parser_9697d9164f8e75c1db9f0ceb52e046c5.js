let jobContainers = $('.vacancy-item, .job-item, .listing, .job, .vacancy');

jobContainers.each((_, elem) => {
  const container = $(elem);

  // Title (must exist for a valid job)
  const title = container.find('h1, h2, h3, .title, .job-title, a').first().text().trim();
  if (!title) return;

  const job = {
    title,
    companyName: '',
    description: '',
    location: '',
    jobType: '',
    sourceUrl: '',
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  };

  // Company name
  const company = container.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;

  // Description
  const description = container.find('.description, .job-description, p').first().text().trim();
  if (description) job.description = description;

  // Location
  const location = container.find('.location, .job-location, .place').first().text().trim();
  if (location) job.location = location;

  // Job type (full_time, part_time, contract, internship, remote)
  const typeText = container.find('.type, .job-type').first().text().toLowerCase();
  if (typeText.includes('full')) job.jobType = 'full_time';
  else if (typeText.includes('part')) job.jobType = 'part_time';
  else if (typeText.includes('contract')) job.jobType = 'contract';
  else if (typeText.includes('intern')) job.jobType = 'internship';
  else if (typeText.includes('remote')) job.jobType = 'remote';

  // Source URL
  const link = container.find('a').filter((i, a) => $(a).attr('href')).first().attr('href');
  if (link) job.sourceUrl = link.startsWith('http') ? link : new URL(link, 'https://undpjobs.net').href;

  // Posted date
  const posted = container.find('.posted, .date-posted, time[datetime]').first();
  if (posted.length) {
    const iso = posted.attr('datetime') || posted.text().trim();
    const date = new Date(iso);
    if (!isNaN(date)) job.postedDateIsoString = date.toISOString();
  }

  // Deadline
  const deadline = container.find('.deadline, .date-close, .closing').first();
  if (deadline.length) {
    const iso = deadline.attr('datetime') || deadline.text().trim();
    const date = new Date(iso);
    if (!isNaN(date)) job.deadlineIsoString = date.toISOString();
  }

  // Salary extraction (e.g., "$3,000 - $5,000 per month")
  const salaryText = container.find('.salary, .salary-range').first().text().replace(/[\n\r]/g, ' ').trim();
  if (salaryText) {
    const salaryMatch = salaryText.match(/([A-Z]{3}|[$£€])\s?([\d,]+)(?:\s?-\s?([A-Z]{3}|[$£€])?\s?([\d,]+))?/i);
    if (salaryMatch) {
      const currency = salaryMatch[1] || salaryMatch[3] || '';
      const min = salaryMatch[2] ? parseInt(salaryMatch[2].replace(/,/g, ''), 10) : null;
      const max = salaryMatch[4] ? parseInt(salaryMatch[4].replace(/,/g, ''), 10) : null;
      job.salaryCurrency = currency.replace('$', 'USD').replace('£', 'GBP').replace('€', 'EUR');
      if (!isNaN(min)) job.salaryMin = min;
      if (!isNaN(max)) job.salaryMax = max;
    }
  }

  result.push(job);
});