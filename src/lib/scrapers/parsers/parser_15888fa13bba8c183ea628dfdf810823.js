var jobContainers = $('div.job-listing');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
  if (jobContainers.length === 0) {
    jobContainers = $('div.job-item');
    if (jobContainers.length === 0) {
      jobContainers = $('div.job-posting');
      if (jobContainers.length === 0) {
        jobContainers = $('div.job-opening');
        if (jobContainers.length === 0) {
          result = [];
          return;
        }
      }
    }
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h2.job-title').text().trim() || $(this).find('h3.job-title').text().trim();
  job.companyName = $(this).find('span.company-name').text().trim() || $(this).find('span.company').text().trim();
  job.description = $(this).find('div.job-description').text().trim() || $(this).find('div.job-summary').text().trim();
  job.location = $(this).find('span.location').text().trim() || $(this).find('span.job-location').text().trim();