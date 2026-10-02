const containers = $('.job, .job-item, .job-listing, .posting, .career-item, article[data-job-id], li[data-job-id]');

containers.each(function () {
  const el = $(this);
  const title = el.find('h1, h2, .title, a.job-title').first().text().trim();
  if (!title) return;

  const job = { title };

  const company = el.find('.company, .company-name').first().text().trim();
  if (company) job.companyName = company;

  const description = el.find('.description, .job-description, p').first().text().trim();
  if (description) job.description = description;

  const location = el.find('.location, .job-location').first().text().trim();
  if (location) job.location = location;

  const typeText = el.find('.type, .job-type').first().text().toLowerCase();
  if (typeText) {
    if (/full.?time/.test(typeText)) job.jobType = 'full_time';
    else if (/part.?time/.test(typeText)) job.jobType = 'part_time';
    else if (/contract/.test(typeText)) job.jobType = 'contract';
    else if (/intern/.test(typeText)) job.jobType = 'internship';
    else if (/remote/.test(typeText)) job.jobType = 'remote';
  }

  const source = el.find('a[href]').first().attr('href');
  if (source) job.sourceUrl = source;

  const postedRaw = el.find('.date-posted, time[datetime]').first().attr('datetime') || el.find('.date-posted').first().text().trim();
  if (postedRaw) {
    const d = new Date(postedRaw);
    if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
  }

  const deadlineRaw = el.find('.deadline, .date-close').first().attr('datetime') || el.find('.deadline').first().text().trim();
  if (deadlineRaw) {
    const d = new Date(deadlineRaw);
    if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
  }

  const salaryText = el.find('.salary, .compensation').first().text();
  if (salaryText) {
    const rangeMatch = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)\s?[-–]\s?([A-Z]{3})?\s?(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      job.salaryCurrency = rangeMatch[1] || rangeMatch[3] || '';
      job.salaryMin = parseFloat(rangeMatch[2]);
      job.salaryMax = parseFloat(rangeMatch[4]);
    } else {
      const singleMatch = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)/);
      if (singleMatch) {
        job.salaryCurrency = singleMatch[1] || '';
        job.salaryMin = parseFloat(singleMatch[2]);
      }
    }
  }

  result.push(job);
});