var jobContainers = $('a.job-listing');
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('li.job-listing');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h2').text().trim();
    if (job.title) {
      job.companyName = $(this).find('span.company').text().trim();
      job.location = $(this).find('span.location').text().trim();
      job.sourceUrl = $(this).attr('href');
      result.push(job);
    }
  });
}