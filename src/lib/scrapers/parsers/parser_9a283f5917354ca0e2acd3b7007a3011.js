var jobContainers = $('article');
if (jobContainers.length === 0) {
  var jobContainers = $('div.entry-content').find('p').filter(function() {
    return $(this).text().trim().indexOf('Job Title') !== -1;
  }).parent().parent();
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h2, h3, h4').first().text().trim();
    if (!job.title) return;
    job.companyName = 'FlySunBird Tanzania';
    job.location = 'Tanzania';
    job.sourceUrl = 'https://ajiraleo.co.tz' + $('meta[property="og:url"]').attr('content');
    var text = $(this).text();
    if (text.indexOf('Job Type:') !== -1) {
      job.jobType = text.substring(text.indexOf('Job Type:') + 9).trim().split('\n')[0];
    }
    if (text.indexOf('Deadline:') !== -1) {
      job.deadlineIsoString = text.substring(text.indexOf('Deadline:') + 9).trim().split('\n')[