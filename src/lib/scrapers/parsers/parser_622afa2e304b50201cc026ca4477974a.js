// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((i, el) => {
  try {
    const data = JSON.parse($(el).contents().text());
    const items = Array.isArray(data) ? data : [data];
    items.forEach(item => {
      if (item['@type'] === 'JobPosting') {
        const job = {};

        if (item.title) job.title = item.title.trim();

        if (item.hiringOrganization && item.hiringOrganization.name) {
          job.companyName = item.hiringOrganization.name.trim();
        }

        if (item.description) job.description = item.description.trim();

        if (item.jobLocation && item.jobLocation.address) {
          const addr = item.jobLocation.address;
          const parts = [];
          if (addr.addressLocality) parts.push(addr.addressLocality);
          if (addr.addressRegion) parts.push(addr.addressRegion);
          if (addr.addressCountry) parts.push(addr.addressCountry);
          if (parts.length) job.location = parts.join(', ');
        }

        if (item.employmentType) {
          const map = {
            FULL_TIME: 'full_time',
            PART_TIME: 'part_time',
            CONTRACT: 'contract',
            INTERNSHIP: 'internship',
            TEMPORARY: 'contract',
            REMOTE: 'remote'
          };
          const typeKey = Array.isArray(item.employmentType)
            ? item.employmentType[0].toUpperCase()
            : item.employmentType.toUpperCase();
          job.jobType = map[typeKey] || typeKey.toLowerCase();
        }

        if (item.sameAs) job.sourceUrl = item.sameAs;

        if (item.datePosted) {
          const d = new Date(item.datePosted);
          if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
        }

        if (item.validThrough) {
          const d = new Date(item.validThrough);
          if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
        }

        if (item.baseSalary && item.baseSalary.value) {
          const val = item.baseSalary.value;
          if (val.minValue) job.salaryMin = Number(val.minValue);
          if (val.maxValue) job.salaryMax = Number(val.maxValue);
          if (val.currency) job.salaryCurrency = val.currency;
        }

        result.push(job);
      }
    });
  } catch (_) {}
});

// Fallback: look for typical HTML job containers
$('.job-card, .job-listing, .listing-item, article.job').each((i, el) => {
  const $c = $(el);
  const title = $c.find('h1, h2, h3').first().text().trim();
  if (!title) return; // not a job entry

  const job = { title };

  const company = $c.find('.company, .company-name').first().text().trim();
  if (company) job.companyName = company;

  const description = $c.find('.description, .job-description').first().text().trim();
  if (description) job.description = description;

  const location = $c.find('.location, .job-location').first().text().trim();
  if (location) job.location = location;

  const typeText = $c.find('.type, .employment-type').first().text().trim().toLowerCase();
  if (typeText) {
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
  }

  result.push(job);
});