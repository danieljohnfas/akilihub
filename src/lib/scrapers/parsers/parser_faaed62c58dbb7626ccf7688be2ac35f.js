var jobContainers = $('p');
jobContainers.each(function() {
  var jobTitle = $(this).text().match(/([A-Za-z\s]+):/);
  if (jobTitle) {
    var job = {};
    job.title = jobTitle[1].trim();
    job.companyName = 'Dar es Salaam Independent School';
    job.description = $(this).text();
    job.location = 'Dar es Salaam';
    job.sourceUrl = 'https://ajirachap.com/2026/06/03/dar-es-salaam-independent-school-job-vacancies-june-2026/';
    job.postedDateIsoString = '2026-06-03T14:11:54+00:00';
    result.push(job);
  }
});