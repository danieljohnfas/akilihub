const jobSelectors = [
  '.job-card',
  '.job-item',
  '.listing-item',
  '.card',
  '[data-job-id]',
  '.job',
  '.position',
  '.vacancy'
];

const jobs = $(jobSelectors.join(','));

jobs.each((_, el) => {
  const elem = $(el);

  const title = elem.find('h1, h2, h3, .title, .job-title, .position-title').first().text().trim();
  if (!title) return;

  const companyName = elem.find('.company, .company-name, .employer').first().text().trim() || null;
  const location = elem.find('.location, .job-location, .city').first().text().trim() || null;
  const description = elem.find('.description, .job-description, .details').first().text().trim() || null;
  const jobTypeRaw = elem.find('.type, .job-type').first().text().trim().toLowerCase() || '';
  const jobTypeMap = {
    fulltime: 'full_time',
    'full time': 'full_time',
    parttime: 'part_time',
    'part time': 'part_time',
    contract: 'contract',
    internship: 'internship',
    remote: 'remote'
  };
  const jobType = jobTypeMap[jobTypeRaw.replace(/\s+/g, '')] || null;

  const sourceUrl = elem.find('a').first().attr('href') ? new URL(elem.find('a').first().attr('href'), window.location.href).href : null;

  const postedDateIsoString = elem.find('time[datetime]').first().attr('datetime') || null;
  const deadlineIsoString = elem.find('.deadline time[datetime]').first().attr('datetime') || null;

  const salaryText = elem.find('.salary, .pay, .compensation').first().text().trim();
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  if (salaryText) {
    const match = salaryText.match(/([A-Z]{3})?\s?([\d,]+)(?:\s*-\s*([A-Z]{3})?\s?([\d,]+))?/i);
    if (match) {
      salaryCurrency = match[1] ? match[1].toUpperCase() : match[3] ? match[3].toUpperCase() : null;
      salaryMin = parseFloat(match[2].replace(/,/g, '')) || null;
      salaryMax = match[4] ? parseFloat(match[4].replace(/,/g, '')) : salaryMin;
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
    salaryCurrency
  });
});