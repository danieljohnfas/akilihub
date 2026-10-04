// Identify possible job containers
const containers = $('article, .job, .post, .listing, .job-listing, .job-item, .vacancy');

containers.each((_, elem) => {
  const $job = $(elem);

  // Find a title element – must exist to be considered a real job posting
  const $titleEl = $job.find('h1, h2, h3, .entry-title, .job-title').filter((i, el) => $(el).text().trim().length).first();
  const title = $titleEl.text().trim();
  if (!title) return; // skip non‑job blocks

  // Basic fields
  const companyName = $job.find('.company, .company-name, .meta-company, .job-company').first().text().trim() || null;
  const description = $job.find('.description, .entry-content, .job-description, .summary, p').first().text().trim() || null;
  const location = $job.find('.location, .job-location, .meta-location').first().text().trim() || null;

  // Job type detection (full_time, part_time, contract, internship, remote)
  const typeText = $job.find('.job-type, .type, .employment-type').first().text().toLowerCase();
  let jobType = null;
  if (/full\s?time/.test(typeText)) jobType = 'full_time';
  else if (/part\s?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';

  // Source URL – usually the anchor inside the title element
  const sourceUrl = $titleEl.find('a[href]').attr('href') || null;

  // Posted date – look for <time datetime="..."> or a data attribute
  let postedDateIsoString = null;
  const $time = $job.find('time[datetime]').first();
  if ($time.length) {
    postedDateIsoString = new Date($time.attr('datetime')).toISOString();
  } else {
    const postedText = $job.find('.posted, .date, .meta-date').first().text();
    const parsed = Date.parse(postedText);
    if (!isNaN(parsed)) postedDateIsoString = new Date(parsed).toISOString();
  }

  // Deadline date – similar logic
  let deadlineIsoString = null;
  const $deadline = $job.find('time[datetime][class*="deadline"], .deadline time, .deadline').first();
  if ($deadline.length) {
    const dt = $deadline.attr('datetime') || $deadline.text();
    const parsed = Date.parse(dt);
    if (!isNaN(parsed)) deadlineIsoString = new Date(parsed).toISOString();
  }

  // Salary extraction
  const salaryText = $job.find('.salary, .compensation, .pay').first().text();
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  if (salaryText) {
    // Example patterns: "$12,000 - $15,000", "USD 12000 - 15000", "£30k"
    const currencyMatch = salaryText.match(/[\$£€]|[A-Z]{3}/);
    if (currencyMatch) salaryCurrency = currencyMatch[0].replace(/[^\w]/g, '');

    const numbers = salaryText.replace(/[^0-9\-.]/g, ' ').trim().split(/\s+/).map(n => parseFloat(n.replace(/,/g, '')));
    const filtered = numbers.filter(n => !isNaN(n));
    if (filtered.length) {
      salaryMin = filtered[0];
      salaryMax = filtered.length > 1 ? filtered[1] : filtered[0];
    }
  }

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

  result.push(job);
});