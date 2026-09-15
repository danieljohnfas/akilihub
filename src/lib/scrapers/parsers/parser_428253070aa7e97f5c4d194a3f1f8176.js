$('.job-listing').each(function() {
  var job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.sourceUrl = 'https://jobs.tz.cari.africa' + $(this).find('.job-link').attr('href');
  result.push(job);
});