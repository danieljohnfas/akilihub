var jobContainers = $('div.views-row');
if (jobContainers.length === 0) {
  jobContainers = $('article', 'main');
  if (jobContainers.length === 0) {
    jobContainers = $('div.job-listing');
    if (jobContainers.length === 0) {
      return;
    }
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $('h2', this).text().trim();
  if (!job.title) return;
  
  job.companyName = $('span.organization', this).text().trim() || $('span.company', this).text().trim();
  job.description = $('div.job-description', this).text().trim() || $('div.description', this).text().trim();
  job.location = $('span.location', this).text().trim() || $('span.place', this).text().trim();
  job.jobType = $('span.job-type', this).text().trim() || $('span.type', this).text().trim();
  job.sourceUrl = $('a', this).attr('href');
  job.postedDateIsoString = $('span.date-posted', this).attr('datetime') || $('time', this).attr('datetime');
  job.deadlineIso