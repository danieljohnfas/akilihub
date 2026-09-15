var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
  if (jobContainers.length === 0) {
    jobContainers = $('div.job-listing');
    if (jobContainers.length === 0) {
      jobContainers = $('div.job-posting');
      if (jobContainers.length === 0) {
        jobContainers = $('div.vacancy');
      }
    }
  }
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
    if (!job.title) {
      return;
    }
    job.companyName = $(this).find('span.company, span.organization').text().trim();
    job.description = $(this).find('div.description, div.job-description').text().trim();
    job.location = $(this).find('span.location, span.place').text().trim();
    job.jobType = $(this).find('span.job-type, span.employment-type').text().trim();
    job.sourceUrl =