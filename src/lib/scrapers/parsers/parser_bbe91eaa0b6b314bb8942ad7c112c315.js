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
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1, h2, h3').first().text().trim();
    if (!job.title) return;
    job.companyName = 'Mbeya University of Science and Technology (MUST)';
    job.description = $(this).find('p').first().text().trim();
    job.location = 'Mbeya, Tanzania';
    job.sourceUrl = 'https://ajiraweb.com/mbeya-university-of-science-and-technology-must-vacancies-2026/';
    job.postedDateIsoString = '2026-09-26T18:10:21+00:00';
    result.push(job);
  });
}