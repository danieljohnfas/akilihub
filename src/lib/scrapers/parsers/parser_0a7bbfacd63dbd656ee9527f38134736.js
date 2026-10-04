// Define possible job container selectors
const selectors = [
  '.job-card',
  '.job-item',
  '.vacancy',
  '.listing',
  '.search-result',
  '.col-span-12 .bg-white',
  'article',
  'li'
];

// Helper to normalize job type
function mapJobType(text) {
  const t = text.toLowerCase();
  if (t.includes('full') && t.includes('time')) return 'full_time';
  if (t.includes('part') && t.includes('time')) return 'part_time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('intern')) return 'internship';
  if (t.includes('remote')) return 'remote';
  return undefined;
}

// Helper to parse ISO date from raw text
function parseIsoDate(str) {
  const d = Date.parse(str);
  return isNaN(d) ? undefined : new Date(d).toISOString();
}

// Helper to extract salary numbers and currency
function parseSalary(text) {
  const currencyMatch = text.match(/[\p{Sc}¥£€$]/u);
  const numbers = text.match(/[\d,.]+/g);
  if (!numbers) return {};
  const clean = (n) => parseFloat(n.replace(/,/g, ''));
  const salary = {
    salaryCurrency: currencyMatch ? currencyMatch[0] : undefined
  };
  if (numbers.length === 1) {
    salary.salaryMin = salary.salaryMax = clean(numbers[0]);
  } else if (numbers.length >= 2) {
    salary.salaryMin = clean(numbers[0]);
    salary.salaryMax = clean(numbers[1]);
  }
  return salary;
}

// Use a Set to avoid processing the same element twice
const processed = new Set();

selectors.forEach((sel) => {
  $(sel).each((_, elem) => {
    const el = $(elem);
    const uid = el.attr('data-job-id') || el.html(); // fallback unique key
    if (processed.has(uid)) return;
    processed.add(uid);

    // Title extraction
    let title = el.find('h1, h2, h3, .job-title, .title, a').first().text().trim();
    if (!title) return; // not a job posting

    // Source URL
    const linkEl = el.find('a[href]').filter((_, a) => $(a).text().trim().length).first();
    const sourceUrl = linkEl.attr('href') ? new URL(linkEl.attr('href'), 'https://www.ajiramarket.co.tz').href : undefined;

    // Company name
    const companyName = el.find('.company, .company-name, .employer, .org').first().text().trim() || undefined;

    // Description (take first paragraph or .description)
    const description = el.find('.description, .job-description, p').first().text().trim() || undefined;

    // Location
    const location = el.find('.location, .job-location, .place').first().text().trim() || undefined;

    // Job type
    const typeText = el.find('.job-type, .type, .employment-type').first().text();
    const jobType = mapJobType(typeText) || undefined;

    // Posted date
    const postedRaw = el.find('.posted, .date-posted, time').first().text();
    const postedDateIsoString = parseIsoDate(postedRaw) || undefined;

    // Deadline
    const deadlineRaw = el.find('.deadline, .apply-by, .closing-date').first().text();
    const deadlineIsoString = parseIsoDate(deadlineRaw) || undefined;

    // Salary
    const salaryRaw = el.find('.salary, .pay, .compensation').first().text();
    const { salaryMin, salaryMax, salaryCurrency } = parseSalary(salaryRaw);

    // Build job object
    const job = { title };
    if (companyName) job.companyName = companyName;
    if (description) job.description = description;
    if (location) job.location = location;
    if (jobType) job.jobType = jobType;
    if (sourceUrl) job.sourceUrl = sourceUrl;
    if (postedDateIsoString) job.postedDateIsoString = postedDateIsoString;
    if (deadlineIsoString) job.deadlineIsoString = deadlineIsoString;
    if (salaryMin !== undefined) job.salaryMin = salaryMin;
    if (salaryMax !== undefined) job.salaryMax = salaryMax;
    if (salaryCurrency) job.salaryCurrency = salaryCurrency;

    result.push(job);
  });
});