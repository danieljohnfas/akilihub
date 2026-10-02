var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-posting');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1').text().trim() || $(this).find('h2').text().trim();
    job.companyName = $(this).find('span.company').text().trim() || $(this).find('span.organization').text().trim();
    job.description = $(this).find('div.description').text().trim() || $(this).find('div.job-description').text().trim();
    job.location = $(this).find('span.location').text().trim() || $(this).find('span.job-location').text().trim();
    job.sourceUrl = $('meta[property="og:url"]').attr('content');
    job.post