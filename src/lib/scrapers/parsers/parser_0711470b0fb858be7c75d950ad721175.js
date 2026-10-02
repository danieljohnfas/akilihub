const jobContainers = $('.job, .job-item, .job-card, .vacancy, .career-item, article[data-job-id], .listing-item');

jobContainers.each((i, el) => {
  const container = $(el);
  const title = container.find('h1, h2, h3, .title, .job-title, a').first().text().trim();
  if (!title) return;
  const company = container.find('.company, .company-name').first().text().trim() || undefined;
  const description = container.find('.description, .job-description, p').first().text().trim() || undefined;
  const location = container.find('.location, .job-location').first().text().trim() || undefined;
  const typeText = container.find('.type, .job-type').first().text().trim().toLowerCase();
  let jobType;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';
  const sourceUrl = container.find('a[href]').first().attr('href') || undefined;
  const posted = container.find('time[datetime]').first().attr('datetime') || undefined;
  const deadline = container.find('time[datetime]').last().attr('datetime') || undefined;
  const salaryText = container.find('.salary, .compensation').first().text();
  let salaryMin, salaryMax, salaryCurrency;
  if (salaryText) {
    const rangeMatch = salaryText.replace(/[^\d.,-]/g, '').match(/([\d.,]+)\s*[-–]\s*([\d.,]+)/);
    if (rangeMatch) {
      salaryMin = parseFloat(rangeMatch[1].replace(/,/g, ''));
      salaryMax = parseFloat(rangeMatch[2].replace(/,/g, ''));
    }
    const curMatch = salaryText.match(/[A-Za-z]{3,}/);
    if (curMatch) salaryCurrency = curMatch[0];
  }
  result.push({
    title,
    companyName: company,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin: salaryMin !== undefined ? salaryMin : undefined,
    salaryMax: salaryMax !== undefined ? salaryMax : undefined,
    salaryCurrency
  });
});