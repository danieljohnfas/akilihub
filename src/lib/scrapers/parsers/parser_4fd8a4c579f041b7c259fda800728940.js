// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, script) => {
  let txt = $(script).contents().text();
  try {
    let data = JSON.parse(txt);
    // Normalise to an array of objects to inspect
    let candidates = [];
    if (Array.isArray(data)) {
      candidates = data;
    } else if (data['@graph']) {
      candidates = data['@graph'];
    } else {
      candidates = [data];
    }
    candidates.forEach(item => {
      const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
      if (!types.includes('JobPosting')) return;

      const job = {};

      // Basic fields
      job.title = item.title || item.headline || '';
      job.companyName = item.hiringOrganization && item.hiringOrganization.name ? item.hiringOrganization.name : '';
      job.description = item.description || '';
      job.location = '';
      if (item.jobLocation && item.jobLocation.address) {
        const addr = item.jobLocation.address;
        job.location = addr.addressLocality || addr.addressRegion || addr.streetAddress || '';
      }

      // Employment type mapping
      const etRaw = (item.employmentType || '').toString().toUpperCase();
      const typeMap = {
        'FULL_TIME': 'full_time',
        'FULLTIME': 'full_time',
        'PART_TIME': 'part_time',
        'PARTTIME': 'part_time',
        'CONTRACT': 'contract',
        'INTERNSHIP': 'internship',
        'REMOTE': 'remote',
        'TEMPORARY': 'contract',
        'TEMP': 'contract'
      };
      job.jobType = typeMap[etRaw] || '';

      // URLs and dates
      job.sourceUrl = item.url || item.sameAs || '';
      job.postedDateIsoString = item.datePosted || item.datePublished || '';
      job.deadlineIsoString = item.validThrough || '';

      // Salary handling (Schema.org format)
      if (item.baseSalary && typeof item.baseSalary === 'object') {
        const sal = item.baseSalary;
        if (sal.value && typeof sal.value === 'object') {
          if (sal.value.minValue) job.salaryMin = Number(sal.value.minValue);
          if (sal.value.maxValue) job.salaryMax = Number(sal.value.maxValue);
          job.salaryCurrency = sal.value.currency || sal.currency || '';
        }
      }

      result.push(job);
    });
  } catch (e) {
    // ignore malformed JSON‑LD
  }
});

// Fallback: look for common DOM patterns when no JSON‑LD was found
if (result.length === 0) {
  const containers = $('.job-listing, .job-item, .job, article.post, .entry-content .position');
  containers.each((_, el) => {
    const $el = $(el);

    // Attempt to locate a title element
    const titleEl = $el.find('h1, h2, h3, .job-title, .title').first();
    const title = titleEl.text().trim();
    if (!title) return; // skip if no clear title

    const job = { title };

    // Company name (common selectors)
    const compEl = $el.find('.company, .company-name, .employer').first();
    job.companyName = compEl.text().trim();

    // Description (take paragraph or div text)
    const descEl = $el.find('.description, .job-description, p').first();
    job.description = descEl.text().trim();

    // Location
    const locEl = $el.find('.location, .job-location').first();
    job.location = locEl.text().trim();

    // Employment type (keywords)
    const typeText = $el.text().toUpperCase();
    const typeMap = {
      'FULL TIME': 'full_time',
      'FULLTIME': 'full_time',
      'PART TIME': 'part_time',
      'PARTTIME': 'part_time',
      'CONTRACT': 'contract',
      'INTERNSHIP': 'internship',
      'REMOTE': 'remote'
    };
    for (const key in typeMap) {
      if (typeText.includes(key)) {
        job.jobType = typeMap[key];
        break;
      }
    }

    // Posted / deadline dates (look for ISO strings)
    const dateText = $el.text();
    const isoMatch = dateText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/);
    if (isoMatch) job.postedDateIsoString = isoMatch[0];

    // Salary detection (simple regex)
    const salMatch = $el.text().match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[\s-]*([A-Z]{3})/i);
    if (salMatch) {
      const amount = Number(salMatch[1].replace(/,/g, ''));
      job.salaryMin = amount;
      job.salaryMax = amount;
      job.salaryCurrency = salMatch[2].toUpperCase();
    }

    result.push(job);
  });
}