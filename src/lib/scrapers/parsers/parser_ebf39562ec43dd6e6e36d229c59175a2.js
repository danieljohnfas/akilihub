const jobContainers = $('.job-item, .career-item, .job-listing, .job-card, article.job');
jobContainers.each((_, el) => {
  const container = $(el);
  const title = container.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;
  const companyName = container.find('.company, .company-name').first().text().trim() || null;
  const description = container.find('.description, .job-description, p').first().text().trim() || null;
  const location = container.find('.location, .job-location').first().text().trim() || null;
  const typeText = container.find('.type, .job-type').first().text().trim().toLowerCase() || '';
  let jobType = null;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';
  const sourceUrl = container.find('a').first().attr('href') || null;
  const postedDate = container.find('time[datetime]').first().attr('datetime') || null;
  const deadline = container.find('.deadline, time[date]').first().attr('datetime') || null;
  const salaryText = container.find('.salary, .pay').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const match = salaryText.replace(/,/g, '').match(/([A-Za-z$€£]+)?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/);
    if (match) {
      salaryCurrency = match[1] ? match[1].trim() : null;
      salaryMin = parseFloat(match[2]) || null;
      salaryMax = match[3] ? parseFloat(match[3]) : salaryMin;
    }
  }
  result.push({
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString: postedDate,
    deadlineIsoString: deadline,
    salaryMin,
    salaryMax,
    salaryCurrency
  });
});