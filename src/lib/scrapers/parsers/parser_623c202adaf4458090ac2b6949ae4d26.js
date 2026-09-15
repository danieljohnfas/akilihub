var jobContainers = $('div.post-body.entry-content');
if (jobContainers.length === 0) {
  jobContainers = $('article.post');
  if (jobContainers.length === 0) {
    jobContainers = $('div.post');
  }
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h2, h3, h1').first();
  if (title.length > 0) {
    job.title = title.text().trim();
    var companyName = $(this).find('span.author, span.publisher, b').first();
    if (companyName.length > 0) {
      job.companyName = companyName.text().trim();
    }
    var description = $(this).find('div.job-description, div.post-body, div.entry-content').first();
    if (description.length > 0) {
      job.description = description.text().trim();
    }
    var location = $(this).find('span.location, span.place').first();
    if (location.length > 0) {
      job.location = location.text().trim();
    }
    var jobType = $(this).find('span.type, span.category').first();
    if (jobType.length > 0) {
      job