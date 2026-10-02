result = [];
const jobListings = $('.single-job-listing, .job-listing');

jobListings.each((index, element) => {
  const job = {};
  job.title = $(element).find('.job-title, .job_listings .position').text().trim();
  job.companyName = $(element).find('.company-name, .job_listings .company').text().trim();
  job.description = $(element).find('.job-description, .job_listings .description').text().trim();
  job.location = $(element).find('.job-location, .job_listings .location').text().trim();
  
  const jobTypeText = $(element).find('.job-type, .job_listings .job-type').text().trim().toLowerCase();
  if (jobTypeText.includes('full time')) {
    job.jobType = 'full_time';
  } else if (jobTypeText.includes('part time')) {
    job.jobType = 'part_time';
  } else if (jobTypeText.includes('contract')) {
    job.jobType = 'contract';
  } else if (jobTypeText.includes('internship')) {
    job.jobType = 'internship';
  } else if (jobTypeText.includes('remote')) {
    job.jobType = 'remote';
  }

  job.sourceUrl = $(element).find('.job-link, .job_listings .job-title a').attr('href');
  job.postedDateIsoString = $(element).find('.job-post-date, .job_listings .date').attr('datetime');
  job.deadlineIsoString = $(element).find('.job-deadline, .job_listings .deadline').attr('datetime');
  
  const salaryText = $(element).find('.job-salary, .job_listings .salary').text().trim();
  const salaryMatch = salaryText.match(/(\d+)[\.\,]*(\d*)[ ]*[-–][ ]*(\d+)[\.\,]*(\d*)/);
  if (salaryMatch) {
    job.salaryMin = parseFloat(salaryMatch[1].replace(/[\.\,]/, '') + (salaryMatch[2] ? '.' + salaryMatch[2] : ''));
    job.salaryMax = parseFloat(salaryMatch[3].replace(/[\.\,]/, '') + (salaryMatch[4] ? '.' + salaryMatch[4] : ''));
  }
  job.salaryCurrency = salaryText.match(/[A-Z]{3}/)?.[0] || '';

  result.push(job);
});