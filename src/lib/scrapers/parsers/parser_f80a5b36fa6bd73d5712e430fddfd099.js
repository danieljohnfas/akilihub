// Define possible selectors for job containers
const jobSelectors = [
  '[data-job]',
  '.job',
  '.job-card',
  '.job-item',
  '.listing',
  'article[data-testid="job"]',
  'li[data-testid="job"]',
  'section.job',
  'div[data-role="job"]'
];

// Helper to clean text
const clean = (str) => (str ? str.trim().replace(/\s+/g, ' ') : '');

// Helper to parse ISO date from common formats
function parseISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Helper to extract salary numbers and currency
function parseSalary(text) {
  if (!text) return {};
  const currencyMatch = text.match(/[\$€£¥]/);
  const currency = currencyMatch ? currencyMatch[0] : null;
  const numbers = text.match(/[\d,.]+/g);
  if (!numbers) return { salaryCurrency: currency };
  const vals = numbers.map(n => parseFloat(n.replace(/[,]/g, '')));
  const salaryMin = Math.min(...vals);
  const salaryMax = Math.max(...vals);
  return {
    salaryMin: isFinite(salaryMin) ? salaryMin : undefined,
    salaryMax: isFinite(salaryMax) ? salaryMax : undefined,
    salaryCurrency: currency
  };
}

// Iterate over each possible container selector
jobSelectors.forEach(sel => {
  $(sel).each((_, elem) => {
    const $elem = $(elem);

    // Attempt to find title
    let title = clean($elem.find('h1, h2, h3, .title, .job-title, a[href*="/jobs/"]').first().text());
    if (!title) {
      // fallback: look for anchor text if link points to a job detail page
      const $link = $elem.find('a[href*="/jobs/"]').first();
      title = clean($link.text()) || '';
    }
    if (!title) return; // not a job

    // Company name
    const companyName = clean($elem.find('.company, .company-name, .employer').first().text());

    // Description (short)
    const description = clean($elem.find('.description, .job-description, .summary, p').first().text());

    // Location
    const location = clean($elem.find('.location, .job-location, .city').first().text());

    // Job type mapping
    const typeText = clean($elem.find('.type, .job-type, .employment-type').first().text()).toLowerCase();
    let jobType = null;
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    // Source URL
    let sourceUrl = $elem.find('a[href*="/jobs/"]').attr('href') || '';
    if (sourceUrl && !sourceUrl.startsWith('http')) {
      // make absolute assuming same origin
      const base = $('base').attr('href') || '';
      sourceUrl = base.replace(/\/+$/, '') + '/' + sourceUrl.replace(/^\/+/, '');
    }

    // Posted date
    const postedRaw = clean($elem.find('time[datetime], .posted-date, .date-posted').attr('datetime') ||
                         $elem.find('.posted-date, .date-posted').first().text());
    const postedDateIsoString = parseISO(postedRaw);

    // Deadline date
    const deadlineRaw = clean($elem.find('time[datetime][class*="deadline"], .deadline, .apply-by').attr('datetime') ||
                           $elem.find('.deadline, .apply-by').first().text());
    const deadlineIsoString = parseISO(deadlineRaw);

    // Salary
    const salaryText = clean($elem.find('.salary, .compensation, .pay').first().text());
    const { salaryMin, salaryMax, salaryCurrency } = parseSalary(salaryText);

    // Build job object
    const job = {
      title,
      companyName: companyName || undefined,
      description: description || undefined,
      location: location || undefined,
      jobType: jobType || undefined,
      sourceUrl: sourceUrl || undefined,
      postedDateIsoString: postedDateIsoString || undefined,
      deadlineIsoString: deadlineIsoString || undefined,
      salaryMin: salaryMin !== undefined ? salaryMin : undefined,
      salaryMax: salaryMax !== undefined ? salaryMax : undefined,
      salaryCurrency: salaryCurrency || undefined
    };

    result.push(job);
  });
});