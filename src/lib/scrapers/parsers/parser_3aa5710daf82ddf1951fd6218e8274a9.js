// Identify possible job containers using common selectors
const jobContainers = $(
  '[data-job-id], .job-card, .job-item, .listing-item, .vacancy, .job, article.job, .career-item, .position-card'
).filter(function () {
  // Ensure the element contains a title element
  const hasTitle = $(this).find('h1, h2, h3, h4, a.title, a.job-title, .job-title, .title').first().text().trim().length > 0;
  return hasTitle;
});

jobContainers.each(function () {
  const container = $(this);

  // Title extraction
  let title = container.find('h1, h2, h3, h4, a.title, a.job-title, .job-title, .title')
    .first()
    .text()
    .trim();

  if (!title) return; // skip if no title

  // Source URL (first link that wraps the title)
  let sourceUrl = container.find('a.title, a.job-title, a')
    .filter(function () {
      return $(this).text().trim() === title;
    })
    .attr('href') || null;
  if (sourceUrl && !sourceUrl.startsWith('http')) {
    // Resolve relative URLs using base meta if present
    const base = $('meta[name="app-base"]').attr('content') || '';
    sourceUrl = new URL(sourceUrl, base).href;
  }

  // Company name
  const companyName = container.find('.company, .company-name, .employer, .org')
    .first()
    .text()
    .trim() || null;

  // Location
  const location = container.find('.location, .job-location, .city, .place')
    .first()
    .text()
    .trim() || null;

  // Description / summary
  const description = container.find('.description, .job-description, .summary, p')
    .first()
    .text()
    .trim() || null;

  // Job type detection
  const typeText = container.find('.type, .job-type, .employment-type')
    .first()
    .text()
    .toLowerCase()
    .trim();
  let jobType = null;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';

  // Posted date
  let postedDateIsoString = null;
  const postedText = container.find('.posted, .date-posted, time')
    .first()
    .attr('datetime') || container.find('.posted, .date-posted, time').first().text();
  if (postedText) {
    const parsed = new Date(postedText);
    if (!isNaN(parsed)) postedDateIsoString = parsed.toISOString();
  }

  // Deadline
  let deadlineIsoString = null;
  const deadlineText = container.find('.deadline, .apply-by, .closing-date')
    .first()
    .attr('datetime') || container.find('.deadline, .apply-by, .closing-date').first().text();
  if (deadlineText) {
    const parsed = new Date(deadlineText);
    if (!isNaN(parsed)) deadlineIsoString = parsed.toISOString();
  }

  // Salary parsing
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  const salaryText = container.find('.salary, .compensation, .pay')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  if (salaryText) {
    const salaryRegex = /([\d.,]+)\s*-\s*([\d.,]+)\s*([A-Za-z]{3,})/;
    const match = salaryText.match(salaryRegex);
    if (match) {
      salaryMin = parseFloat(match[1].replace(/[,]/g, ''));
      salaryMax = parseFloat(match[2].replace(/[,]/g, ''));
      salaryCurrency = match[3].toUpperCase();
    } else {
      // Single value case
      const singleRegex = /([\d.,]+)\s*([A-Za-z]{3,})/;
      const singleMatch = salaryText.match(singleRegex);
      if (singleMatch) {
        salaryMin = salaryMax = parseFloat(singleMatch[1].replace(/[,]/g, ''));
        salaryCurrency = singleMatch[2].toUpperCase();
      }
    }
  }

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

  result.push(job);
});