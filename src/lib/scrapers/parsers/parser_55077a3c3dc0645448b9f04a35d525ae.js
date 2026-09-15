var jobContainers = $('div.job-listing'); // assuming job listings are in divs with class job-listing

if (jobContainers.length === 0) {
  // if no job listings are found, try to find other common job listing containers
  jobContainers = $('div.job-post');
  if (jobContainers.length === 0) {
    jobContainers = $('div.job-opening');
    if (jobContainers.length === 0) {
      jobContainers = $('div.job-vacancy');
      if (jobContainers.length === 0) {
        jobContainers = $('div.vacancy');
        if (jobContainers.length === 0) {
          jobContainers = $('div.job');
        }
      }
    }
  }
}

if (jobContainers.length === 0) {
  // if still no job listings are found, assume this page does not contain job listings
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h2.job-title').text().trim();
    job.companyName = $(this).find('span.company-name').text().trim();
    job.description = $(this).find('div.job-description').text().trim();