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
  var title = $(this).find('h1.entry-title').text().trim();
  if (title) {
    job.title = title;
  }
  var companyName = $(this).find('span.company').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }
  var description = $(this).find('div.entry-content').text().trim();
  if (description) {
    job.description = description;
  }
  var location = $(this).find('span.location').text().trim();
  if (location) {
    job.location = location;
  }
  var jobType = $(this).find('span.job-type').text().trim();
  if (jobType) {
    job.jobType = jobType.toLowerCase();
  }
  var sourceUrl = $(this).find('a.url').attr('href