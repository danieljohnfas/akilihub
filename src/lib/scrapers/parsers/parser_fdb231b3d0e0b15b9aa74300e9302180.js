const jobContainers = $('.post-type-archive-job_listing .job_listing, .single-job_listing .job_listing');

jobContainers.each((index, jobContainer) => {
  const job = {};
  job.title = $(jobContainer).find('.job-listing-title').text().trim();
  job.companyName = $(jobContainer).find('.company_name').text().trim();
  job.description = $(jobContainer).find('.job_description').text().trim();
  job.location = $(jobContainer).find('.location').text().trim();
  job.jobType = $(jobContainer).find('.job_type').text().trim().toLowerCase();
  job.sourceUrl = $(jobContainer).find('.job-listing-title a').attr('href');
  job.postedDateIsoString = $(jobContainer).find('.date').text().trim();
  job.deadlineIsoString = $(jobContainer).find('.application Deadline').text().trim();
  const salaryText = $(jobContainer).find('.salary').text().trim();
  if (salaryText) {
    const salaryMatch = salaryText.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(\w+)/);
    if (salaryMatch) {
      job.salaryMin = parseFloat(salaryMatch[1]);
      job.salaryMax = parseFloat(salaryMatch[2]);
      job.salaryCurrency = salaryMatch[3].toUpperCase();
    }
  }
  result.push(job);
});