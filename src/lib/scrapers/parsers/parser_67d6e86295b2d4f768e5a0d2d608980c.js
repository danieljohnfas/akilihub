const jobContainers = $('div.job-listing');

if (jobContainers.length === 0) {
  return;
}

jobContainers.each(function() {
  const job = {};

  job.title = $(this).find('h2.job-title').text().trim();
  if (!job.title) return;

  job.companyName = $(this).find('span.company-name').text().trim();
  job.description = $(this).find('div.job-description').text().trim();
  job.location = $(this).find('span.location').text().trim();
  job.jobType = $(this).find('span.job-type').text().trim();
  job.sourceUrl = $(this).find('a.job-url').attr('href');
  job.postedDateIsoString = $(this).find('span.posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('span.deadline').attr('datetime');
  job.salaryMin = $(this).find('span.salary-min').text().trim();
  job.salaryMax = $(this).find('span.salary-max').text().trim();
  job.salaryCurrency = $(this).find('span.salary-currency').text().trim();

  result.push(job);
});