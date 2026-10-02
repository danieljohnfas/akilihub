const jobs = $('div.job-listing');
jobs.each((index, jobElement) => {
  const job = {};
  job.title = $(jobElement).find('h2.job-title').text().trim();
  job.companyName = $(jobElement).find('div.company-name').text().trim();
  job.description = $(jobElement).find('div.job-description').text().trim();
  job.location = $(jobElement).find('div.job-location').text().trim();
  job.jobType = $(jobElement).find('div.job-type').text().trim().toLowerCase();
  job.sourceUrl = $(jobElement).find('a.job-link').attr('href');
  job.postedDateIsoString = $(jobElement).find('div.posted-date').data('iso-date');
  job.deadlineIsoString = $(jobElement).find('div.deadline').data('iso-date');
  const salaryText = $(jobElement).find('div.salary').text().trim();
  const salaryMatch = salaryText.match(/(\d+)-(\d+)\s*([A-Z]{3})/);
  if (salaryMatch) {
    job.salaryMin = parseInt(salaryMatch[1]);
    job.salaryMax = parseInt(salaryMatch[2]);
    job.salaryCurrency = salaryMatch[3];
  }
  if (job.title) {
    result.push(job);
  }
});