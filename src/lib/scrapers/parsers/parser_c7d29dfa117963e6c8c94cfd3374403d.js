var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
  if (jobContainers.length === 0) {
    jobContainers = $('div.entry-content');
    if (jobContainers.length === 0) {
      jobContainers = $('div.post');
      if (jobContainers.length === 0) {
        jobContainers = $('div.content');
      }
    }
  }
}
jobContainers.each(function() {
  var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (!title) return;
  var job = {
    title: title,
    sourceUrl: $('meta[property="og:url"]').attr('content'),
  };
  var description = $(this).find('p').text().trim();
  if (description) job.description = description;
  var companyName = $('meta[property="og:site_name"]').attr('content');
  if (companyName) job.companyName = companyName;
  result.push(job);
});