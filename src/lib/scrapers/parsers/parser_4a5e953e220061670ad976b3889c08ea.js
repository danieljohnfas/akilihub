const jobSelectors = [
  '.search-results .job',
  '.search-results .result',
  '.job-card',
  '.listing',
  '.jobItem',
  'tr.jobRow',
  'li.job'
];
const $jobs = $(jobSelectors.join(','));

$jobs.each(function () {
  const $job = $(this);

  // Title: common patterns
  let title = $job.find('h2 a, h3 a, .jobTitle a, .title a, a.job-link, a.title').first().text().trim();
  if (!title) {
    title = $job.find('h2, h3, .jobTitle, .title').first().text().trim();
  }
  if (!title) return; // skip if no clear title

  const companyName = $job.find('.company, .companyName, .employer, .org').first().text().trim() || null;
  const location = $job.find('.location, .job-location, .loc').first().text().trim() || null;
  const description = $job.find('.description, .jobDesc, .summary, .details').first().text().trim() || null;
  const jobTypeText = $job.find('.job-type, .type, .employmentType').first().text().trim().toLowerCase() || null;
  let jobType = null;
  if (jobTypeText) {
    if (/full\s*time/.test(jobTypeText)) jobType = 'full_time';
    else if (/part\s*time/.test(jobTypeText)) jobType = 'part_time';
    else if (/contract/.test(jobTypeText)) jobType = 'contract';
    else if (/internship/.test(jobTypeText)) jobType = 'internship';
    else if (/remote/.test(jobTypeText)) jobType = 'remote';
  }

  const sourceUrl = $job.find('a[href]').first().attr('href') || null;

  const postedDateStr = $job.find('.posted, .datePosted, .post-date').first().attr('datetime') ||
    $job.find('.posted, .datePosted, .post-date').first().text().trim() || null;
  const deadlineStr = $job.find('.deadline, .apply-by, .close-date').first().attr('datetime') ||
    $job.find('.deadline, .apply-by, .close-date').first().text().trim() || null;

  const parseIso = str => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const postedDateIsoString = parseIso(postedDateStr);
  const deadlineIsoString = parseIso(deadlineStr);

  // Salary extraction
  const salaryText = $job.find('.salary, .pay, .compensation').first().text().trim() || '';
  let salaryMin = null,
      salaryMax = null,
      salaryCurrency = null;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[\$£€¥]/);
    if (currencyMatch) salaryCurrency = currencyMatch[0];
    const numbers = salaryText.replace(/[^0-9\.-]+/g, ' ').trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
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