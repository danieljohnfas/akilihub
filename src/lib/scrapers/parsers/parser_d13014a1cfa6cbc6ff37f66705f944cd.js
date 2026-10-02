// Identify potential job containers by common selectors and presence of a title element
const containers = $(
  'article, .job, .job-card, .vacancy, .career-item, .listing-item, .position, .job-listing'
).filter((i, el) => {
  const $el = $(el);
  // Must have a visible title element (h1‑h3 or element with class containing "title")
  return $el.find('h1, h2, h3, .title, .job-title, .position-title').filter((i, t) => {
    const txt = $(t).text().trim();
    return txt.length > 0;
  }).length > 0;
});

containers.each((i, container) => {
  const $c = $(container);

  // TITLE
  let title = $c.find('h1, h2, h3, .title, .job-title, .position-title')
    .first()
    .text()
    .trim();

  if (!title) return; // skip if no clear title

  // COMPANY NAME (common patterns)
  let companyName = $c.find('.company, .company-name, .employer, .org')
    .first()
    .text()
    .trim();

  // LOCATION
  let location = $c.find('.location, .job-location, .city')
    .first()
    .text()
    .trim();

  // JOB TYPE (full_time, part_time, contract, internship, remote)
  let jobTypeRaw = $c.find('.type, .job-type, .employment-type')
    .first()
    .text()
    .toLowerCase()
    .trim();
  let jobTypeMap = {
    'full time': 'full_time',
    'full-time': 'full_time',
    'part time': 'part_time',
    'part-time': 'part_time',
    'contract': 'contract',
    'internship': 'internship',
    'intern': 'internship',
    'remote': 'remote'
  };
  let jobType = jobTypeMap[jobTypeRaw] || null;

  // SOURCE URL (first link that looks like a job detail page)
  let sourceUrl = null;
  const possibleLinks = $c.find('a[href]').filter((i, a) => {
    const href = $(a).attr('href');
    return href && (/\/job(s?)\//i.test(href) || /\/career\//i.test(href));
  });
  if (possibleLinks.length) {
    sourceUrl = possibleLinks.first().attr('href');
    // make absolute if needed
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl) && typeof window !== 'undefined' && window.location) {
      const base = window.location.origin;
      sourceUrl = new URL(sourceUrl, base).href;
    }
  }

  // DESCRIPTION (aggregate paragraph/text content)
  let description = $c.find('.description, .job-description, .desc')
    .first()
    .text()
    .trim();
  if (!description) {
    // fallback to all paragraph text inside container
    description = $c.find('p')
      .map((i, p) => $(p).text().trim())
      .get()
      .filter(txt => txt.length)
      .join('\n');
  }

  // POSTED DATE
  let postedDateIsoString = null;
  const postedText = $c.find('.posted, .date-posted, time')
    .first()
    .text()
    .trim();
  if (postedText) {
    const parsed = Date.parse(postedText);
    if (!isNaN(parsed)) postedDateIsoString = new Date(parsed).toISOString();
  }

  // DEADLINE DATE
  let deadlineIsoString = null;
  const deadlineText = $c.find('.deadline, .apply-by, .closing-date')
    .first()
    .text()
    .trim();
  if (deadlineText) {
    const parsed = Date.parse(deadlineText);
    if (!isNaN(parsed)) deadlineIsoString = new Date(parsed).toISOString();
  }

  // SALARY (extract min, max, currency)
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  const salaryText = $c.find('.salary, .pay, .compensation')
    .first()
    .text()
    .trim()
    .replace(/[\s,]+/g, '');
  if (salaryText) {
    const currencyMatch = salaryText.match(/^([£$€¥])/);
    if (currencyMatch) salaryCurrency = currencyMatch[1];
    const rangeMatch = salaryText.match(/(\d+(?:\.\d+)?)[kK]?[-–to]{1,3}(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      salaryMin = parseFloat(rangeMatch[1]) * (/[kK]/.test(rangeMatch[1]) ? 1000 : 1);
      salaryMax = parseFloat(rangeMatch[2]) * (/[kK]/.test(rangeMatch[2]) ? 1000 : 1);
    } else {
      const singleMatch = salaryText.match(/(\d+(?:\.\d+)?)[kK]?/);
      if (singleMatch) {
        const val = parseFloat(singleMatch[1]) * (/[kK]/.test(singleMatch[1]) ? 1000 : 1);
        salaryMin = salaryMax = val;
      }
    }
  }

  // Build job object
  const job = {
    title,
    companyName: companyName || null,
    description: description || null,
    location: location || null,
    jobType,
    sourceUrl: sourceUrl || null,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency
  };

  result.push(job);
});