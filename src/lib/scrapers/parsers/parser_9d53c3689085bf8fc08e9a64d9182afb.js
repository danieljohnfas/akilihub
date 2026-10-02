var jobContainers = $('div.job-listing');
if (jobContainers.length === 0) {
  var jobContainers = $('div.job');
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
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h2.job-title').text().trim();
  if (!job.title) return;
  job.companyName = $(this).find('span.company-name').text().trim();
  job.description = $(this).find('div.job-description').text().trim();
  job.location = $(this).find('span.location').text().trim();
  job.jobType = $(this).find('span.job-type').text().trim();
  job.sourceUrl = 'https://exa.ai' + $(this).find('a.job-link').attr('href');
  job.postedDateIsoString = $(this).find('span.posted-date').attr('datetime');
  job.deadlineIsoString = $(