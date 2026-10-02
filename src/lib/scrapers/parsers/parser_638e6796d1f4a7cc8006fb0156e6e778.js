var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
    if (title) {
      job.title = title;
    }
    var companyName = $(this).find('strong:contains("Wizara")').text().trim();
    if (companyName) {
      job.companyName = companyName;
    }
    var description = $(this).find('p').first().text().trim();
    if (description) {
      job.description = description;
    }
    var location = $(this).find('strong:contains("Dodoma")').text().trim();
    if (location) {
      job.location = location;
    }
    var sourceUrl = $('meta[property="og:url"]').attr('content');
    if (sourceUrl) {
      job.sourceUrl = sourceUrl;
    }
    var postedDateIsoString = $('meta[property="article:published_time"]').