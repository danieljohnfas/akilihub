var jobContainers = $('div.post-body.entry-content');
if (jobContainers.length === 0) {
  jobContainers = $('div.post-body');
}
if (jobContainers.length === 0) {
  jobContainers = $('article.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h2, h3, h4, h5, h6').first();
  if (title.length > 0) {
    job.title = title.text().trim();
  } else {
    return true;
  }
  
  var text = $(this).text();
  var lines = text.split('\n');
  var companyName = '';
  var location = '';
  var jobType = '';
  var sourceUrl = '';
  var postedDateIsoString = '';
  var deadlineIsoString = '';
  var salaryMin = null;
  var salaryMax = null;
  var salaryCurrency = '';
  var description = '';
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('Company:')) {
      companyName =