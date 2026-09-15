var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-posting');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-opening');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.employment-opportunity');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (title) {
    job.title = title;
  } else {
    return;
  }
  
  var companyName = $(this).find('span.company-name, span.organization, span.employer').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }
  
  var description = $(this).find('div.description, div.job-description, div.job