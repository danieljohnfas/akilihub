const jobContainers = $('.job-listing, .job-vacancy, .job-posting');

jobContainers.each((index, element) => {
  const job = {};

  job.title = $(element).find('.job-title, .job-post-title').text().trim();
  job.companyName = $(element).find('.company-name, .employer-name').text().trim();
  job.description = $(element).find('.job-description, .job-summary').text().trim();
  job.location = $(element).find('.job-location, .location').text().trim();
  job.jobType = $(element).find('.job-type, .employment-type').text().trim().toLowerCase().replace(/\s+/g, '_');
  job.sourceUrl = $(element).find('.job-link, .view-job').attr('href');
  job.postedDateIsoString = $(element).find('.posted-date, .date-posted').text().trim();
  job.deadlineIsoString = $(element).find('.application-deadline, .deadline').text().trim();
  const salaryText = $(element).find('.salary, .pay').text().trim();
  const salaryMatch = salaryText.match(/(\d+)\s*-\s*(\d+)\s*\b(\w+)/);
  if (salaryMatch) {
    job.salaryMin = parseInt(salaryMatch[1], 10);
    job.salaryMax = parseInt(salaryMatch[2], 10);
    job.salaryCurrency = salaryMatch[3].toUpperCase();
  }

  if (job.title) {
    result.push(job);
  }
});