// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, elem) => {
  let jsonText = $(elem).contents().first().text().trim();
  if (!jsonText) return;
  try {
    const data = JSON.parse(jsonText);
    const candidates = [];

    // If @graph is present, flatten it
    if (Array.isArray(data['@graph'])) {
      candidates.push(...data['@graph']);
    } else if (Array.isArray(data)) {
      candidates.push(...data);
    } else {
      candidates.push(data);
    }

    candidates.forEach(item => {
      // Direct JobPosting object
      if (item['@type'] === 'JobPosting') {
        const job = {};

        if (item.name) job.title = String(item.name).trim();

        if (item.hiringOrganization && item.hiringOrganization.name) {
          job.companyName = String(item.hiringOrganization.name).trim();
        }

        if (item.description) job.description = String(item.description).trim();

        // Location handling (may be string or object)
        if (item.jobLocation) {
          const loc = item.jobLocation;
          if (typeof loc === 'string') {
            job.location = loc.trim();
          } else if (loc.address) {
            const addr = loc.address;
            const parts = [];
            if (addr.addressLocality) parts.push(addr.addressLocality);
            if (addr.addressRegion) parts.push(addr.addressRegion);
            if (addr.addressCountry) parts.push(addr.addressCountry);
            job.location = parts.filter(Boolean).join(', ');
          }
        }

        // Employment type mapping
        if (item.employmentType) {
          const typeStr = String(item.employmentType).toLowerCase();
          if (typeStr.includes('full')) job.jobType = 'full_time';
          else if (typeStr.includes('part')) job.jobType = 'part_time';
          else if (typeStr.includes('contract')) job.jobType = 'contract';
          else if (typeStr.includes('intern')) job.jobType = 'internship';
          else if (typeStr.includes('remote')) job.jobType = 'remote';
        }

        // Source URL
        if (item.sameAs) job.sourceUrl = String(item.sameAs).trim();
        else if (item.url) job.sourceUrl = String(item.url).trim();

        // Dates
        if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
        if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();

        // Salary handling (supports both single value and range)
        if (item.baseSalary) {
          const salary = item.baseSalary;
          if (salary.value) {
            if (salary.value.minValue != null) job.salaryMin = Number(salary.value.minValue);
            if (salary.value.maxValue != null) job.salaryMax = Number(salary.value.maxValue);
            if (salary.value.currency) job.salaryCurrency = String(salary.value.currency).trim();
          } else if (salary.minValue != null) {
            job.salaryMin = Number(salary.minValue);
            if (salary.maxValue != null) job.salaryMax = Number(salary.maxValue);
            if (salary.currency) job.salaryCurrency = String(salary.currency).trim();
          }
        }

        // Only push if a clear title exists
        if (job.title) result.push(job);
      }
    });
  } catch (e) {
    // ignore malformed JSON
  }
});

// Fallback: try to locate explicit HTML job blocks if no JSON‑LD found
if (result.length === 0) {
  const jobContainers = $('.job-listing, .job-item, .vacancy, article.job, section.job');
  jobContainers.each((_, container) => {
    const $c = $(container);
    const title = $c.find('h1, h2, h3, h4').first().text().trim();
    if (!title) return; // not a job block

    const job = { title };

    const company = $c.find('.company, .company-name').first().text().trim();
    if (company) job.companyName = company;

    const location = $c.find('.location, .job-location').first().text().trim();
    if (location) job.location = location;

    const description = $c.find('.description, .job-description, p').first().text().trim();
    if (description) job.description = description;

    const typeText = $c.find('.type, .employment-type').first().text().trim().toLowerCase();
    if (typeText) {
      if (typeText.includes('full')) job.jobType = 'full_time';
      else if (typeText.includes('part')) job.jobType = 'part_time';
      else if (typeText.includes('contract')) job.jobType = 'contract';
      else if (typeText.includes('intern')) job.jobType = 'internship';
      else if (typeText.includes('remote')) job.jobType = 'remote';
    }

    const posted = $c.find('.date-posted, time[datetime]').first().attr('datetime') ||
                   $c.find('.date-posted').first().text().trim();
    if (posted) job.postedDateIsoString = new Date(posted).toISOString();

    const deadline = $c.find('.deadline, .date-closed, time[datetime]').filter((i, el) => {
      const txt = $(el).text().toLowerCase();
      return txt.includes('deadline') || txt.includes('close');
    }).first().attr('datetime') ||
      $c.find('.deadline, .date-closed').first().text().trim();
    if (deadline) job.deadlineIsoString = new Date(deadline).toISOString();

    const salary = $c.find('.salary, .pay').first().text().trim();
    if (salary) {
      const match = salary.match(/([\$€£])?\s*([0-9,.]+)\s*(?:-|\sto\s)?\s*([\$€£])?\s*([0-9,.]+)?/);
      if (match) {
        const cur = match[1] || match[3];
        if (cur) job.salaryCurrency = cur;
        if (match[2]) job.salaryMin = Number(match[2].replace(/[,]/g, ''));
        if (match[4]) job.salaryMax = Number(match[4].replace(/[,]/g, ''));
      }
    }

    const sourceLink = $c.find('a.apply, a.apply-now, a[href]').first().attr('href');
    if (sourceLink) job.sourceUrl = sourceLink.trim();

    result.push(job);
  });
}