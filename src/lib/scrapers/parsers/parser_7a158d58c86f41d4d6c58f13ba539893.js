var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-posting');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.listing');
}

jobContainers.each(function() {
  var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (!title) return;
  var companyName = $(this).find('span.company, span.organization').text().trim();
  var description = $(this).find('div.description, div.job-description').text().trim();
  var location = $(this).find('span.location, span.place').text().trim();
  var jobType = $(this).find('span.type, span.job-type').text().trim();
  var sourceUrl = $(this).find('a.source-url, a.job-url').attr('href');