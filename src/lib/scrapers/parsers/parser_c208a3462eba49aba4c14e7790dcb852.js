result = [];

const jobListings = $('.job-listing'); // Assuming the job listings are within elements with class 'job-listing'

jobListings.each((index, jobElement) => {
  const job = {};

  job.title = $(jobElement).find('.job-title').text().trim();
  job.companyName = $(jobElement).find('.company-name').text().trim();
  job.description = $(jobElement).find('.job-description').text().trim();
  job.location = $(jobElement).find('.job-location').text().trim();
  job.jobType = $(jobElement).find('.job-type').text().trim();
  job.sourceUrl = $(jobElement).find('.job-link').attr('href').trim();
  job.postedDateIsoString = $(jobElement).find('.posted-date').attr('data-date').trim();
  job.deadlineIsoString = $(jobElement).find('.deadline-date').attr('data-date').trim();
  job.salaryMin = parseFloat($(jobElement).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(jobElement).find('.salary-max').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryCurrency = $(jobElement).find('.salary-currency').text().trim();

  result.push(job);
});