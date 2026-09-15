const jobContainers = $('div.job-container, div.job-listing, div.job-posting, div.job-opening, div.job-vacancy');

if (jobContainers.length === 0) {
  const jobListings = $('li.job-listing, li.job-posting, li.job-opening, li.job-vacancy');
  if (jobListings.length > 0) {
    jobContainers = jobListings;
  }
}

if (jobContainers.length === 0) {
  result = [];
  return;
}

jobContainers.each(function() {
  const job = {};
  const title = $(this).find('h2.job-title, h2.job-heading, h1.job-title, h1.job-heading');
  if (title.length > 0) {
    job.title = title.text().trim();
  } else {
    return;
  }

  const companyName = $(this).find('span.company-name, span.employer, span.organization');
  if (companyName.length > 0) {
    job.companyName = companyName.text().trim();
  }

  const description = $(this).find('div.job-description, div.job-summary, div.job-details');
  if (description.length > 0) {
    job.description =