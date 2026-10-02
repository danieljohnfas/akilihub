// Identify possible job containers
let containers = $('[itemtype="http://schema.org/JobPosting"], .job, .job-item, .career-item, .listing, .post');

// If no explicit containers, treat the whole page as a single job if a clear title exists
if (containers.length === 0) {
  const possibleTitle = $('h1').first().text().trim() || $('title').first().text().trim();
  if (possibleTitle) containers = $([document]); // use the root as a pseudo‑container
}

// Helper to normalize job type text
function normalizeJobType(text) {
  if (!text) return undefined;
  const t = text.toLowerCase();
  if (t.includes('full') && t.includes('time')) return 'full_time';
  if (t.includes('part') && t.includes('time')) return 'part_time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('intern')) return 'internship';
  if (t.includes('remote')) return 'remote';
  return undefined;
}

// Helper to parse salary strings
function parseSalary(str) {
  if (!str) return {};
  const cleaned = str.replace(/[,]/g, '').replace(/[^\d\.\-–]/g, '');
  const range = cleaned.split(/[-–]/);
  const nums = range.map(v => parseFloat(v)).filter(v => !isNaN(v));
  if (nums.length === 0) return {};
  const salary = {
    salaryMin: nums[0],
    salaryMax: nums[1] !== undefined ? nums[1] : nums[0],
    salaryCurrency: (str.match(/[$£€¥]|USD|EUR|GBP|TZS/i) || [])[0] || undefined
  };
  return salary;
}

// Base source URL if available (Node context may not have window)
let baseUrl = typeof window !== 'undefined' && window.location ? window.location.href : undefined;

// Iterate over each identified container
containers.each(function () {
  const $c = $(this);

  // Title
  let title = $c.find('h1, .job-title, [itemprop="title"]').first().text().trim();
  if (!title) title = $('title').first().text().trim();
  if (!title) return; // skip if no clear job title

  // Company
  let companyName = $c.find('[itemprop="hiringOrganization"] [itemprop="name"], .company, .employer, .company-name').first().text().trim();

  // Description
  let description = $c.find('[itemprop="description"], .job-description, .description, .detail-content').first().text().trim();

  // Location
  let location = $c.find('[itemprop="jobLocation"] .location, .job-location, .location, .address').first().text().trim();

  // Job type
  let jobTypeText = $c.find('[itemprop="employmentType"], .job-type, .employment-type').first().text().trim();
  let jobType = normalizeJobType(jobTypeText);

  // Dates
  let postedDateIsoString = $c.find('[itemprop="datePosted"]').attr('content') ||
    $c.find('.date-posted, .posted-date').first().text().trim();
  let deadlineIsoString = $c.find('[itemprop="validThrough"]').attr('content') ||
    $c.find('.deadline, .application-deadline').first().text().trim();

  // Salary
  let salaryStr = $c.find('.salary, [itemprop="baseSalary"]').first().text().trim();
  const { salaryMin, salaryMax, salaryCurrency } = parseSalary(salaryStr);

  // Source URL – try to get from a link inside the container, fallback to page URL
  let sourceUrl = $c.find('a.apply-link, a.job-link, a').first().attr('href');
  if (sourceUrl && !sourceUrl.startsWith('http')) {
    // Resolve relative URLs using the page URL if possible
    try {
      sourceUrl = new URL(sourceUrl, baseUrl).href;
    } catch (e) {
      sourceUrl = baseUrl;
    }
  }
  if (!sourceUrl) sourceUrl = baseUrl;

  // Build job object
  const job = {
    title,
    companyName: companyName || undefined,
    description: description || undefined,
    location: location || undefined,
    jobType,
    sourceUrl,
    postedDateIsoString: postedDateIsoString || undefined,
    deadlineIsoString: deadlineIsoString || undefined,
    salaryMin: typeof salaryMin === 'number' ? salaryMin : undefined,
    salaryMax: typeof salaryMax === 'number' ? salaryMax : undefined,
    salaryCurrency: salaryCurrency || undefined
  };

  result.push(job);
});