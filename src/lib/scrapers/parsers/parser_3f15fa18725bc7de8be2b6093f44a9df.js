var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
  if (jobContainers.length === 0) {
    jobContainers = $('div.job-listing');
    if (jobContainers.length === 0) {
      jobContainers = $('div.job-posting');
      if (jobContainers.length === 0) {
        jobContainers = $('div.vacancy');
        if (jobContainers.length === 0) {
          jobContainers = $('div.listing');
          if (jobContainers.length === 0) {
            result = [];
            return;
          }
        }
      }
    }
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1').text() || $(this).find('h2').text();
  if (!job.title) return;
  job.companyName = $(this).find('span.company').text() || $(this).find('span.organization').text();
  job.description = $(this).find('div.description').text() || $(this).find('div.summary').text();
  job.location = $(this).find('span.location').text();
  job.jobType = $(this).find('