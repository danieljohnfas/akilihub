$('body').find('.field--name-field-announcement-text').each(function() {
  var job = {};
  job.title = $(this).find('h2').text().trim();
  job.companyName = 'University of Dar es Salaam';
  job.description = $(this).find('p').text().trim();
  job.location = 'Dar es Salaam, Tanzania';
  job.sourceUrl = 'https://www.udsm.ac.tz' + window.location.pathname;
  result.push(job);
});