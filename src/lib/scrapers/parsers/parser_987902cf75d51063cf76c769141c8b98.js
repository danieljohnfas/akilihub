// Identify potential job containers using common patterns
const jobContainers = $(
  '.view-vacancies .views-row,' +
  '.vacancy-item,' +
  '.node--type-vacancy,' +
  'article.job,' +
  '.job-listing,' +
  'li.job,' +
  'div.job-card'
);

jobContainers.each((_, elem) => {
  const container = $(elem);

  // Title (must exist to consider this a job)
  const titleEl = container.find('h1, h2, h3, .field--name-title a, a.title, a.job-title')
    .first();
  const title = titleEl.text().trim();
  if (!title) return; // skip non‑job entries

  // Source URL
  const sourceUrl = titleEl.attr('href')
    ? new URL(titleEl.attr('href'), (typeof baseUrl !== 'undefined' ? baseUrl : '')).href
    : undefined;

  // Company name (fallback to site name if not specific)
  const companyName = container.find('.field--name-field-company, .company, .employer')
    .first()
    .text()
    .trim() || $('title').text().replace('Vacancies', '').trim();

  // Description
  const description = container.find('.field--name-body, .description, p')
    .first()
    .text()
    .trim();

  // Location
  const location = container.find('.field--name-field-location, .location')
    .first()
    .text()
    .trim();

  // Job type
  const rawType = container.find('.field--name-field-job-type, .job-type')
    .first()
    .text()
    .trim()
    .toLowerCase();
  let jobType;
  if (/full[-\s]?time/.test(rawType)) jobType = 'full_time';
  else if (/part[-\s]?time/.test(rawType)) jobType = 'part_time';
  else if (/contract/.test(rawType)) jobType = 'contract';
  else if (/internship/.test(rawType)) jobType = 'internship';
  else if (/remote/.test(rawType)) jobType = 'remote';

  // Posted date
  const postedRaw = container.find('.field--name-field-posted-date, .posted-date')
    .first()
    .text()
    .trim();
  const postedDateIsoString = postedRaw ? new Date(postedRaw).toISOString() : undefined;

  // Deadline
  const deadlineRaw = container.find('.field--name-field-application-deadline, .deadline')
    .first()
    .text()
    .trim();
  const deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : undefined;

  // Salary
  const salaryText = container.find('.field--name-field-salary, .salary')
    .first()
    .text()
    .trim();
  let salaryMin, salaryMax, salaryCurrency;
  if (salaryText) {
    // Example patterns: "$1,200 - $1,500 per month", "USD 5000 – 7000", "£30k"
    const currencyMatch = salaryText.match(/^[^\d]+/);
    salaryCurrency = currencyMatch ? currencyMatch[0].trim() : undefined;

    const numbers = salaryText.replace(/[^\d\-.]/g, ' ').trim().split(/\s+/);
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
    if (nums.length === 1) {
      salaryMin = salaryMax = nums[0];
    } else if (nums.length >= 2) {
      salaryMin = Math.min(...nums);
      salaryMax = Math.max(...nums);
    }
  }

  const job = {
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
    salaryCurrency
  };

  // Remove undefined keys
  Object.keys(job).forEach(k => job[k] === undefined && delete job[k]);

  result.push(job);
});