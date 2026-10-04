const jobContainer = $('div.job-details');
if (jobContainer.length === 0) {
  result = [];
} else {
  const job = {};
  job.title = $('title').text().trim();
  job.companyName = $('meta[property="og:site_name"]').attr('content');
  job.description = $('meta[property="og:description"]').attr('content');
  job.location = job.title.match(/in (.*)/)[1];
  job.sourceUrl = $('meta[property="og:url"]').attr('content');
  result.push(job);
}