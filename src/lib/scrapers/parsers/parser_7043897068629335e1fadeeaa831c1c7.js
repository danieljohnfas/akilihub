var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('article');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.main');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.content');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1, h2, h3').first().text().trim();
  if (title) {
    job.title = title;
  }
  var companyName = $(this).find('span.company, span.org').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }
  var description = $(this).find('div.job-description, div.description').text().trim();
  if (description) {
    job.description = description;
  }
  var location = $(this).find('span.location, span.place').text().trim();
  if (location) {
    job.location = location;
  }
  var jobType = $(this).find('span.type, span.category').text().trim();