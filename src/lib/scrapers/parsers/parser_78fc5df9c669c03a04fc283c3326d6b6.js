var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('li.job');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1').text().trim() || $(this).find('h2').text().trim();
    job.companyName = $(this).find('.company').text().trim() || $(this).find('.organization').text().trim();
    job.description = $(this).find('.description').text().trim() || $(this).find('.job-description').text().trim();
    job.location = $(this).find('.location').text().trim() || $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim() || $(this).find('.employment-type').text().trim();
    job.sourceUrl = 'https://medicalelectiveabroad.at' +