result = [];

const jobListings = $('.job-listing'); // Assuming each job listing is in a div with class 'job-listing'

jobListings.each((index, element) => {
  const job = {};

  job.title = $(element).find('.job-title').text().trim();
  job.companyName = $(element).find('.company-name').text().trim();
  job.description = $(element).find('.job-description').text().trim();
  job.location = $(element).find('.job-location').text().trim();
  job.jobType = $(element).find('.job-type').text().trim().toLowerCase().replace(/\s+/g, '_');
  job.sourceUrl = $(element).find('.job-link').attr('href');
  job.postedDateIsoString = $(element).find('.posted-date').attr('data-date');
  job.deadlineIsoString = $(element).find('.deadline-date').attr('data-date');
  job.salaryMin = $(element).find('.salary-min').text().trim().replace(/[^\d.]/g, '') || null;
  job.salaryMax = $(element).find('.salary-max').text().trim().replace(/[^\d.]/g, '') || null;
  job.salaryCurrency = $(element).find('.salary-currency').text().trim();

  if (job.title) { // Only push valid job listings
    result.push(job);
  }
});