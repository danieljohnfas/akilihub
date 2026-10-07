var jobContainers = $('div.job-container, div.job, div.job-posting, div.job-listing');
if (jobContainers.length === 0) {
  jobContainers = $('div.row, div.col-md-12, div.col-xs-12');
  if (jobContainers.length === 0) {
    result = [];
    return;
  }
  jobContainers = jobContainers.filter(function() {
    return $(this).find('h1, h2, h3, h4, h5, h6').length > 0 && $(this).find('p').length > 0;
  });
}
jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (title) {
    job.title = title;
  } else {
    return;
  }
  var companyName = $(this).find('span.company-name, span.company, span.employer').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }
  var description = $(this).find('p').not(':first').text().trim();
  if (description)