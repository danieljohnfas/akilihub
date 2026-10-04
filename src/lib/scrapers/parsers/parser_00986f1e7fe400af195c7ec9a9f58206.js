var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  var jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('*');
} else {
  jobContainers.each(function() {
    var job = {};
    var text = $(this).text();
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith('JOB VACANCIES!')) {
        continue;
      }
      var match = line.match(/([0-9]+)\.?\s*(.*)/);
      if (match) {
        job.title = match[2].trim();
        var nextLine = lines[i + 1];
        if (nextLine) {
          var locationMatch = nextLine.match(/Location:\s*(.*)/);
          if (locationMatch) {
            job.location = locationMatch[1].trim();
          }
          var sectorMatch = nextLine.match(/Sector:\s*(.*)/);
          if (sectorMatch) {
            job.companyName = sectorMatch[1].trim();
          }
          var deadlineMatch =