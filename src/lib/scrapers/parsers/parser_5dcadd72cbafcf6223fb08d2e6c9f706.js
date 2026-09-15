// Helper to parse ISO date from text
function parseDate(text) {
  if (!text) return null;
  const d = new Date(text.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Helper to parse salary range and currency
function parseSalary(text) {
  if (!text) return {};
  const cleaned = text.replace(/[,]/g, '').replace(/[\s]+/g, ' ');
  const match = cleaned.match(/([A-Za-z$£€¥]+)?\s*([\d]+(?:\.\d+)?)(?:\s*[-–]\s*([A-Za-z$£€¥]+)?\s*([\d]+(?:\.\d+)?))?/);
  if (!match) return {};
  const currency = match[1] || match[3] || null;
  const min = match[2] ? Number(match[2]) : null;
  const max = match[4] ? Number(match[4]) : null;
  return { salaryCurrency: currency, salaryMin: min, salaryMax: max };
}

// Determine possible job containers
const possibleContainers = $('*[class*="job"],*[class*="vacancy"],*[class*="position"],*[class*="listing"],*[id*="job"],*[id*="vacancy"]');

// Filter to those that actually contain a title
const jobElements = possibleContainers.filter(function () {
  const title = $(this).find('h1, h2, h3, h4, .title, .job-title, a').first().text().trim();
  return title.length > 0;
});

jobElements.each(function () {
  const el = $(this);

  // Title
  let title = el.find('h1, h2, h3, h4, .title, .job-title, a').first().text().trim();
  if (!title) return;

  // Company
  const companyName = el.find('.company, .company-name, .employer, .org-name').first().text().trim() || null;

  // Description
  const description = el.find('.description, .job-description, p').first().text().trim() || null;

  // Location
  const location = el.find('.location, .job-location, .address').first().text().trim() || null;

  // Job type
  const typeText = el.find('.type, .job-type, .employment-type').first().text().toLowerCase();
  let jobType = null;
  if (/full\s*time/.test(typeText)) jobType = 'full_time';
  else if (/part\s*time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/intern/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';

  // Source URL
  let sourceUrl = el.find('a').first().attr('href') || null;
  if (sourceUrl && !sourceUrl.startsWith('http')) {
    const base = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
    sourceUrl = base + (sourceUrl.startsWith('/') ? '' : '/') + sourceUrl;
  }

  // Posted date
  const postedRaw = el.find('.posted, .date-posted, time').first().attr('datetime') || el.find('.posted, .date-posted, time').first().text();
  const postedDateIsoString = parseDate(postedRaw);

  // Deadline
  const deadlineRaw = el.find('.deadline, .date-deadline, .apply-by').first().attr('datetime') || el.find('.deadline, .date-deadline, .apply-by').first().text();
  const deadlineIsoString = parseDate(deadlineRaw);

  // Salary
  const salaryRaw = el.find('.salary, .compensation, .pay').first().text();
  const { salaryMin, salaryMax, salaryCurrency } = parseSalary(salaryRaw);

  // Build job object
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

  // Remove undefined/null keys
  Object.keys(job).forEach(k => (job[k] == null) && delete job[k]);

  result.push(job);
});