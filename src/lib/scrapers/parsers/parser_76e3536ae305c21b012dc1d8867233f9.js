var jobContainers = $('div.job-container, div.job-listing, div.job-post, div.job-opening, div.job-vacancy, div.job-ad');
if (jobContainers.length === 0) {
  jobContainers = $('article, div.card, div.listing, div.post, div.item');
}
jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1, h2, h3, .job-title, .title').text().trim();
  if (!job.title) return;
  job.companyName = $(this).find('.company-name, .company, .employer').text().trim();
  job.description = $(this).find('.job-description, .description, .job-details').text().trim();
  job.location = $(this).find('.job-location, .location, .place').text().trim();
  job.jobType = $(this).find('.job-type, .type, .employment-type').text().trim();
  job.sourceUrl = window.location.href;
  var postedDate = $(this).find('.posted-date, .date-posted, .published').text().trim();
  if (postedDate) {
    job.postedDateIsoString = new Date(posted