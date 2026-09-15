var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h1, h2, h3').first().text().trim();
    if (title) {
      job.title = title;
      var companyName = 'Babito Pharmacy';
      job.companyName = companyName;
      var description = $(this).find('p').first().text().trim();
      job.description = description;
      var location = 'Mbeya, Tanzania';
      job.location = location;
      var jobType = 'full_time';
      job.jobType = jobType;
      var sourceUrl = $('meta[property="og:url"]').attr('content');
      job.sourceUrl = sourceUrl;
      var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
      job.postedDateIsoString = postedDateIsoString;
      result.push(job);
    }
  });
}