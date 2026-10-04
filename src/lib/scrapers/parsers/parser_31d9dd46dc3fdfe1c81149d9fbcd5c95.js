var jobContainers = $('article');
if (jobContainers.length === 0) {
  var jobContainers = $('div.entry-content').find('p').filter(function() {
    return $(this).text().trim().length > 0;
  });
}
jobContainers.each(function() {
  var job = {};
  var text = $(this).text().trim();
  var lines = text.split('\n');
  var title = '';
  var companyName = '';
  var description = '';
  var location = '';
  var jobType = '';
  var sourceUrl = '';
  var postedDateIsoString = '';
  var deadlineIsoString = '';
  var salaryMin = 0;
  var salaryMax = 0;
  var salaryCurrency = '';
  lines.forEach(function(line) {
    if (line.trim().length > 0) {
      if (title === '') {
        title = line.trim();
        job.title = title;
      } else if (companyName === '') {
        companyName = line.trim();
        job.companyName = companyName;
      } else if (location === '') {
        location = line.trim();
        job.location = location;
      } else if (jobType === '') {
        jobType = line.trim();
        job.jobType =