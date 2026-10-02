result = [];
const jobListings = $('div.job-listing'); // Assuming job listings are contained within a div with class 'job-listing'

if (jobListings.length === 0) {
  // If no job listings are found, leave the result array empty
  return;
}

jobListings.each((index, element) => {
  const job = {};
  job.title = $(element).find('.job-title').text().trim();
  job.companyName = $(element).find('.company-name').text().trim();
  job.description = $(element).find('.job-description').text().trim();
  job.location = $(element).find('.job-location').text().trim();
  job.jobType = $(element).find('.job-type').text().trim().toLowerCase();
  job.sourceUrl = $(element).find('.job-link').attr('href');
  job.postedDateIsoString = $(element).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(element).find('.deadline').attr('datetime');
  job.salaryMin = parseInt($(element).find('.salary-min').text().trim().replace(/[^0-9]/g, ''), 10);
  job.salaryMax = parseInt($(element).find('.salary-max').text().trim().replace(/[^0-9]/g, ''), 10);
  job.salaryCurrency = $(element).find('.salary-currency').text().trim();

  // Only push the job if the title is present and valid
  if (job.title) {
    result.push(job);
  }
});