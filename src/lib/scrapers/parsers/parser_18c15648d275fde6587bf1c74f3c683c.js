var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-posting');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1').text().trim() || $(this).find('h2').text().trim();
  if (!job.title) return;
  job.companyName = $(this).find('.company').text().trim() || $(this).find('.organization').text().trim();
  job.description = $(this).find('.job-description').text().trim() || $(this).find('.description').text().trim();
  job.location = $(this).find('.location').text().trim() || $(this).find('.place').text().trim();
  job.jobType = $(this).find('.job-type').text().trim() || $(this).find('.employment-type').text().trim();
  job.sourceUrl = window