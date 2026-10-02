const jobContainers = $(
  '.job-listing,.job-item,.vacancy-item,.career-item,.post,.listing-item,.view-job,' +
  'article.post,.card,.card-body,.job,.vacancy,.career,.listing'
).toArray();

jobContainers.forEach((elem) => {
  const container = $(elem);

  // Title (must exist)
  let title = container
    .find('h1, h2, h3, .title, a.title, a.job-title')
    .first()
    .text()
    .trim();
  if (!title) {
    title = container.find('a').first().text().trim();
  }
  if (!title) return; // not a job posting

  const companyName = container
    .find('.company, .company-name, .employer')
    .first()
    .text()
    .trim();

  const description = container
    .find('.description, .job-description, p')
    .first()
    .text()
    .trim();

  const location = container
    .find('.location, .job-location')
    .first()
    .text()
    .trim();

  const jobTypeRaw = container
    .find('.job-type, .type')
    .first()
    .text()
    .trim()
    .toLowerCase();

  const jobTypeMap = {
    fulltime: 'full_time',
    'full_time': 'full_time',
    'full time': 'full_time',
    parttime: 'part_time',
    'part_time': 'part_time',
    'part time': 'part_time',
    contract: 'contract',
    internship: 'internship',
    intern: 'internship',
    remote: 'remote',
  };
  const normalizedType = jobTypeRaw.replace(/\s+/g, '');
  const jobType = jobTypeMap[normalizedType] || null;

  const sourceUrl = container.find('a').first().attr('href') || null;

  const parseDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d) ? null : d.toISOString();
  };

  const postedDateIsoString = parseDate(
    container.find('time[datetime]').first().attr('datetime') ||
      container.find('.posted, .date-posted').first().text()
  );

  const deadlineIsoString = parseDate(
    container.find('time[datetime]').first().attr('datetime') ||
      container.find('.deadline, .date-deadline').first().text()
  );

  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  const salaryText = container
    .find('.salary, .pay, .compensation')
    .first()
    .text()
    .trim();

  if (salaryText) {
    const match = salaryText.match(
      /([A-Z]{3})?\s*([\d,]+)(?:\s*[-–]\s*([A-Z]{3})?\s*([\d,]+))?/i
    );
    if (match) {
      salaryCurrency = (match[1] || match[3] || null);
      salaryMin = match[2] ? parseInt(match[2].replace(/,/g, ''), 10) : null;
      salaryMax = match[4] ? parseInt(match[4].replace(/,/g, ''), 10) : null;
    }
  }

  result.push({
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency,
  });
});