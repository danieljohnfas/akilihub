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
  job.title = $(this).find('h1, h2, h3').first().text().trim();
  if (!job.title) {
    job.title = $(this).find('a').first().text().trim();
  }
  if (!job.title) {
    return;
  }
  job.companyName = $(this).find('span.company').text().trim() || $(this).find('span.organization').text().trim();
  job.description = $(this).find('div.description, div.job-description').