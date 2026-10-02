var jobContainers = $('article');
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1').text().trim();
    job.companyName = $(this).find('span.company').text().trim() || '';
    job.description = $(this).find('div.entry-content').text().trim() || '';
    job.location = $(this).find('span.location').text().trim() || '';
    job.sourceUrl = $('meta[property="og:url"]').attr('content');
    job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
    result.push(job);
  });
}