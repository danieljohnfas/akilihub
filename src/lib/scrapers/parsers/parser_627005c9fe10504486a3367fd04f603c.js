const jobContainers = $(
  '[itemtype="http://schema.org/JobPosting"],' +
  ' .job-listing,' +
  ' .job,' +
  ' article.job,' +
  ' .career-item,' +
  ' .vacancy,' +
  ' .posting'
);

jobContainers.each((_, elem) => {
  const container = $(elem);

  const title = container.find('[itemprop="title"], .job-title, h1, h2, h3').first().text().trim();
  if (!title) return;

  const companyName = container.find('[itemprop="hiringOrganization"], .company-name, .employer').first().text().trim();

  const description = container.find('[itemprop="description"], .job-description, .description').first().text().trim();

  const location = container.find('[itemprop="jobLocation"], .location, .job-location').first().text().trim();

  const typeText = container.find('[itemprop="employmentType"], .employment-type, .job-type').first().text().trim().toLowerCase();
  let jobType = null;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';

  const sourceUrl = container.find('a[href]').first().attr('href') || null;

  const postedDateIsoString = container.find('time[datetime], .posted-date').first().attr('datetime') ||
    container.find('.posted-date').first().text().trim();

  const deadlineIsoString = container.find('time[datetime][itemprop="validThrough"], .deadline').first().attr('datetime') ||
    container.find('.deadline').first().text().trim();

  const salaryText = container.find('[itemprop="baseSalary"], .salary').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const matches = salaryText.match(/([A-Z]{3})?\s*([\d,]+)(?:\s*[-–]\s*([A-Z]{3})?\s*([\d,]+))?/);
    if (matches) {
      salaryCurrency = matches[1] || matches[3] || null;
      salaryMin = matches[2] ? parseFloat(matches[2].replace(/,/g, '')) : null;
      salaryMax = matches[4] ? parseFloat(matches[4].replace(/,/g, '')) : null;
    }
  }

  result.push({
    title,
    companyName: companyName || null,
    description: description || null,
    location: location || null,
    jobType: jobType || null,
    sourceUrl: sourceUrl || null,
    postedDateIsoString: postedDateIsoString || null,
    deadlineIsoString: deadlineIsoString || null,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency || null
  });
});