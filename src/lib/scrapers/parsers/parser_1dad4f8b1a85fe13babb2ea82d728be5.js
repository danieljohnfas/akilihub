const jobElements = $('[itemtype="http://schema.org/JobPosting"], .job, .job-listing, .listing-item');

if (jobElements.length === 0) {
  // No obvious job postings detected; leave result empty.
} else {
  jobElements.each((_, el) => {
    const elem = $(el);
    const job = {};

    // Title
    job.title = elem.find('[itemprop="title"], .job-title, h1, h2, h3').first().text().trim() || null;

    // Company Name
    job.companyName = elem.find('[itemprop="hiringOrganization"] [itemprop="name"], .company, .company-name').first().text().trim() || null;

    // Description
    job.description = elem.find('[itemprop="description"], .job-description, .description').first().text().trim() || null;

    // Location
    const locElem = elem.find('[itemprop="jobLocation"] [itemprop="address"], .location, .job-location').first();
    job.location = locElem.text().trim() || null;

    // Job Type (map common strings to enum)
    const typeText = elem.find('[itemprop="employmentType"], .employment-type, .job-type').first().text().toLowerCase().trim();
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
    else job.jobType = null;

    // Source URL
    const sourceLink = elem.find('a[href][rel!="nofollow"]').first().attr('href');
    job.sourceUrl = sourceLink ? new URL(sourceLink, window.location.href).href : null;

    // Posted date
    const posted = elem.find('[itemprop="datePosted"], .date-posted').first().attr('datetime') ||
                   elem.find('[itemprop="datePosted"], .date-posted').first().text().trim();
    job.postedDateIsoString = posted ? new Date(posted).toISOString() : null;

    // Deadline
    const deadline = elem.find('[itemprop="validThrough"], .deadline').first().attr('datetime') ||
                     elem.find('[itemprop="validThrough"], .deadline').first().text().trim();
    job.deadlineIsoString = deadline ? new Date(deadline).toISOString() : null;

    // Salary
    const salaryText = elem.find('[itemprop="baseSalary"], .salary').first().text().replace(/[,\\s]/g, '');
    const salaryMatch = salaryText.match(/([A-Za-z]{3})?\\s*(\\d+(?:\\.\\d+)?)-?(\\d+(?:\\.\\d+)?)/);
    if (salaryMatch) {
      job.salaryCurrency = salaryMatch[1] || null;
      job.salaryMin = parseFloat(salaryMatch[2]) || null;
      job.salaryMax = salaryMatch[3] ? parseFloat(salaryMatch[3]) : null;
    }

    // Push only if we have at least a title
    if (job.title) {
      result.push(job);
    }
  });
}