const jobSelectors = [
  '.job-card',
  '.job-item',
  '.vacancy',
  '.listing-item',
  'article.job',
  '.job-listing',
  '.career-item',
  '.position',
  '.job-post',
  '.listing .item'
];
const jobContainers = $(jobSelectors.join(','));

jobContainers.each((_, el) => {
  const container = $(el);
  const title = container.find('h1, h2, h3, .job-title, .title, .position-title').first().text().trim();
  if (!title) return;

  const companyName = container.find('.company-name, .employer, .company, .org-name').first().text().trim() || null;
  const description = container.find('.job-description, .description, .desc').first().html()?.trim() || null;
  const location = container.find('.location, .job-location, .place').first().text().trim() || null;

  const typeText = container.find('.job-type, .type, .employment-type').first().text().toLowerCase();
  let jobType = null;
  if (/full[-\s]?time/.test(typeText)) jobType = 'full_time';
  else if (/part[-\s]?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship|intern/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';

  const sourceUrl = container.find('a.apply-link, a[href*="apply"], a[href]').first().attr('href') || null;

  const postedText = container.find('.posted-date, .date-posted, time[datetime]').first().text().trim();
  let postedDateIsoString = null;
  if (postedText) {
    const parsed = new Date(postedText);
    if (!isNaN(parsed)) postedDateIsoString = parsed.toISOString();
  }

  const deadlineText = container.find('.deadline, .apply-by, .date-deadline').first().text().trim();
  let deadlineIsoString = null;
  if (deadlineText) {
    const parsed = new Date(deadlineText);
    if (!isNaN(parsed)) deadlineIsoString = parsed.toISOString();
  }

  const salaryText = container.find('.salary, .pay, .compensation').first().text();
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[\$€£¥]|[A-Z]{3}/);
    if (currencyMatch) salaryCurrency = currencyMatch[0];
    const numbers = salaryText.replace(/[^0-9.-]+/g, ' ').trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
    if (numbers.length === 1) {
      salaryMin = salaryMax = numbers[0];
    } else if (numbers.length >= 2) {
      salaryMin = Math.min(...numbers);
      salaryMax = Math.max(...numbers);
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