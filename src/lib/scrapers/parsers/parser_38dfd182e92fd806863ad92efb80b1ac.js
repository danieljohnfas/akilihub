// Identify possible job containers
let containers = $(
  '.job-detail, .job-single, .job-view, .single-job, .post, article, .content, .main-content'
).filter(function () {
  return $(this).find('h1, h2, .title, .job-title').length > 0;
});

containers.each(function () {
  const container = $(this);

  // Title
  const title = container.find('h1, h2, .title, .job-title').first().text().trim();
  if (!title) return;

  // Company
  const company = container
    .find('.company, .company-name, .employer, .employer-name')
    .first()
    .text()
    .trim();

  // Description (HTML)
  const descriptionElem = container.find(
    '.description, .job-description, .job-details, .content, .post-content, .job-body'
  ).first();
  const description = descriptionElem.length ? descriptionElem.html().trim() : undefined;

  // Location
  const location = container
    .find('.location, .job-location, .city, .region')
    .first()
    .text()
    .trim();

  // Job type detection
  const textBlob = container.text();
  let jobType;
  if (/full\s?time/i.test(textBlob)) jobType = 'full_time';
  else if (/part\s?time/i.test(textBlob)) jobType = 'part_time';
  else if (/contract/i.test(textBlob)) jobType = 'contract';
  else if (/internship/i.test(textBlob)) jobType = 'internship';
  else if (/remote/i.test(textBlob)) jobType = 'remote';

  // Posted date
  let postedDateIsoString;
  const postedMeta =
    $('meta[property="article:published_time"]').attr('content') ||
    container.find('time[datetime]').first().attr('datetime') ||
    container.find('.date, .posted, time').first().text();
  if (postedMeta) {
    const d = new Date(postedMeta);
    if (!isNaN(d)) postedDateIsoString = d.toISOString();
  }

  // Deadline
  let deadlineIsoString;
  const deadlineMatch = textBlob.match(/deadline[:\s]*([A-Za-z0-9,\/\-\s:]+)/i);
  if (deadlineMatch) {
    const d = new Date(deadlineMatch[1]);
    if (!isNaN(d)) deadlineIsoString = d.toISOString();
  }

  // Salary extraction
  let salaryMin, salaryMax, salaryCurrency;
  const salaryMatch = textBlob.match(/salary[:\s]*([A-Za-z$€£¥\s0-9.,-]+)/i);
  if (salaryMatch) {
    const salaryStr = salaryMatch[1];
    const curMatch = salaryStr.match(/([$€£¥])/);
    if (curMatch) salaryCurrency = curMatch[1];
    const nums = salaryStr
      .replace(/[^0-9.,-]/g, '')
      .split(/[-–to]/i)
      .map((n) => parseFloat(n.replace(/,/g, '')))
      .filter((n) => !isNaN(n));
    if (nums[0] !== undefined) salaryMin = nums[0];
    if (nums[1] !== undefined) salaryMax = nums[1];
  }

  // Source URL
  const sourceUrl = $('meta[property="og:url"]').attr('content');

  // Build job object
  const job = { title };
  if (company) job.companyName = company;
  if (description) job.description = description;
  if (location) job.location = location;
  if (jobType) job.jobType = jobType;
  if (postedDateIsoString) job.postedDateIsoString = postedDateIsoString;
  if (deadlineIsoString) job.deadlineIsoString = deadlineIsoString;
  if (salaryMin !== undefined) job.salaryMin = salaryMin;
  if (salaryMax !== undefined) job.salaryMax = salaryMax;
  if (salaryCurrency) job.salaryCurrency = salaryCurrency;
  if (sourceUrl) job.sourceUrl = sourceUrl;

  result.push(job);
});

// Fallback: if no jobs found, try to infer a single job from meta tags
if (result.length === 0) {
  const pageTitle = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const combined = `${pageTitle} ${metaDesc}`.trim();

  // Heuristic: look for typical job keywords
  if (/full\s?time|part\s?time|contract|internship|remote|years?\s+of\s+experience/i.test(combined)) {
    const fallbackJob = { title: pageTitle };
    if (metaDesc) fallbackJob.description = metaDesc;

    // Location from keywords meta if present
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const locMatch = metaKeywords.match(
      /(Tanzania|Kenya|Uganda|Rwanda|South\s?Africa|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
    );
    if (locMatch) fallbackJob.location = locMatch[0];

    // Job type
    if (/full\s?time/i.test(combined)) fallbackJob.jobType = 'full_time';
    else if (/part\s?time/i.test(combined)) fallbackJob.jobType = 'part_time';
    else if (/contract/i.test(combined)) fallbackJob.jobType = 'contract';
    else if (/internship/i.test(combined)) fallbackJob.jobType = 'internship';
    else if (/remote/i.test(combined)) fallbackJob.jobType = 'remote';

    // Source URL
    const src = $('meta[property="og:url"]').attr('content');
    if (src) fallbackJob.sourceUrl = src;

    result.push(fallbackJob);
  }
}