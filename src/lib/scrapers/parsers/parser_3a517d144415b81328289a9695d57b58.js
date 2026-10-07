// Define helper to safely parse ISO date strings
function toIso(str) {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Possible job container selectors (common patterns)
const containerSelectors = [
  '.job-card',
  '.job-item',
  '.job',
  '.listing-item',
  '.border-b',
  '.flex',
  '.grid',
  '.relative',
  '.p-4',
  '.shadow',
  '.bg-white'
];

// Gather candidate containers by looking for links that resemble job detail pages
const candidates = new Set();
$('a[href*="/jobs/"], a[href*="/job/"], a[href*="/career/"], a[href*="/position/"]').each((_, a) => {
  const $a = $(a);
  // Find the nearest parent that matches one of the known container selectors
  let $parent = null;
  for (const sel of containerSelectors) {
    $parent = $a.closest(sel);
    if ($parent.length) break;
  }
  // Fallback to the immediate parent if no specific selector matches
  if (!$parent || !$parent.length) $parent = $a.parent();
  if ($parent && $parent.length) candidates.add($parent.get(0));
});

// Convert Set to array of cheerio objects
const jobElements = Array.from(candidates).map(el => $(el));

// If no obvious job containers were found, keep result empty
if (jobElements.length === 0) {
  // nothing to do
} else {
  const seenUrls = new Set();

  jobElements.forEach($job => {
    // Title extraction – prioritize heading tags or the link text
    let title = $job.find('h1, h2, h3, h4, .title, .job-title, a[href*="/jobs/"], a[href*="/job/"]').first().text().trim();
    if (!title) return; // skip if no clear title

    // Source URL – first job‑detail link
    let sourceUrl = $job.find('a[href*="/jobs/"], a[href*="/job/"], a[href*="/career/"], a[href*="/position/"]').first().attr('href') || '';
    if (!sourceUrl) return;
    // Resolve relative URLs using the base tag if present
    const base = $('base').attr('href');
    if (base && sourceUrl && !sourceUrl.match(/^https?:\/\//i)) {
      sourceUrl = new URL(sourceUrl, base).href;
    } else if (!sourceUrl.match(/^https?:\/\//i)) {
      sourceUrl = new URL(sourceUrl, window?.location?.href || '/').href;
    }
    if (seenUrls.has(sourceUrl)) return; // avoid duplicates
    seenUrls.add(sourceUrl);

    // Company name
    const companyName = $job.find('.company, .company-name, .text-sm, .text-gray-600, .font-medium').first().text().trim() || null;

    // Description – collect first paragraph or a dedicated description block
    const description = $job.find('.description, .desc, p').first().text().trim() || null;

    // Location – look for typical location icons or classes
    const location = $job.find('.location, .job-location, .text-gray-500, .flex .mr-2').first().text().trim() || null;

    // Job type – search for keywords
    const typeText = $job.find('.job-type, .type, .badge, .text-xs').first().text().toLowerCase();
    let jobType = null;
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    // Posted date
    const postedRaw = $job.find('time, .posted, .date, .post-date').first().attr('datetime') ||
                      $job.find('time, .posted, .date, .post-date').first().text();
    const postedDateIsoString = postedRaw ? toIso(postedRaw) : null;

    // Deadline
    const deadlineRaw = $job.find('.deadline, .apply-by, .closing-date').first().attr('datetime') ||
                        $job.find('.deadline, .apply-by, .closing-date').first().text();
    const deadlineIsoString = deadlineRaw ? toIso(deadlineRaw) : null;

    // Salary extraction – look for currency symbols and numbers
    const salaryText = $job.find('.salary, .pay, .compensation').first().text();
    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    if (salaryText) {
      const currencyMatch = salaryText.match(/[$€£¥]/);
      salaryCurrency = currencyMatch ? currencyMatch[0] : null;
      // Extract numbers (allow ranges like "50k - 70k")
      const nums = salaryText.replace(/[^0-9.,-]/g, ' ').trim().split(/[-–to]+/).map(s => parseFloat(s.replace(/[,]/g, '')));
      if (nums.length === 1 && !isNaN(nums[0])) {
        salaryMin = salaryMax = nums[0];
      } else if (nums.length >= 2) {
        salaryMin = nums[0];
        salaryMax = nums[1];
      }
    }

    // Assemble job object
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
}