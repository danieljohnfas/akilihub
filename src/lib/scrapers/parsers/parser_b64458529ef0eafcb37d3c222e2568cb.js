var jobs = $('article');
if (jobs.length === 0) {
  jobs = $('div.job');
  if (jobs.length === 0) {
    jobs = $('div.job-listing');
    if (jobs.length === 0) {
      jobs = $('div.job-posting');
      if (jobs.length === 0) {
        jobs = $('div.vacancy');
      }
    }
  }
}
jobs.each(function() {
  var job = {};
  job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (!job.title) return;
  job.companyName = $(this).find('span.company, span.organization').text().trim();
  job.description = $(this).find('div.description, div.job-description').text().trim();
  job.location = $(this).find('span.location, span.place').text().trim();
  job.jobType = $(this).find('span.type, span.category').text().trim();
  job.sourceUrl = 'https://www.ajirazote.co.tz' + $(this).find('a').attr('href');
  job.postedDateIsoString = $(this