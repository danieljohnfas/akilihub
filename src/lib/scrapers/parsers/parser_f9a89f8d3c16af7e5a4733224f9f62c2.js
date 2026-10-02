// Attempt to extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, elem) => {
  let jsonText = $(elem).contents().first().text().trim();
  if (!jsonText) return;
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return;
  }

  // Normalize to an array of objects to iterate
  const items = Array.isArray(data) ? data : [data];
  items.forEach(item => {
    // If the object contains a @graph, search inside it as well
    const candidates = [];
    if (item['@type'] === 'JobPosting') {
      candidates.push(item);
    }
    if (Array.isArray(item['@graph'])) {
      item['@graph'].forEach(g => {
        if (g['@type'] === 'JobPosting') candidates.push(g);
      });
    }

    candidates.forEach(job => {
      const jobObj = {};

      // Title
      if (job.title) jobObj.title = job.title;
      else if (job.name) jobObj.title = job.name;

      // Company Name
      if (job.hiringOrganization && job.hiringOrganization.name) {
        jobObj.companyName = job.hiringOrganization.name;
      }

      // Description (strip HTML if present)
      if (job.description) {
        const desc = typeof job.description === 'string' ? job.description : '';
        jobObj.description = desc.replace(/<[^>]*>/g, '').trim();
      }

      // Location (try several common fields)
      if (job.jobLocation && job.jobLocation.address) {
        const addr = job.jobLocation.address;
        const parts = [];
        if (addr.streetAddress) parts.push(addr.streetAddress);
        if (addr.addressLocality) parts.push(addr.addressLocality);
        if (addr.addressRegion) parts.push(addr.addressRegion);
        if (addr.postalCode) parts.push(addr.postalCode);
        if (addr.addressCountry) parts.push(addr.addressCountry);
        if (parts.length) jobObj.location = parts.join(', ');
      }

      // Job type – map to required enum values when possible
      if (job.employmentType) {
        const type = job.employmentType.toString().toLowerCase();
        if (type.includes('full')) jobObj.jobType = 'full_time';
        else if (type.includes('part')) jobObj.jobType = 'part_time';
        else if (type.includes('contract')) jobObj.jobType = 'contract';
        else if (type.includes('intern')) jobObj.jobType = 'internship';
        else if (type.includes('remote')) jobObj.jobType = 'remote';
        else jobObj.jobType = type;
      }

      // Source URL
      if (job.url) jobObj.sourceUrl = job.url;

      // Posted date
      if (job.datePosted) jobObj.postedDateIsoString = new Date(job.datePosted).toISOString();

      // Deadline
      if (job.validThrough) jobObj.deadlineIsoString = new Date(job.validThrough).toISOString();

      // Salary
      if (job.baseSalary) {
        const salary = job.baseSalary;
        // Salary may be a simple string or a structured object
        if (typeof salary === 'object' && salary.value) {
          const val = salary.value;
          if (val.currency) jobObj.salaryCurrency = val.currency;
          if (val.minValue != null) jobObj.salaryMin = Number(val.minValue);
          if (val.maxValue != null) jobObj.salaryMax = Number(val.maxValue);
        } else if (typeof salary === 'string') {
          // Attempt to parse a simple "USD 50000 - 60000" pattern
          const match = salary.match(/([A-Z]{3})\s*([\d,]+)(?:\s*-\s*([\d,]+))?/);
          if (match) {
            jobObj.salaryCurrency = match[1];
            jobObj.salaryMin = Number(match[2].replace(/,/g, ''));
            if (match[3]) jobObj.salaryMax = Number(match[3].replace(/,/g, ''));
          }
        }
      }

      // Only push if a clear title exists (ensures we are not extracting non‑job listings)
      if (jobObj.title) {
        result.push(jobObj);
      }
    });
  });
});

// Fallback: try to locate a single job detail page with common selectors if JSON‑LD failed
if (result.length === 0) {
  const titleEl = $('h1.entry-title, h1.job-title, .job-title, .post-title').first();
  const title = titleEl.text().trim();
  if (title) {
    const jobObj = { title };

    // Company name – often in a meta tag or near the title
    const company = $('a.company-name, .company-name, .employer, .job-company').first().text().trim();
    if (company) jobObj.companyName = company;

    // Description – main content area
    const descEl = $('.entry-content, .job-description, .description').first();
    if (descEl.length) {
      const descText = descEl.text().trim();
      if (descText) jobObj.description = descText;
    }

    // Location
    const loc = $('.job-location, .location, .address').first().text().trim();
    if (loc) jobObj.location = loc;

    // Employment type
    const typeText = $('.employment-type, .job-type').first().text().trim().toLowerCase();
    if (typeText) {
      if (typeText.includes('full')) jobObj.jobType = 'full_time';
      else if (typeText.includes('part')) jobObj.jobType = 'part_time';
      else if (typeText.includes('contract')) jobObj.jobType = 'contract';
      else if (typeText.includes('intern')) jobObj.jobType = 'internship';
      else if (typeText.includes('remote')) jobObj.jobType = 'remote';
    }

    // Source URL – fallback to canonical link if present
    const canon = $('link[rel="canonical"]').attr('href');
    if (canon) jobObj.sourceUrl = canon;

    // Dates
    const posted = $('meta[property="article:published_time"]').attr('content');
    if (posted) jobObj.postedDateIsoString = new Date(posted).toISOString();
    const deadline = $('meta[property="article:modified_time"]').attr('content');
    if (deadline) jobObj.deadlineIsoString = new Date(deadline).toISOString();

    result.push(jobObj);
  }
}