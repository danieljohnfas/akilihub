var jobContainers = $('div.job-container, div.job-listing, div.job-posting, div.job-opening, div.job-vacancy, div.job-advertisement');
if (jobContainers.length === 0) {
  var jobContainers = $('article, div.card, div.post, div.listing');
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
    var companyName = $(this).find('span.company-name, span.company, span.employer').text().trim();
    if (companyName) {
      job.companyName = companyName;
    }
    var description = $(this).find('div.description, div.job-description, div.job-summary').text().trim();
    if (description) {
      job.description = description;
    }
    var location = $(this).find('span.location, span.job-location, span.work-location').text().trim();
    if (location) {
      job.location = location;
    }