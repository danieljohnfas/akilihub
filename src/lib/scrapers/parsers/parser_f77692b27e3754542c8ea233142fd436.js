const containers = $('.job, .job-listing, .listing, .career-item');
containers.each(function () {
  const el = $(this);
  const title = el.find('h1, h2, h3, .title, a').first().text().trim();
  if (!title) return;
  const job = { title };
  const company = el.find('.company, .company-name').first().text().trim();
  if (company) job.companyName = company;
  const description = el.find('.description, .job-description, p').first().text().trim();
  if (description) job.description = description;
  const location = el.find('.location, .job-location').first().text().trim();
  if (location) job.location = location;
  const typeText = el.find('.type, .job-type').first().text().trim().toLowerCase();
  if (typeText) {
    if (/full.?time/.test(typeText)) job.jobType = 'full_time';
    else if (/part.?time/.test(typeText)) job.jobType = 'part_time';
    else if (/contract/.test(typeText)) job.jobType = 'contract';
    else if (/intern/.test(typeText)) job.jobType = 'internship';
    else if (/remote/.test(typeText)) job.jobType = 'remote';
  }
  const link = el.find('a').first().attr('href');
  if (link) job.sourceUrl = link;
  const posted = el.find('time[datetime]').first().attr('datetime');
  if (posted) job.postedDateIsoString = posted;
  const deadline = el.find('.deadline time[datetime]').first().attr('datetime');
  if (deadline) job.deadlineIsoString = deadline;
  const salaryText = el.find('.salary').first().text();
  const salaryMatch = salaryText && salaryText.match(/([A-Z]{3})?\s?([\d,]+)\s*[-–]\s*([A-Z]{3})?\s?([\d,]+)/);
  if (salaryMatch) {
    const currency = salaryMatch[1] || salaryMatch[3] || '';
    const min = parseFloat(salaryMatch[2].replace(/,/g, ''));
    const max = parseFloat(salaryMatch[4].replace(/,/g, ''));
    if (!isNaN(min)) job.salaryMin = min;
    if (!isNaN(max)) job.salaryMax = max;
    if (currency) job.salaryCurrency = currency;
  }
  result.push(job);
});