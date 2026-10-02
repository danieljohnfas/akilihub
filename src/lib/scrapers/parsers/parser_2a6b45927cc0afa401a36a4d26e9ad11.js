const jobContainers = $('.job-listing');

if (jobContainers.length === 0) {
  // No job listings found, leave result array empty
  return;
}

jobContainers.each((index, jobContainer) => {
  const job = {};

  job.title = $(jobContainer).find('.job-title').text().trim();
  job.companyName = $(jobContainer).find('.company-name').text().trim();
  job.description = $(jobContainer).find('.job-description').text().trim();
  job.location = $(jobContainer).find('.job-location').text().trim();
  job.jobType = $(jobContainer).find('.job-type').text().trim().toLowerCase();
  job.sourceUrl = $(jobContainer).find('.job-link').attr('href');
  job.postedDateIsoString = $(jobContainer).find('.posted-date').data('iso');
  job.deadlineIsoString = $(jobContainer).find('.deadline').data('iso');
  job.salaryMin = parseInt($(jobContainer).find('.salary-min').text().replace(/[\$,]/g, ''), 10);
  job.salaryMax = parseInt($(jobContainer).find('.salary-max').text().replace(/[\$,]/g, ''), 10);
  job.salaryCurrency = $(jobContainer).find('.salary-currency').text().trim();

  result.push(job);
});