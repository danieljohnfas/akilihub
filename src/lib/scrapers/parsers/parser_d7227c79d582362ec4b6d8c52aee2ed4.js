const jobSelectors = [
  '.job',
  '.job-item',
  '.listing-item',
  '.post',
  'article',
  '.entry',
  '[data-job]',
  '[class*="job"]',
  '[id*="job"]'
];
let containers = $(jobSelectors.join(',')).filter(function () {
  const titleEl = $(this).find('h1, h2, h3, .job-title, .entry-title, .title').first();
  const titleText = titleEl.text().trim();
  return titleText.length > 0;
});
containers.each(function () {
  const $job = $(this);
  const title = $job.find('h1, h2, h3, .job-title, .entry-title, .title').first().text().trim() || null;
  if (!title) return;
  const companyName = $job.find('.company, .company-name, .employer').first().text().trim() || null;
  const description = $job.find('.description, .job-description, .entry-content, p').first().text().trim() || null;
  const location = $job.find('.location, .job-location, .address').first().text().trim() || null;
  const typeText = $job.find('.job-type, .employment-type').first().text().trim().toLowerCase() || '';
  let jobType = null;
  if (/full\s*time/.test(typeText)) jobType = 'full_time';
  else if (/part\s*time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';
  const sourceUrl = $job.find('a').first().attr('href') || null;
  const postedDateStr = $job.find('time[datetime]').first().attr('datetime') || null;
  const postedDateIsoString = postedDateStr ? new Date(postedDateStr).toISOString() : null;
  const deadlineStr = $job.find('.deadline time, time.deadline').first().attr('datetime') || null;
  const deadlineIsoString = deadlineStr ? new Date(deadlineStr).toISOString() : null;
  const salaryText = $job.find('.salary, .compensation').first().text().trim();
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[$£€¥]/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : null;
    const numbers = salaryText.replace(/[^0-9.-]+/g, ' ').trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
    if (numbers.length === 1) {
      salaryMin = salaryMax = numbers[0];
    } else if (numbers.length >= 2) {
      salaryMin = numbers[0];
      salaryMax = numbers[1];
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