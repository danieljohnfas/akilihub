var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('article.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.main');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h2').first().text().trim();
  if (title) {
    job.title = title;
    var text = $(this).text().trim();
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith('Company:')) {
        job.companyName = line.substring(9).trim();
      } else if (line.startsWith('Location:')) {
        job.location = line.substring(10).trim();
      } else if (line.startsWith('Job Type:')) {
        job.jobType = line.substring(10).trim().toLowerCase();
      } else if (line.startsWith('Deadline:'))