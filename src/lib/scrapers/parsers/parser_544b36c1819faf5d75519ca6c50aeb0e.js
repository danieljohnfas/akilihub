const jobContainers = $('.job, .job-listing, article[data-job-id], .listing-item, .vacancy, .position').toArray();

jobContainers.forEach(elem => {
  const container = $(elem);
  const title = container.find('h1, h2, h3, .title, .job-title, .vacancy-title').first().text().trim();
  if (!title) return;

  const companyName = container.find('.company, .company-name, .employer').first().text().trim() || undefined;
  const description = container.find('.description, .job-description, .details, p').first().text().trim() || undefined;
  const location = container.find('.location, .job-location, .city').first().text().trim() || undefined;

  const typeText = container.find('.job-type, .type, .employment-type').first().text().trim().toLowerCase();
  let jobType;
  if (/full\s?time/.test(typeText)) jobType = 'full_time';
  else if (/part\s?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';

  const sourceUrl = container.find('a.apply-link, a[href*="apply"], a[href*="job"]').first().attr('href') || undefined;

  const posted = container.find('time.posted, .posted-date').first().attr('datetime') ||
                 container.find('.posted-date').first().text().trim();
  const postedDateIsoString = posted ? new Date(posted).toISOString() : undefined;

  const deadline = container.find('time.deadline, .deadline-date').first().attr('datetime') ||
                   container.find('.deadline-date').first().text().trim();
  const deadlineIsoString = deadline ? new Date(deadline).toISOString() : undefined;

  const salaryText = container.find('.salary, .pay, .compensation').first().text().trim();
  let salaryMin, salaryMax, salaryCurrency;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[$€£¥]/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : undefined;
    const numbers = salaryText.replace(/[^0-9\-]/g, ' ').trim().split(/\s+/);
    const ranges = numbers.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (ranges.length === 1) {
      salaryMin = salaryMax = ranges[0];
    } else if (ranges.length >= 2) {
      salaryMin = Math.min(...ranges);
      salaryMax = Math.max(...ranges);
    }
  }

  const job = {
    title,
    companyName,
    description,
    location,
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