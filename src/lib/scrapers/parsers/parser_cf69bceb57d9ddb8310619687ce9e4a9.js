var jobContainers = $('div.post-body.entry-content');
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('article');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post-body');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h2, h3, h4, h5, h6').first().text().trim();
    if (title) {
      job.title = title;
    }
    var companyName = $(this).find('span.company, span.organization').text().trim();
    if (companyName) {
      job.companyName = companyName;
    }
    var description = $(this).find('div.job-description, div.description').text().trim();
    if (description) {
      job.description = description;
    }
    var location = $(this).