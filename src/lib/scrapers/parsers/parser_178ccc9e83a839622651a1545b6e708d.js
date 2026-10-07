var jobContainers = $('article');
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1.entry-title').text().trim();
    if (job.title) {
      job.companyName = $(this).find('span.author').text().trim();
      job.description = $(this).find('div.entry-content').text().trim();
      var locationText = $(this).find('span.location').text().trim();
      if (locationText) {
        job.location = locationText;
      }
      var jobTypeText = $(this).find('span.job-type').text().trim();
      if (jobTypeText) {
        job.jobType = jobTypeText.toLowerCase();
      }
      job.sourceUrl = window.location.href;
      var postedDateText = $(this).find('span.posted-date').text().trim();
      if (postedDateText) {
        job.postedDateIsoString = new Date(postedDateText).toISOString();
      }
      var deadlineText = $(this).find('span.deadline').text().trim();
      if (deadlineText) {
        job.deadlineIsoString = new Date(deadlineText).toISOString();