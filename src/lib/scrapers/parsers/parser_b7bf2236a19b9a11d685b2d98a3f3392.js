// Ensure result array exists
result = result || [];

// Flag to indicate if jobs were found
let jobsFound = false;

// Helper to recursively search for an ItemList in a JSON-LD object
function findItemList(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const o of obj) {
      const found = findItemList(o);
      if (found) return found;
    }
  } else {
    if (obj['@type'] === 'ItemList' && obj.itemListElement) return obj;
    if (obj['@graph']) {
      const found = findItemList(obj['@graph']);
      if (found) return found;
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const found = findItemList(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

// Parse JSON‑LD scripts for ItemList data
$('script[type="application/ld+json"]').each((_, script) => {
  const txt = $(script).contents().first().text().trim();
  if (!txt) return;
  try {
    const data = JSON.parse(txt);
    const itemList = findItemList(data);
    if (itemList && Array.isArray(itemList.itemListElement)) {
      jobsFound = true;
      itemList.itemListElement.forEach(item => {
        if (!item || item['@type'] !== 'ListItem') return;
        const job = {};

        if (item.name) job.title = item.name.trim();
        if (item.url) job.sourceUrl = item.url.trim();
        if (item.description) job.description = item.description.trim();

        // Location (may be string or object with name)
        if (item.location) {
          if (typeof item.location === 'string') job.location = item.location.trim();
          else if (item.location.name) job.location = item.location.name.trim();
        }

        // Employment type mapping
        if (item.employmentType) {
          const t = item.employmentType.toLowerCase();
          if (t.includes('full')) job.jobType = 'full_time';
          else if (t.includes('part')) job.jobType = 'part_time';
          else if (t.includes('contract')) job.jobType = 'contract';
          else if (t.includes('intern')) job.jobType = 'internship';
          else if (t.includes('remote')) job.jobType = 'remote';
        }

        // Salary extraction
        if (item.baseSalary && typeof item.baseSalary === 'object') {
          const sal = item.baseSalary;
          if (sal.minValue) job.salaryMin = Number(sal.minValue);
          if (sal.maxValue) job.salaryMax = Number(sal.maxValue);
          if (sal.currency) job.salaryCurrency = sal.currency;
        }

        // Dates
        if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
        if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();

        result.push(job);
      });
    }
  } catch (e) {
    // ignore malformed JSON
  }
});

// Fallback: try to locate visible job cards if JSON‑LD failed
if (!jobsFound) {
  $('.job-card, .job-item, article.job, .listing-item').each((_, el) => {
    const $el = $(el);
    const titleLink = $el.find('h2 a, h3 a, .job-title a').first();
    const title = titleLink.text().trim();
    if (!title) return;

    const job = { title };
    const href = titleLink.attr('href');
    if (href) job.sourceUrl = href;

    const desc = $el.find('.job-description, p').first().text().trim();
    if (desc) job.description = desc;

    const loc = $el.find('.location, .job-location').first().text().trim();
    if (loc) job.location = loc;

    const typeText = $el.find('.job-type').first().text().trim().toLowerCase();
    if (typeText) {
      if (typeText.includes('full')) job.jobType = 'full_time';
      else if (typeText.includes('part')) job.jobType = 'part_time';
      else if (typeText.includes('contract')) job.jobType = 'contract';
      else if (typeText.includes('intern')) job.jobType = 'internship';
      else if (typeText.includes('remote')) job.jobType = 'remote';
    }

    result.push(job);
  });
}