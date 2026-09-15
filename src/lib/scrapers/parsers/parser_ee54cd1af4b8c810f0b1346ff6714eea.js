var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('article.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.item');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry');
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
  var companyName = $(this).find('span.company, span.organization').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }
  var description = $(this