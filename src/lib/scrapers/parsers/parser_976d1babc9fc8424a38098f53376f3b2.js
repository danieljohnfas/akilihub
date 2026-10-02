const jobListings = $('.job-listing');

jobListings.each((index, element) => {
  const job = {};
  job.title = $(element).find('.job-title').text().trim();
  job.companyName = $(element).find('.company-name').text().trim();
  job.description = $(element).find('.job-description').text().trim();
  job.location = $(element).find('.job-location').text().trim();
  job.jobType = $(element).find('.job-type').text().trim().toLowerCase().replace(/ /g, '_');
  job.sourceUrl = $(element).find('.job-link').attr('href');
  job.postedDateIsoString = $(element).find('.job-posted-date').data('iso-date');
  job.deadlineIsoString = $(element).find('.job-deadline').data('iso-date');
  job.salaryMin = parseInt($(element).find('.salary-min').text().trim().replace(/[^0-9]/g, ''), 10);
  job.salaryMax = parseInt($(element).find('.salary-max').text().trim().replace(/[^0-9]/g, ''), 10);
  job.salaryCurrency = $(element).find('.salary-currency').text().trim();

  if (job.title && job.companyName) {
    result.push(job);
  }
});