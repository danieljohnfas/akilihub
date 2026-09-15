var jobContainers = $('article, .job, .job-listing, .job-posting, .job-description');
if (jobContainers.length === 0) {
  jobContainers = $('div, li').filter(function() {
    return $(this).text().trim().toLowerCase().includes('job') || $(this).text().trim().toLowerCase().includes('vacancy');
  });
}

if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
    if (title) {
      job.title = title;
    }
    var companyName = $(this).find('.company, .company-name').text().trim();
    if (companyName) {
      job.companyName = companyName;
    }
    var description = $(this).find('.description, .job-description').text().trim();
    if (description) {
      job.description = description;
    }
    var location = $(this).find('.location, .job-location').text().trim();
    if (location) {
      job.location = location;
    }
    var job