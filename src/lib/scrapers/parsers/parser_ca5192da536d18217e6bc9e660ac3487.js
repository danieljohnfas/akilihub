const jobContainers = $('.job-listing');

jobContainers.each((index, element) => {
  const job = {};
  job.title = $(element).find('.job-title').text().trim();
  job.companyName = $(element).find('.company-name').text().trim();
  job.description = $(element).find('.job-description').text().trim();
  job.location = $(element).find('.job-location').text().trim();
  job.jobType = $(element).find('.job-type').text().trim().toLowerCase();
  job.sourceUrl = $(element).find('.job-link').attr('href');
  job.postedDateIsoString = $(element).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(element).find('.deadline').attr('datetime');
  const salaryText = $(element).find('.salary').text().trim();
  if (salaryText) {
    const salaryMatch = salaryText.match(/(\d+)-(\d+)\s*([A-Za-z]+)/);
    if (salaryMatch) {
      job.salaryMin = parseInt(salaryMatch[1], 10);
      job.salaryMax = parseInt(salaryMatch[2], 10);
      job.salaryCurrency = salaryMatch[3];
    }
  }
  result.push(job);
});