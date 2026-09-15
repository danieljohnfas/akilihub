var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('article.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $('title').text().trim();
    job.companyName = 'Maternity Africa';
    job.description = $(this).text().trim();
    job.location = 'Arusha';
    job.sourceUrl = $('meta[property="og:url"]').attr('content');
    result.push(job);
  });
}