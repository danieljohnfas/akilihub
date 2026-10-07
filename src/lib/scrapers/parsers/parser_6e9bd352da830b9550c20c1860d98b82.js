const selectors = [
  '.job',
  '.job-listing',
  '.posting',
  '.post',
  '.entry',
  'article',
  'li'
];

const jobContainers = $(selectors.join(','));

jobContainers.each(function () {
  const el = $(this);

  // Attempt to locate a clear job title
  let title = el.find('h1, h2, h3').first().text().trim();
  if (!title) {
    title = el.find('a').first().text().trim();
  }
  if (!title) return; // Not a job posting

  const job = { title };

  // Company name
  const company = el.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;

  // Description
  const description = el.find('.description, .summary, p').first().text().trim();
  if (description) job.description = description;

  // Location
  const location = el.find('.location, .job-location, .address').first().text().trim();
  if (location) job.location = location;

  // Job type
  const typeRaw = el.find('.job-type, .type, .employment-type').first().text().trim().toLowerCase();
  if (typeRaw) {
    const map = {
      fulltime: 'full_time',
      full_time: 'full_time',
      parttime: 'part_time',
      part_time: 'part_time',
      contract: 'contract',
      internship: 'internship',
      remote: 'remote'
    };
    job.jobType = map[typeRaw] || typeRaw;
  }

  // Source URL
  const sourceUrl = el.find('a[href]').first().attr('href');
  if (sourceUrl) job.sourceUrl = sourceUrl;

  // Posted date
  const posted = el.find('time[datetime]').first().attr('datetime');
  if (posted) job.postedDateIsoString = posted;

  // Deadline
  const deadline = el.find('.deadline time[datetime], time.deadline[datetime]').first().attr('datetime');
  if (deadline) job.deadlineIsoString = deadline;

  // Salary parsing
  const salaryText = el.find('.salary, .pay, .compensation').first().text();
  if (salaryText) {
    const cleaned = salaryText.replace(/[,]/g, '');
    const salaryMatch = cleaned.match(/([A-Z]{3})?\s*([\d]+)\s*[-–]\s*([A-Z]{3})?\s*([\d]+)/i);
    if (salaryMatch) {
      const cur1 = salaryMatch[1] || salaryMatch[3] || '';
      const cur2 = salaryMatch[3] || salaryMatch[1] || '';
      const min = Number(salaryMatch[2]);
      const max = Number(salaryMatch[4]);
      job.salaryCurrency = cur1 || cur2;
      if (!isNaN(min)) job.salaryMin = min;
      if (!isNaN(max)) job.salaryMax = max;
    }
  }

  result.push(job);
});