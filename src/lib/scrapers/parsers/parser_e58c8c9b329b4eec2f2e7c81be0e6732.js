var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.job');
  if (jobContainers.length === 0) {
    jobContainers = $('div.job-listing');
    if (jobContainers.length === 0) {
      jobContainers = $('div.vacancy');
    }
  }
}
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h2').text().trim() || $(this).find('h1').text().trim();
    job.companyName = 'Morogoro Regional Referral Hospital';
    job.description = $(this).find('div.entry-content').text().trim();
    job.location = 'Morogoro';
    job.sourceUrl = 'https://www.elimuyako.co.tz' + $(this).find('a').attr('href');
    job.postedDateIsoString = '2026-07-24T08:01:56+00:00';
    result.push(job);
  });
}