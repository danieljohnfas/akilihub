var jobContainer = $('article');
if (jobContainer.length > 0) {
  var job = {};
  job.title = $('h1.entry-title').text().trim();
  job.companyName = $('span.author').text().trim();
  job.description = $('div.entry-content').html();
  job.location = $('span.location').text().trim();
  job.sourceUrl = $('meta[property="og:url"]').attr('content');
  job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
  result.push(job);
}