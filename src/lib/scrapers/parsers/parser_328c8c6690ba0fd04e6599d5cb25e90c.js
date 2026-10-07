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
if (jobContainers.length === 0) {
  jobContainers = $('div.vacancy');
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h1.entry-title').text().trim() || $(this).find('h2.entry-title').text().trim();
  if (!job.title) return;
  job.companyName = 'Morogoro Regional Referral Hospital';
  job.description = $(this).find('div.entry-content').text().trim();
  job.location = 'Morogoro, Tanzania';
  job.jobType = 'volunteer';
  job.sourceUrl = 'https://ajirachap.com' + $(this).find('a.more-link').attr('href');
  job.postedDateIsoString = '2026-01-24T07:39:43+00:00';
  result.push(job);
});