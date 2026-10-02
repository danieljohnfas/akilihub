const baseUrl = 'https://tanzania.un.org';
const selectors = [
  '.view-content .views-row',
  '.job-listing',
  '.node-job',
  'article[data-node-type="job"]',
  '.views-row',
  'li.job-item',
  'div.job-card'
];
const jobContainers = $(selectors.join(','));

jobContainers.each((_, elem) => {
  const $elem = $(elem);

  // Title extraction
  let title = $elem.find('a').first().text().trim();
  if (!title) {
    title = $elem.find('h1, h2, h3, h4').first().text().trim();
  }
  if (!title) return; // skip non‑job entries

  // Source URL
  let href = $elem.find('a').first().attr('href') || '';
  const sourceUrl = href ? (href.startsWith('http') ? href : new URL(href, baseUrl).href) : null;

  // Location
  const location = $elem.find('.field-location, .location, .job-location, .field-field-location')
    .first()
    .text()
    .trim() || null;

  // Description (fallback to first paragraph if no dedicated field)
  const description = $elem.find('.field-body, .field-description, .description, p')
    .first()
    .text()
    .trim() || null;

  // Posted date
  const postedRaw = $elem.find('.field-posted, .posted, .date, .field-created')
    .first()
    .text()
    .trim();
  const postedDateIsoString = postedRaw ? new Date(postedRaw).toISOString() : null;

  // Deadline date
  const deadlineRaw = $elem.find('.field-deadline, .deadline, .closing-date, .field-field-deadline')
    .first()
    .text()
    .trim();
  const deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  // Salary extraction
  const salaryText = $elem.find('.field-salary, .salary, .field-field-salary')
    .first()
    .text()
    .trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const clean = salaryText.replace(/,/g, '');
    const match = clean.match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)(?:\s?[-–]\s?(\d+(?:\.\d+)?))?/);
    if (match) {
      salaryCurrency = match[1] || null;
      salaryMin = parseFloat(match[2]);
      salaryMax = match[3] ? parseFloat(match[3]) : salaryMin;
    }
  }

  // Job type mapping
  const typeRaw = $elem.find('.field-type, .type, .job-type, .field-field-type')
    .first()
    .text()
    .toLowerCase()
    .trim();
  let jobType = null;
  if (/full[-\s]?time/.test(typeRaw)) jobType = 'full_time';
  else if (/part[-\s]?time/.test(typeRaw)) jobType = 'part_time';
  else if (/contract/.test(typeRaw)) jobType = 'contract';
  else if (/intern/.test(typeRaw)) jobType = 'internship';
  else if (/remote/.test(typeRaw)) jobType = 'remote';

  // Company name – default to UN if not found
  const companyName = $elem.find('.field-company, .company, .field-field-company')
    .first()
    .text()
    .trim() || 'United Nations';

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
    salaryCurrency
  });
});