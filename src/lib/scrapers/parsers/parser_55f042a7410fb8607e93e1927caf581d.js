const jobs = $('div.job-listing');

jobs.each((index, element) => {
  const job = {};

  job.title = $(element).find('h2.job-title').text().trim();
  job.companyName = $(element).find('span.company-name').text().trim();
  job.description = $(element).find('div.job-description').text().trim();
  job.location = $(element).find('span.location').text().trim();
  job.jobType = $(element).find('span.job-type').text().trim().toLowerCase().replace(/ /g, '_');
  job.sourceUrl = $(element).find('a.job-link').attr('href');
  job.postedDateIsoString = $(element).find('span.posted-date').attr('data-date');
  job.deadlineIsoString = $(element).find('span.deadline').attr('data-date');
  job.salaryMin = parseInt($(element).find('span.salary-min').text().replace(/[^0-9]/g, ''), 10);
  job.salaryMax = parseInt($(element).find('span.salary-max').text().replace(/[^0-9]/g, ''), 10);
  job.salaryCurrency = $(element).find('span.salary-currency').text().trim();

  // Ensure all required fields are present
  if (job.title) {
    result.push(job);
  }
});