let jobContainers = $('.job, .job-listing, .posting, [data-job-id], article[itemtype="http://schema.org/JobPosting"], [itemtype="https://schema.org/JobPosting"]');

jobContainers.each((_, elem) => {
  let root = $(elem);
  let title = root.find('h1, h2, .title, .job-title, [itemprop="title"]').first().text().trim();
  if (!title) return;

  let companyName = root.find('.company, .company-name, [itemprop="hiringOrganization"] [itemprop="name"]').first().text().trim() || null;
  let description = root.find('.description, .job-description, [itemprop="description"]').first().text().trim() || null;
  let location = root.find('.location, [itemprop="jobLocation"] [itemprop="addressLocality"], [itemprop="address"]').first().text().trim() || null;
  let typeText = root.find('.type, .job-type, [itemprop="employmentType"]').first().text().toLowerCase().trim();
  let jobType = null;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';

  let sourceUrl = root.find('a.apply-link, a[href*="apply"], a[href*="jobs/"]').first().attr('href') || null;
  let posted = root.find('time[datetime], .posted-date').first().attr('datetime') || root.find('.posted-date').first().text().trim() || null;
  let postedDateIsoString = posted ? new Date(posted).toISOString() : null;

  let deadline = root.find('.deadline, time[datetime][class*="deadline"]').first().attr('datetime') || root.find('.deadline').first().text().trim() || null;
  let deadlineIsoString = deadline ? new Date(deadline).toISOString() : null;

  let salaryText = root.find('.salary, [itemprop="baseSalary"]').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    let currencyMatch = salaryText.match(/[$€£¥]/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : null;
    let numbers = salaryText.replace(/[^0-9\-.]/g, ' ').trim().split(/\s+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
    if (numbers.length === 1) {
      salaryMin = salaryMax = numbers[0];
    } else if (numbers.length >= 2) {
      salaryMin = Math.min(...numbers);
      salaryMax = Math.max(...numbers);
    }
  }

  result.push({
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
  });
});