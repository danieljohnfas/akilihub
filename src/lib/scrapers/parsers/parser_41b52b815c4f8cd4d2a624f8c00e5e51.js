var jobContainers = $('div.job-listing');
if (jobContainers.length === 0) {
  var jobContainers = $('article.job');
  if (jobContainers.length === 0) {
    var jobContainers = $('li.job');
    if (jobContainers.length === 0) {
      result = [];
      return;
    }
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h2.job-title').text().trim();
  if (!job.title) {
    job.title = $(this).find('h1.job-title').text().trim();
    if (!job.title) return;
  }
  job.companyName = $(this).find('span.company-name').text().trim();
  if (!job.companyName) {
    job.companyName = $(this).find('span.org-name').text().trim();
  }
  job.description = $(this).find('div.job-description').text().trim();
  if (!job.description) {
    job.description = $(this).find('div.job-summary').text().trim();
  }
  job.location = $(this).find('span.job-location').text().trim();
  if (!job.location) {
    job.location = $(this).