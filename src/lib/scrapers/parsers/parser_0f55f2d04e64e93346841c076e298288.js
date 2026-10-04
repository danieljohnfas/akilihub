var jobContainers = $('article');
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h2').text().trim();
    if (job.title) {
      job.companyName = $(this).find('.company').text().trim();
      job.location = $(this).find('.location').text().trim();
      job.description = $(this).find('.entry-content').text().trim();
      job.sourceUrl = 'https://mabumbe.tz' + $(this).find('a').attr('href');
      result.push(job);
    }
  });
}