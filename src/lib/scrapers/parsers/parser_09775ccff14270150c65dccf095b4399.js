var jobContainers = $('div.job-details');
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-posting');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1.job-title').text().trim() || $(this).find('h2.job-title').text().trim();
  if (!job.title) return;
  job.companyName = $(this).find('span.company-name').text().trim() || $(this).find('span.company').text().trim();
  job.description = $(this).find('div.job-description').text().trim() || $(this).find('div.description').text().trim();
  job.location = $(this).find('span.location').text().trim() || $(this).find('span.place').text().trim();
  var jobTypeText = $(this).find('span.job-type').text().trim() || $(this).