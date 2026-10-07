var jobContainers = $('div.job-listing, div.job, div.job-posting, div.job-opening, div.vacancy, div.employment-opportunity');
if (jobContainers.length === 0) {
  var jobContainers = $('article.job, section.job, div.job-description');
  if (jobContainers.length === 0) {
    result = [];
    return;
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (!job.title) {
    return;
  }
  job.companyName = $(this).find('span.company, span.employer, span.organization').text().trim();
  job.description = $(this).find('div.description, div.job-description, div.job-summary').text().trim();
  job.location = $(this).find('span.location, span.place, span.city, span.country').text().trim();
  job.jobType = $(this).find('span.type, span.category, span.job-type').text().trim();
  job.sourceUrl = $(this).find('a').attr('href');
  job.postedDateIsoString