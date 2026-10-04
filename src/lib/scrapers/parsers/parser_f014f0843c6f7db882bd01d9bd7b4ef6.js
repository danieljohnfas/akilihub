var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('article');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h2').first().text().trim();
    if (title) {
      job.title = title;
    }
    var text = $(this).text().trim();
    var lines = text.split('\n');
    var companyName = '';
    var location = '';
    var deadline = '';
    var jobType = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.toLowerCase().startsWith('industry:')) {
        var parts = line.split(':');
        if (parts.length > 1) {
          job.companyName = parts[1].trim();
        }
      } else if (line.toLowerCase().startsWith('location:')) {
        var parts =