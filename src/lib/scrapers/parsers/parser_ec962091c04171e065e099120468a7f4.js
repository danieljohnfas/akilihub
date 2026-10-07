var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-listing');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.job-posting');
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (!job.title) return;
  
  job.companyName = $(this).find('span.company, span.organization').text().trim();
  
  job.description = $(this).find('div.description, div.job-description').text().trim();
  
  job.location = $(this).find('span.location, span.place').text().trim();
  
  var jobTypeText = $(this).find('span.type, span.job-type').text().trim();
  if (jobTypeText) {
    if (jobTypeText.toLowerCase().includes('full')) {
      job.jobType = 'full_time';
    } else if (jobTypeText.toLowerCase().includes('part')) {
      job.jobType = '