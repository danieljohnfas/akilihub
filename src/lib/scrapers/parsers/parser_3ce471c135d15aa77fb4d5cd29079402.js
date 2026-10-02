const jobContainers = $('div.job-listing');

jobContainers.each((index, element) => {
  const job = {};
  job.title = $(element).find('h2.job-title').text().trim();
  job.companyName = $(element).find('div.company-name').text().trim();
  job.description = $(element).find('div.job-description').text().trim();
  job.location = $(element).find('div.job-location').text().trim();
  job.jobType = $(element).find('div.job-type').text().trim().toLowerCase().replace(/\s+/g, '_');
  job.sourceUrl = $(element).find('a.job-link').attr('href');
  job.postedDateIsoString = $(element).find('div.posted-date').text().trim();
  job.deadlineIsoString = $(element).find('div.deadline').text().trim();
  job.salaryMin = parseInt($(element).find('div.salary-range').text().trim().split('-')[0].replace(/[^0-9]/g, ''), 10);
  job.salaryMax = parseInt($(element).find('div.salary-range').text().trim().split('-')[1].replace(/[^0-9]/g, ''), 10);
  job.salaryCurrency = $(element).find('div.salary-currency').text().trim();

  if (job.title) {
    result.push(job);
  }
});