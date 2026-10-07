// Find potential job containers based on common patterns
const jobContainers = $(
  'article.post, .job, .vacancy, .job-listing, .vacancy-item, .td-module-container, .entry-content > ul > li, .entry-content > p'
).filter(function () {
  const el = $(this);
  // Must contain a plausible title element
  const title = el.find('h1, h2, h3, h4, strong, a').first().text().trim();
  // Exclude generic list items that are just plain text without a link or heading
  if (!title) return false;
  // Heuristic: title should have at least two words and not be a category like "Home" or "Contact"
  const words = title.split(/\s+/);
  if (words.length < 2) return false;
  const lower = title.toLowerCase();
  if (['home', 'about', 'contact', 'categories', 'archive', 'search'].includes(lower)) return false;
  return true;
});

jobContainers.each(function () {
  const container = $(this);

  // TITLE
  const titleEl = container.find('h1, h2, h3, h4, a, strong').first();
  const title = titleEl.text().trim();
  if (!title) return; // skip if no title

  // SOURCE URL (prefer link on the title)
  let sourceUrl = titleEl.attr('href') || null;
  if (sourceUrl && !sourceUrl.startsWith('http')) {
    // Resolve relative URLs against the page URL if possible (fallback to null)
    const base = $('base').attr('href') || '';
    sourceUrl = base ? new URL(sourceUrl, base).href : null;
  }

  // COMPANY NAME
  const companyName = container
    .find('.company, .company-name, .employer, .employer-name')
    .first()
    .text()
    .trim() || null;

  // LOCATION
  const location = container
    .find('.location, .job-location, .vacancy-location')
    .first()
    .text()
    .trim() || null;

  // JOB TYPE
  const typeText = container
    .find('.type, .job-type, .vacancy-type')
    .first()
    .text()
    .toLowerCase()
    .trim();
  let jobType = null;
  if (typeText) {
    if (/full\s*time/.test(typeText)) jobType = 'full_time';
    else if (/part\s*time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';
  }

  // POSTED DATE
  let postedDateIsoString = null;
  const postedTime = container.find('time[datetime]').first();
  if (postedTime.length) {
    postedDateIsoString = new Date(postedTime.attr('datetime')).toISOString();
  } else {
    const metaPublished = $('meta[property="article:published_time"]').attr('content');
    if (metaPublished) postedDateIsoString = new Date(metaPublished).toISOString();
  }

  // DEADLINE
  let deadlineIsoString = null;
  const deadlineText = container
    .find('.deadline, .application-deadline')
    .first()
    .text()
    .trim();
  if (deadlineText) {
    const match = deadlineText.match(/\b(\d{4}[\/-]\d{2}[\/-]\d{2})\b/);
    if (match) deadlineIsoString = new Date(match[1]).toISOString();
  }

  // SALARY
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  const salaryText = container
    .find('.salary, .compensation, .pay')
    .first()
    .text()
    .replace(/,/g, '')
    .trim()
    .toLowerCase();

  if (salaryText) {
    const currencyMatch = salaryText.match(/(usd|eur|gbp|ksh|tzs|sh|£|\$|€)/i);
    if (currencyMatch) salaryCurrency = currencyMatch[1].toUpperCase().replace('£', 'GBP').replace('€', 'EUR').replace('$', 'USD');
    const rangeMatch = salaryText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      salaryMin = parseFloat(rangeMatch[1]);
      salaryMax = parseFloat(rangeMatch[2]);
    } else {
      const singleMatch = salaryText.match(/(\d+(?:\.\d+)?)/);
      if (singleMatch) {
        salaryMin = salaryMax = parseFloat(singleMatch[1]);
      }
    }
  }

  // DESCRIPTION (collect paragraphs inside the container, excluding the title)
  const descriptionParts = [];
  container
    .find('p')
    .each(function () {
      const txt = $(this).text().trim();
      if (txt && txt !== title) descriptionParts.push(txt);
    });
  const description = descriptionParts.join('\n\n') || null;

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
    salaryCurrency,
  };

  // Remove keys that are still null to keep payload tidy
  Object.keys(job).forEach((k) => (job[k] == null) && delete job[k]);

  result.push(job);
});