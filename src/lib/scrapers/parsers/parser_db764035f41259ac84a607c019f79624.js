var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1.entry-title').text().trim();
  if (title) {
    job.title = title;
    var companyName = $(this).find('strong').first().text().trim();
    if (companyName) {
      job.companyName = companyName;
    }
    var description = $(this).find('div.entry-content').html().trim();
    if (description) {
      job.description = description;
    }
    var location = $(this).find('strong:contains("Location:")').next().text().trim();
    if (location) {
      job.location = location;
    }
    var sourceUrl = $('meta[property="og:url"]').attr('content');
    if (sourceUrl) {
      job.sourceUrl = sourceUrl;
    }
    var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
    if (postedDateIsoString) {
      job.postedDateIsoString = postedDateIsoString;
    }
    result.push(job);
  }
});