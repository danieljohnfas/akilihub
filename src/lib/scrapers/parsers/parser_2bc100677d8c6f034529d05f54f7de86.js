const jobContainers = $('[itemtype="http://schema.org/JobPosting"]');

jobContainers.each((_, el) => {
  const $el = $(el);
  const title = $el.find('[itemprop="title"], h1, h2').first().text().trim();
  if (!title) return;

  const job = { title };

  const company = $el.find('[itemprop="hiringOrganization"] [itemprop="name"], .company, .employer').first().text().trim();
  if (company) job.companyName = company;

  const description = $el.find('[itemprop="description"]').first().text().trim() ||
                      $el.find('.description, .job-description').first().text().trim();
  if (description) job.description = description;

  const location = $el.find('[itemprop="jobLocation"] [itemprop="addressLocality"], .location').first().text().trim();
  if (location) job.location = location;

  const rawType = $el.find('[itemprop="employmentType"]').first().text().trim().toLowerCase();
  if (rawType) {
    const typeMap = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      'contract': 'contract',
      'internship': 'internship',
      'remote': 'remote'
    };
    job.jobType = typeMap[rawType] || rawType;
  }

  const sourceUrl = $el.find('a[href]').first().attr('href');
  if (sourceUrl) job.sourceUrl = sourceUrl;

  const postedRaw = $el.find('[itemprop="datePosted"]').attr('content') ||
                    $el.find('.date-posted').text().trim();
  if (postedRaw) {
    const postedDate = new Date(postedRaw);
    if (!isNaN(postedDate)) job.postedDateIsoString = postedDate.toISOString();
  }

  const deadlineRaw = $el.find('[itemprop="validThrough"]').attr('content') ||
                      $el.find('.deadline').text().trim();
  if (deadlineRaw) {
    const deadlineDate = new Date(deadlineRaw);
    if (!isNaN(deadlineDate)) job.deadlineIsoString = deadlineDate.toISOString();
  }

  const salaryEl = $el.find('[itemprop="baseSalary"]').first();
  if (salaryEl.length) {
    const minVal = salaryEl.find('[itemprop="minValue"]').attr('content') ||
                   salaryEl.attr('content');
    const maxVal = salaryEl.find('[itemprop="maxValue"]').attr('content');
    const currency = salaryEl.find('[itemprop="currency"]').attr('content');

    if (minVal && !isNaN(minVal)) job.salaryMin = Number(minVal);
    if (maxVal && !isNaN(maxVal)) job.salaryMax = Number(maxVal);
    if (currency) job.salaryCurrency = currency;
  }

  result.push(job);
});