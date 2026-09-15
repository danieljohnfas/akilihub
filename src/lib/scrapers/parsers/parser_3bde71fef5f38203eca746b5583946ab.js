// Select possible job containers using common patterns
const containers = $(
  'article[data-job-id], div.job-card, li.job-item, .job-listing, .job-card, .listing-item, .job, .job-post'
);

// Helper to extract numeric salary values
function parseSalary(text) {
  const match = text.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const currency = match[1] ? match[1].toUpperCase() : null;
  const amount = parseFloat(match[2]);
  return { amount, currency };
}

// Helper to normalize job type strings
function normalizeJobType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('full')) return 'full_time';
  if (lower.includes('part')) return 'part_time';
  if (lower.includes('contract')) return 'contract';
  if (lower.includes('intern')) return 'internship';
  if (lower.includes('remote')) return 'remote';
  return null;
}

// Iterate over each possible job container
containers.each((_, el) => {
  const container = $(el);

  // Attempt to find a title element
  const titleEl = container.find('h1, h2, h3, .job-title, .title, a[href*="/jobs/"], a[data-job-id]').first();
  const title = titleEl.text().trim();
  if (!title) return; // skip non‑job entries

  const job = { title };

  // Source URL – prefer the link wrapping the title
  const href = titleEl.attr('href');
  if (href) {
    job.sourceUrl = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
  }

  // Company name
  const company = container.find('.company, .company-name, .employer, .brand, .org-name')
    .first()
    .text()
    .trim();
  if (company) job.companyName = company;

  // Location
  const location = container.find('.location, .job-location, .city, .place')
    .first()
    .text()
    .trim();
  if (location) job.location = location;

  // Description – gather visible paragraph text within the container
  const desc = container.find('p, .description, .job-description')
    .map((i, p) => $(p).text().trim())
    .get()
    .filter(t => t)
    .join('\n');
  if (desc) job.description = desc;

  // Job type
  const typeText = container.find('.type, .job-type, .employment-type')
    .first()
    .text()
    .trim();
  const normalizedType = normalizeJobType(typeText);
  if (normalizedType) job.jobType = normalizedType;

  // Posted date – look for time or datetime attributes
  const timeEl = container.find('time[datetime], .date-posted, .posted')
    .first();
  const datetime = timeEl.attr('datetime') || timeEl.text().trim();
  if (datetime) {
    const date = new Date(datetime);
    if (!isNaN(date)) job.postedDateIsoString = date.toISOString();
  }

  // Application deadline
  const deadlineEl = container.find('.deadline, .apply-by, time[datetime][class*="deadline"]')
    .first();
  const deadlineDt = deadlineEl.attr('datetime') || deadlineEl.text().trim();
  if (deadlineDt) {
    const d = new Date(deadlineDt);
    if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
  }

  // Salary – try to find a salary string
  const salaryText = container.find('.salary, .compensation, .pay')
    .first()
    .text()
    .trim();
  if (salaryText) {
    // Look for a range like "$50k - $70k"
    const rangeMatch = salaryText.match(/([A-Z]{3})?\s?\$?([\d,.]+)[kK]?\s*[-–]\s*([A-Z]{3})?\s?\$?([\d,.]+)[kK]?/);
    if (rangeMatch) {
      const cur1 = rangeMatch[1] || rangeMatch[3] || null;
      const cur2 = rangeMatch[3] || cur1;
      const min = parseFloat(rangeMatch[2].replace(/,/g, '')) * (salaryText.includes('k') ? 1000 : 1);
      const max = parseFloat(rangeMatch[4].replace(/,/g, '')) * (salaryText.includes('k') ? 1000 : 1);
      job.salaryMin = min;
      job.salaryMax = max;
      if (cur1) job.salaryCurrency = cur1.toUpperCase();
    } else {
      const single = parseSalary(salaryText);
      if (single) {
        job.salaryMin = single.amount;
        if (single.currency) job.salaryCurrency = single.currency;
      }
    }
  }

  result.push(job);
});