// Assume html, $, and result are already defined in the VM

function cleanText(str) {
  return str ? str.trim().replace(/\s+/g, ' ') : '';
}

function parseIsoDate(str) {
  if (!str) return null;
  const cleaned = str.replace(/Posted\s*/i, '').replace(/ago/i, '').trim();
  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function extractSalary(text) {
  if (!text) return {};
  const match = text.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+)(?:\s?-\s?([A-Z]{3})?\s?(\d+))?/i);
  if (!match) return {};
  const currency = match[1] || match[3] || null;
  const min = match[2] ? Number(match[2]) : null;
  const max = match[4] ? Number(match[4]) : null;
  return { salaryCurrency: currency, salaryMin: min, salaryMax: max };
}

// Identify possible job containers
const jobContainers = $(
  'article[data-job-id], .job-card, .job-listing, .listing-item, li.job, div[data-job-id], .job-item'
).filter(function () {
  // Must contain a recognizable title element
  return $(this).find('h1, h2, h3, .job-title, a[href*="/job/"]').length > 0;
});

jobContainers.each(function () {
  const $card = $(this);

  // Title
  const titleEl = $card.find('h1, h2, h3, .job-title, a[href*="/job/"]').first();
  const title = cleanText(titleEl.text());
  if (!title) return; // skip if no clear title

  // Source URL
  const linkEl = $card.find('a[href*="/job/"]').first();
  const sourceUrl = linkEl.attr('href')
    ? linkEl.attr('href').startsWith('http')
      ? linkEl.attr('href')
      : new URL(linkEl.attr('href'), (typeof window !== 'undefined' && window.location) ? window.location.origin : '').href
    : null;

  // Company / Institution
  const company = cleanText(
    $card.find('.company, .employer, .institution, .company-name').first().text()
  );

  // Location
  const location = cleanText(
    $card.find('.location, .job-location, .place, .city').first().text()
  );

  // Description (may be a short excerpt)
  const description = cleanText(
    $card.find('.description, .job-description, .summary, p').first().text()
  );

  // Job type detection
  const typeText = cleanText(
    $card.find('.job-type, .type, .employment-type').first().text()
  ).toLowerCase();
  let jobType = null;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';

  // Posted date
  const postedText = cleanText(
    $card.find('time, .posted, .date-posted').first().text()
  );
  const postedDateIsoString = parseIsoDate(postedText);

  // Deadline / closing date
  const deadlineText = cleanText(
    $card.find('.deadline, .closing, .date-close').first().text()
  );
  const deadlineIsoString = parseIsoDate(deadlineText);

  // Salary extraction
  const salaryText = cleanText(
    $card.find('.salary, .compensation, .pay').first().text()
  );
  const { salaryCurrency, salaryMin, salaryMax } = extractSalary(salaryText);

  // Assemble job object
  const job = {
    title,
    companyName: company || null,
    description: description || null,
    location: location || null,
    jobType: jobType || null,
    sourceUrl: sourceUrl || null,
    postedDateIsoString: postedDateIsoString || null,
    deadlineIsoString: deadlineIsoString || null,
    salaryMin: salaryMin !== undefined ? salaryMin : null,
    salaryMax: salaryMax !== undefined ? salaryMax : null,
    salaryCurrency: salaryCurrency || null,
  };

  result.push(job);
});

// If no jobs were found, result stays empty as required.