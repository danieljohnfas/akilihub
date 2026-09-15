const possibleContainers = [
  '.job',
  '.job-listing',
  '.vacancy',
  '.career-item',
  '.position',
  'article',
  'li'
];
const containers = $(possibleContainers.join(',')).filter(function () {
  const hasTitle = $(this).find('h1, h2, h3, .title, .job-title, a').first().text().trim().length > 0;
  return hasTitle;
});
containers.each(function () {
  const el = $(this);
  const title = el.find('h1, h2, h3, .title, .job-title, a').first().text().trim();
  if (!title) return;
  const companyName = el.find('.company, .company-name').first().text().trim() || null;
  const description = el.find('.description, .job-description, p').first().text().trim() || null;
  const location = el.find('.location, .job-location').first().text().trim() || null;
  const jobTypeRaw = el.find('.type, .job-type').first().text().trim().toLowerCase() || null;
  let jobType = null;
  if (jobTypeRaw) {
    if (jobTypeRaw.includes('full')) jobType = 'full_time';
    else if (jobTypeRaw.includes('part')) jobType = 'part_time';
    else if (jobTypeRaw.includes('contract')) jobType = 'contract';
    else if (jobTypeRaw.includes('intern')) jobType = 'internship';
    else if (jobTypeRaw.includes('remote')) jobType = 'remote';
  }
  const sourceUrl = el.find('a').first().attr('href') || null;
  const postedDateIsoString = el.find('time[datetime]').first().attr('datetime') || null;
  const deadlineIsoString = el.find('.deadline, time[datetime][class*="deadline"]').first().attr('datetime') || null;
  const salaryText = el.find('.salary, .pay').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const match = salaryText.match(/([A-Z]{3})\s*([\d,]+)(?:\s*-\s*([\d,]+))?/i);
    if (match) {
      salaryCurrency = match[1];
      salaryMin = Number(match[2].replace(/,/g, ''));
      if (match[3]) salaryMax = Number(match[3].replace(/,/g, ''));
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