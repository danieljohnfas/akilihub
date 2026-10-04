const jobSelectors = [
  '[itemtype="http://schema.org/JobPosting"]',
  '.job',
  '.job-card',
  '.job-listing',
  '.listing-item',
  'article.job',
  '.post-job',
  '.career-item',
  '.vacancy',
  '.position'
];
const jobs = $(jobSelectors.join(','));

if (jobs.length) {
  jobs.each((_, el) => {
    const container = $(el);
    const title = container.find('[itemprop="title"], .job-title, h1, h2, .title').first().text().trim() || null;
    if (!title) return;
    const companyName = container.find('[itemprop="hiringOrganization"] .name, .company, .company-name').first().text().trim() || null;
    const description = container.find('[itemprop="description"], .job-description, .description').first().text().trim() || null;
    const location = container.find('[itemprop="jobLocation"] .address, .location, .job-location').first().text().trim() || null;
    const typeText = container.find('[itemprop="employmentType"], .employment-type, .job-type').first().text().trim().toLowerCase() || '';
    const jobTypeMap = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      'contract': 'contract',
      'internship': 'internship',
      'intern': 'internship',
      'remote': 'remote'
    };
    const jobType = Object.entries(jobTypeMap).find(([k]) => typeText.includes(k))?.[1] || null;
    const sourceUrl = container.find('a[href]').first().attr('href') || null;
    const posted = container.find('[itemprop="datePosted"], .date-posted, time[datetime]').first().attr('datetime') ||
                   container.find('[itemprop="datePosted"], .date-posted').first().text().trim() || null;
    const deadline = container.find('[itemprop="validThrough"], .deadline, time[datetime][data-deadline]').first().attr('datetime') ||
                     container.find('[itemprop="validThrough"], .deadline').first().text().trim() || null;
    const salaryText = container.find('[itemprop="baseSalary"], .salary, .pay-range').first().text().trim() || '';
    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    const salaryMatch = salaryText.match(/([A-Za-z$€£]+)?\s*([\d,]+)(?:\s*[-–]\s*([\\d,]+))?/);
    if (salaryMatch) {
      salaryCurrency = salaryMatch[1] ? salaryMatch[1].trim() : null;
      salaryMin = Number(salaryMatch[2].replace(/,/g, '')) || null;
      if (salaryMatch[3]) salaryMax = Number(salaryMatch[3].replace(/,/g, '')) || null;
    }
    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString: posted ? new Date(posted).toISOString() : null,
      deadlineIsoString: deadline ? new Date(deadline).toISOString() : null,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}