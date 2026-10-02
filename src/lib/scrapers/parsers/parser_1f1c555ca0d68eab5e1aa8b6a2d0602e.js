var jobContainers = $('div.job-listing, div.job-posting, div.job-opening, div.vacancy, div.employment-opportunity');
if (jobContainers.length === 0) {
  var jobContainers = $('article.job, div.job, div.position, div.listing');
  if (jobContainers.length === 0) {
    result = [];
    return;
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1, h2, h3, .job-title').text().trim();
  if (!job.title) return;
  
  job.companyName = $(this).find('.company-name, .employer, .organization').text().trim();
  job.description = $(this).find('.job-description, .description, .job-summary').text().trim();
  job.location = $(this).find('.location, .job-location, .place').text().trim();
  job.jobType = $(this).find('.job-type, .employment-type, .category').text().trim().toLowerCase();
  if (job.jobType === 'full time' || job.jobType === 'full-time') job.jobType = 'full_time';
  else if (job.jobType ===