const jobSelectors = [
  '[itemtype="http://schema.org/JobPosting"]',
  '.job-listing',
  '.job-card',
  '.vacancy',
  '.position',
  '.career-item',
  '.listing-item',
  '.posting'
];

$(jobSelectors.join(',')).each(function () {
  const container = $(this);

  const title =
    container.find('h1, h2, h3, .title, [itemprop="title"], [data-title]').first().text().trim();
  if (!title) return;

  const companyName =
    container.find('.company, .company-name, [itemprop="hiringOrganization"] .name, [data-company]').first()
      .text()
      .trim();

  const description =
    container.find('.description, .job-description, [itemprop="description"], [data-description]').first()
      .text()
      .trim();

  const location =
    container.find('.location, [itemprop="jobLocation"] .name, [data-location]').first()
      .text()
      .trim();

  const jobTypeText =
    container.find('.job-type, [itemprop="employmentType"], [data-jobtype]').first()
      .text()
      .trim()
      .toLowerCase();

  const jobTypeMap = {
    fulltime: 'full_time',
    'full time': 'full_time',
    parttime: 'part_time',
    'part time': 'part_time',
    contract: 'contract',
    internship: 'internship',
    remote: 'remote'
  };
  const jobType = jobTypeMap[jobTypeText] || undefined;

  const sourceUrl =
    container.find('a[href]').first().attr('href') ||
    container.parent('a').attr('href') ||
    undefined;

  const postedDateIsoString =
    container.find('[itemprop="datePosted"], [data-posteddate]').first().attr('datetime') ||
    undefined;

  const deadlineIsoString =
    container.find('[itemprop="validThrough"], [data-deadline]').first().attr('datetime') ||
    undefined;

  const salaryText =
    container.find('.salary, [itemprop="baseSalary"], [data-salary]').first()
      .text()
      .trim();

  let salaryMin, salaryMax, salaryCurrency;
  if (salaryText) {
    const salaryMatch = salaryText.match(/([A-Z]{3})?\s*([\d.,]+)\s*[-–]\s*([A-Z]{3})?\s*([\d.,]+)/);
    if (salaryMatch) {
      salaryCurrency = salaryMatch[1] || salaryMatch[3] || undefined;
      salaryMin = parseFloat(salaryMatch[2].replace(/,/g, ''));
      salaryMax = parseFloat(salaryMatch[4].replace(/,/g, ''));
    } else {
      const singleMatch = salaryText.match(/([A-Z]{3})?\s*([\d.,]+)/);
      if (singleMatch) {
        salaryCurrency = singleMatch[1] || undefined;
        salaryMin = parseFloat(singleMatch[2].replace(/,/g, ''));
        salaryMax = salaryMin;
      }
    }
  }

  const job = {
    title,
    companyName: companyName || undefined,
    description: description || undefined,
    location: location || undefined,
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