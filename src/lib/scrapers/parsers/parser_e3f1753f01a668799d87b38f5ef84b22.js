// Assume $ is already loaded with the page HTML and result is an empty array

function extractNumber(str) {
  const match = str.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseSalary(text) {
  if (!text) return {};
  const currencyMatch = text.match(/([£$€¥])/);
  const currency = currencyMatch ? currencyMatch[1] : null;
  const rangeMatch = text.replace(/,/g, '').match(/(\d+(\.\d+)?)\s*[-to]{1,3}\s*(\d+(\.\d+)?)/i);
  if (rangeMatch) {
    return {
      salaryMin: parseFloat(rangeMatch[1]),
      salaryMax: parseFloat(rangeMatch[3]),
      salaryCurrency: currency
    };
  }
  const singleMatch = text.match(/(\d+(\.\d+)?)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    return {
      salaryMin: value,
      salaryMax: value,
      salaryCurrency: currency
    };
  }
  return {};
}

function normalizeJobType(text) {
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (/(full[-\s]?time|permanent)/.test(lowered)) return 'full_time';
  if (/(part[-\s]?time)/.test(lowered)) return 'part_time';
  if (/(contract|temporary)/.test(lowered)) return 'contract';
  if (/(intern|internship)/.test(lowered)) return 'internship';
  if (/(remote|work\s*from\s*home)/.test(lowered)) return 'remote';
  return null;
}

// Potential selectors that usually contain job entries
const jobSelectors = [
  '.job-listing',
  '.job-item',
  '.vacancy-item',
  '.career-item',
  '.post',
  '.job-detail',
  '.single-job',
  '.listing-item',
  '.search-result',
  '.result-item'
];

let containers = $(jobSelectors.join(','));

if (containers.length === 0) {
  // Fallback: treat the whole page as a single job if a clear title exists
  const pageTitle = $('h1').first().text().trim() ||
                    $('title').first().text().trim();
  if (pageTitle && pageTitle.length > 0 && !/company|category|profile/i.test(pageTitle)) {
    const job = {
      title: pageTitle
    };
    const descHtml = $('.job-description, .description, .content, article').first().html();
    if (descHtml) job.description = descHtml.trim();

    const company = $('.company-name, .employer, .company').first().text().trim();
    if (company) job.companyName = company;

    const loc = $('.location, .job-location').first().text().trim();
    if (loc) job.location = loc;

    const typeText = $('.job-type, .type, .employment-type').first().text().trim();
    const normType = normalizeJobType(typeText);
    if (normType) job.jobType = normType;

    const salaryText = $('.salary, .compensation').first().text().trim();
    Object.assign(job, parseSalary(salaryText));

    const posted = $('time[datetime]').first().attr('datetime') ||
                   $('.date-posted').first().attr('datetime');
    if (posted) job.postedDateIsoString = posted;

    const deadline = $('.deadline, .apply-by').first().attr('datetime') ||
                     $('.deadline').first().text().trim();
    if (deadline) job.deadlineIsoString = deadline;

    const link = $('link[rel="canonical"]').attr('href') || window.location?.href;
    if (link) job.sourceUrl = link;

    result.push(job);
  }
} else {
  containers.each(function () {
    const el = $(this);

    // Title extraction: prioritize heading tags and links
    let title = el.find('h1, h2, h3, .title, .job-title, a.title, a').first().text().trim();
    if (!title) return; // skip if no title

    const job = { title };

    const company = el.find('.company, .company-name, .employer, .brand').first().text().trim();
    if (company) job.companyName = company;

    const descriptionHtml = el.find('.description, .job-description, .desc, .content, article').first().html();
    if (descriptionHtml) job.description = descriptionHtml.trim();

    const location = el.find('.location, .job-location, .city, .place').first().text().trim();
    if (location) job.location = location;

    const typeText = el.find('.job-type, .type, .employment-type').first().text().trim();
    const normType = normalizeJobType(typeText);
    if (normType) job.jobType = normType;

    const salaryText = el.find('.salary, .compensation, .pay').first().text().trim();
    Object.assign(job, parseSalary(salaryText));

    const posted = el.find('time[datetime]').first().attr('datetime') ||
                   el.find('.date-posted, .posted').first().attr('datetime') ||
                   el.find('.date-posted, .posted').first().text().trim();
    if (posted) job.postedDateIsoString = posted;

    const deadline = el.find('.deadline, .apply-by').first().attr('datetime') ||
                     el.find('.deadline, .apply-by').first().text().trim();
    if (deadline) job.deadlineIsoString = deadline;

    const linkEl = el.find('a[href]').first();
    const href = linkEl.attr('href');
    if (href) {
      const absolute = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      job.sourceUrl = absolute;
    } else if (window.location?.href) {
      job.sourceUrl = window.location.href;
    }

    result.push(job);
  });
}