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

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1').text().trim();
  if (!job.title) {
    job.title = $(this).find('h2').text().trim();
  }
  if (job.title) {
    job.companyName = $(this).find('span.company').text().trim();
    if (!job.companyName) {
      job.companyName = $(this).find('span.organization').text().trim();
    }
    job.description = $(this).find('div.description').text().trim();
    if (!job.description) {
      job.description = $(this).find('div.job-description').text().trim();
    }
    job.location = $(this).find('span.location').text().trim();
    if (!job.location) {
      job.location = $(this).find('span.job-location').text().trim();
    }