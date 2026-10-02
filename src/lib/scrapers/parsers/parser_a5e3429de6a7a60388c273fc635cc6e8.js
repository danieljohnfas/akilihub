const jobListings = $('.job-listing'); // Assuming job listings are within elements with class 'job-listing'
jobListings.each((index, element) => {
  const job = {};
  job.title = $(element).find('.job-title').text().trim();
  job.companyName = $(element).find('.company-name').text().trim();
  job.description = $(element).find('.job-description').text().trim();
  job.location = $(element).find('.job-location').text().trim();
  job.jobType = $(element).find('.job-type').text().trim().toLowerCase().replace(' ', '_');
  job.sourceUrl = $(element).find('.job-link').attr('href');
  job.postedDateIsoString = $(element).find('.posted-date').attr('data-date');
  job.deadlineIsoString = $(element).find('.deadline-date').attr('data-date');
  const salaryText = $(element).find('.salary').text().trim();
  const salaryParts = salaryText.match(/(\d+)\s*-\s*(\d+)\s*(\w+)/);
  if (salaryParts) {
    job.salaryMin = parseInt(salaryParts[1], 10);
    job.salaryMax = parseInt(salaryParts[2], 10);
    job.salaryCurrency = salaryParts[3].toUpperCase();
  }
  result.push(job);
});