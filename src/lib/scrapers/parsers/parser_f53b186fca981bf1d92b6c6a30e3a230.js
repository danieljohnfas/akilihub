// Identify possible job containers using common patterns and schema.org markup
const jobSelectors = [
  '[itemtype="https://schema.org/JobPosting"]',
  '[itemtype="http://schema.org/JobPosting"]',
  '.job-listing',
  '.job-item',
  '.vacancy',
  '.posting',
  '.career-item',
  '.career-listing'
];
const $jobs = $(jobSelectors.join(','));

// If no job elements are found, keep result empty as per instructions
if ($jobs.length === 0) {
  // nothing to do
} else {
  $jobs.each((_, elem) => {
    const $elem = $(elem);

    // Title
    let title = $elem.find('[itemprop="title"], .title, h1, h2, h3')
      .first()
      .text()
      .trim();

    // Company Name
    let companyName = $elem.find('[itemprop="hiringOrganization"] [itemprop="name"], .company, .company-name')
      .first()
      .text()
      .trim();

    // Description
    let description = $elem.find('[itemprop="description"], .description')
      .first()
      .text()
      .trim();

    // Location
    let location = $elem.find('[itemprop="jobLocation"] [itemprop="address"], .location, .job-location')
      .first()
      .text()
      .trim();

    // Employment type (jobType)
    let rawJobType = $elem.find('[itemprop="employmentType"], .employment-type')
      .first()
      .text()
      .trim()
      .toLowerCase();

    const typeMap = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      'contract': 'contract',
      'internship': 'internship',
      'intern': 'internship',
      'remote': 'remote',
      'telecommute': 'remote',
      'temporary': 'contract'
    };
    let jobType = typeMap[rawJobType] || (rawJobType ? rawJobType.replace(/\\s+/g, '_') : undefined);

    // Source URL
    let sourceUrl = $elem.find('a')
      .first()
      .attr('href');
    if (sourceUrl && !sourceUrl.startsWith('http')) {
      const base = $('base').attr('href') || '';
      sourceUrl = new URL(sourceUrl, base || 'https://example.com').href;
    }

    // Posted date (ISO string)
    let postedDateIsoString = $elem.find('[itemprop="datePosted"]')
      .first()
      .attr('content') ||
      $elem.find('[itemprop="datePosted"]')
        .first()
        .text()
        .trim();
    if (postedDateIsoString) {
      const d = new Date(postedDateIsoString);
      if (!isNaN(d)) postedDateIsoString = d.toISOString();
      else postedDateIsoString = undefined;
    }

    // Deadline (validThrough)
    let deadlineIsoString = $elem.find('[itemprop="validThrough"]')
      .first()
      .attr('content') ||
      $elem.find('[itemprop="validThrough"]')
        .first()
        .text()
        .trim();
    if (deadlineIsoString) {
      const d = new Date(deadlineIsoString);
      if (!isNaN(d)) deadlineIsoString = d.toISOString();
      else deadlineIsoString = undefined;
    }

    // Salary (attempt to parse numeric values)
    let salaryMin, salaryMax, salaryCurrency;
    const $salaryElem = $elem.find('[itemprop="baseSalary"], .salary').first();
    if ($salaryElem.length) {
      const salaryText = $salaryElem.text().trim();
      const currencyMatch = salaryText.match(/([A-Z]{3}|[$€£¥])/);
      if (currencyMatch) salaryCurrency = currencyMatch[1];
      const numbers = salaryText.replace(/[^0-9\\-]/g, ' ').trim().split(/\\s+/);
      if (numbers.length) {
        const vals = numbers
          .map(n => parseInt(n, 10))
          .filter(v => !isNaN(v))
          .sort((a, b) => a - b);
        if (vals.length) {
          salaryMin = vals[0];
          salaryMax = vals[vals.length - 1];
        }
      }
    }

    // Build job object, only include defined fields
    const job = {};
    if (title) job.title = title;
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

    // Only push if we have at least a title (the minimal indication of a real job posting)
    if (job.title) {
      result.push(job);
    }
  });
}