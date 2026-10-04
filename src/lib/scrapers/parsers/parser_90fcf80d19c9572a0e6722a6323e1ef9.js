var jobContainers = $('article');
if (jobContainers.length === 0) {
  var jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var title = $(this).find('h1').text().trim();
    if (title) {
      var job = {};
      job.title = title;
      var companyName = $(this).find('strong:contains("Company:")').next().text().trim();
      if (companyName) {
        job.companyName = companyName;
      }
      var description = $(this).find('p:not(:has(strong))').text().trim();
      if (description) {
        job.description = description;
      }
      var location = $(this).find('strong:contains("Location:")').next().text().trim();
      if (location) {
        job.location = location;
      }
      var jobType = $(this).find('strong:contains("Job Type:")').next().text().trim();
      if (jobType) {
        job.jobType = jobType.toLowerCase().replace(' ', '_');
      }
      var sourceUrl = $('meta[property="og:url"]').attr('content