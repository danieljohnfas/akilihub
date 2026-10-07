var jobContainers = $('div.post-body.entry-content');
if (jobContainers.length === 0) {
  jobContainers = $('article');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post-body');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h2, h3, b').first().text().trim();
  if (title) {
    job.title = title;
  }
  var companyName = $('title').text().trim().split(' at ')[1];
  if (companyName) {
    job.companyName = companyName;
  }
  var description = $(this).find('p').first().text().trim();
  if (description) {
    job.description = description;
  }
  var sourceUrl = $('link[rel="canonical"]').attr('href');
  if (sourceUrl) {
    job.sourceUrl = sourceUrl;
  }
  result.push(job);
});