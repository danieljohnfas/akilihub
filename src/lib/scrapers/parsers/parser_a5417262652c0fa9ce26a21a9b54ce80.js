var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.main-content');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1.entry-title').text().trim() || $(this).find('h1.post-title').text().trim();
  if (!title) return;
  job.title = title;
  var companyName = $(this).find('span.author').text().trim() || $(this).find('span.publisher').text().trim();
  if (companyName) job.companyName = companyName;
  var description = $(this).find('div.entry-content').text().trim() || $(this).find('div.post-content').text().trim();
  if (description) job.description = description;
  var location = $(this).find('span.location').