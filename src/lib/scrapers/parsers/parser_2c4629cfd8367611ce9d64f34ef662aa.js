const jobContainers = $('article.message-body');

if (jobContainers.length === 0) {
  result = [];
  return;
}

jobContainers.each(function() {
  const job = {};

  const title = $(this).find('h2').text().trim();
  if (title) {
    job.title = title;
  }

  const companyName = $(this).find('a.username').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }

  const description = $(this).find('blockquote').text().trim();
  if (description) {
    job.description = description;
  }

  const location = $(this).find('span.location').text().trim();
  if (location) {
    job.location = location;
  }

  const jobType = $(this).find('span.job-type').text().trim();
  if (jobType) {
    job.jobType = jobType;
  }

  const sourceUrl = $('meta[property="og:url"]').attr('content');
  if (sourceUrl) {
    job.sourceUrl = sourceUrl;
  }

  const postedDate = $(this).find('span.date').text().trim();
  if (postedDate) {
    job