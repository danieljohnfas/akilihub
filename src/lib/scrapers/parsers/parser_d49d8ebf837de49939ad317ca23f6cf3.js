var jobContainer = $('div.post-body');
if (jobContainer.length === 0) {
  result = [];
} else {
  var job = {};
  job.title = $('title').text().trim();
  job.companyName = $('meta[name="description"]').attr('content').split('at')[1].trim();
  job.description = jobContainer.text().trim();
  job.sourceUrl = $('link[rel="canonical"]').attr('href');
  result.push(job);
}