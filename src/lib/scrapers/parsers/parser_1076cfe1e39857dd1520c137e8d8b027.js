var jobContainers = $('div.job-container, div.job-listing, div.job-item, div.job-post, div.job-opening, div.job-vacancy, div.job-ad');
if (jobContainers.length === 0) {
  var jobTitleElements = $('h1, h2, h3, h4, h5, h6');
  jobContainers = [];
  jobTitleElements.each(function() {
    var text = $(this).text().trim();
    if (text.toLowerCase().includes('job') || text.toLowerCase().includes('vacancy') || text.toLowerCase().includes('opening')) {
      jobContainers.push($(this).closest('div, article, section'));
    }
  });
}
if (jobContainers.length === 0) {
  result = [];
  return;
}
jobContainers.each(function() {
  var job = {};
  var titleElement = $(this).find('h1, h2, h3, h4, h5, h6');
  if (titleElement.length > 0) {
    job.title = titleElement.text().trim();
  }
  var companyNameElement = $(this).find('span.company-name, span.company, span.employer');
  if (companyNameElement.length > 0) {