// Identify possible job containers
const containers = $('.job-detail, .job-item, .job-card, .vacancy, .listing, article.job, .detail, .job, .post').toArray();

containers.forEach(el => {
  const elem = $(el);

  // Title (must exist to consider this a job)
  const title = elem.find('h1, h2, .title, .job-title, .post-title').first().text().trim();
  if (!title) return;

  // Company name
  const companyName = elem.find('.company, .company-name, .employer, .org-name').first().text().trim() || null;

  // Description (prefer longer text)
  const description = elem.find('.description, .job-description, .desc, .content, .post-content').first().text().trim() || null;

  // Location
  const location = elem.find('.location, .job-location, .place, .city').first().text().trim() || null;

  // Job type normalization
  const rawType = elem.find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
  let jobType = null;
  if (rawType) {
    if (/full\s?time/.test(rawType)) jobType = 'full_time';
    else if (/part\s?time/.test(rawType)) jobType = 'part_time';
    else if (/contract/.test(rawType)) jobType = 'contract';
    else if (/internship/.test(rawType) || /intern/.test(rawType)) jobType = 'internship';
    else if (/remote/.test(rawType)) jobType = 'remote';
  }

  // Source URL (canonical meta or fallback)
  const sourceUrl = $('link[rel="canonical"]').attr('href') ||
                    $('meta[property="og:url"]').attr('content') ||
                    null;

  // Posted date
  let postedDateIsoString = null;
  const postedTime = elem.find('time[datetime]').first().attr('datetime') ||
                     elem.find('.posted, .post-date').first().text().trim();
  if (postedTime) {
    const d = new Date(postedTime);
    if (!isNaN(d)) postedDateIsoString = d.toISOString();
  }

  // Deadline date
  let deadlineIsoString = null;
  const deadlineText = elem.find('.deadline, .apply-by, .closing-date').first().text().trim();
  if (deadlineText) {
    const d = new Date(deadlineText);
    if (!isNaN(d)) deadlineIsoString = d.toISOString();
  }

  // Salary parsing
  const salaryText = elem.find('.salary, .pay, .compensation').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    // Example patterns: "$30,000 - $40,000", "USD 30000 to 40000", "30000-40000 EUR"
    const currencyMatch = salaryText.match(/([\p{Sc}]|[A-Z]{3})/u);
    if (currencyMatch) salaryCurrency = currencyMatch[0].trim();

    const numbers = salaryText.match(/[\d.,]+/g);
    if (numbers && numbers.length) {
      const clean = n => parseFloat(n.replace(/[.,]/g, ''));
      if (numbers.length === 1) {
        salaryMin = salaryMax = clean(numbers[0]);
      } else {
        salaryMin = clean(numbers[0]);
        salaryMax = clean(numbers[1]);
      }
    }
  }

  // Assemble job object
  const job = { title };
  if (companyName) job.companyName = companyName;
  if (description) job.description = description;
  if (location) job.location = location;
  if (jobType) job.jobType = jobType;
  if (sourceUrl) job.sourceUrl = sourceUrl;
  if (postedDateIsoString) job.postedDateIsoString = postedDateIsoString;
  if (deadlineIsoString) job.deadlineIsoString = deadlineIsoString;
  if (salaryMin !== null) job.salaryMin = salaryMin;
  if (salaryMax !== null) job.salaryMax = salaryMax;
  if (salaryCurrency) job.salaryCurrency = salaryCurrency;

  result.push(job);
});