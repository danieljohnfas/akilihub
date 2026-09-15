var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length === 0) {
  jobContainers = $('.job-posting');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    var json = $(this).html();
    if (json) {
      json = JSON.parse(json);
      job.title = json.title;
      job.description = json.description;
    } else {
      var title = $(this).find('h2').text();
      if (title) {
        job.title = title;
      }
      var description = $(this).find('p').text();
      if (description) {
        job.description = description;
      }
    }
    var location = $(this).find('.location').text();
    if (location) {
      job.location = location;
    }
    var companyName = $(this).find('.company').text();
    if (companyName) {
      job.companyName = companyName;
    }
    var jobType = $(this).find('.job-type').text();
    if (jobType) {
      job.jobType = jobType;
    }
    var sourceUrl = $(this).