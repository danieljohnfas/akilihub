const containers = $('.job, .job-item, .job-listing, .vacancy, .position, .career-item');
containers.each(function () {
  const el = $(this);
  const title = el.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;
  const companyName = el.find('.company, .company-name, .employer').first().text().trim() || null;
  const description = el.find('.description, .job-description, .desc').first().text().trim() || null;
  const location = el.find('.location, .job-location').first().text().trim() || null;
  const typeText = el.find('.type, .job-type').first().text().trim().toLowerCase();
  let jobType = null;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';
  const sourceUrl = el.find('a[href]').first().attr('href') || null;
  const posted = el.find('time[datetime]').first().attr('datetime') || null;
  const deadline = el.find('.deadline time[datetime]').first().attr('datetime') || null;
  const salaryText = el.find('.salary, .compensation').first().text();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const match = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)\s?[-–]\s?([A-Z]{3})?\s?(\d+(?:\.\d+)?)/i);
    if (match) {
      salaryCurrency = match[1] || match[3] || null;
      salaryMin = parseFloat(match[2]);
      salaryMax = parseFloat(match[4]);
    } else {
      const single = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)/i);
      if (single) {
        salaryCurrency = single[1] || null;
        salaryMin = parseFloat(single[2]);
        salaryMax = salaryMin;
      }
    }
  }
  result.push({
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin,
    salaryMax,
    salaryCurrency
  });
});