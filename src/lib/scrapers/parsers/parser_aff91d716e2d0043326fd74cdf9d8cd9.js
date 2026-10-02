$('article').each(function() {
  var job = {};
  job.title = $(this).find('h1').text().trim();
  job.companyName = 'Tume ya Utumishi wa Mahakama';
  job.description = $(this).find('p').text().trim();
  job.location = '';
  job.jobType = '';
  job.sourceUrl = 'https://creedforum.com/ajira-tume-ya-utumishi-wa-mahakama-2026/';
  job.postedDateIsoString = '2026-08-15T21:04:59+00:00';
  job.deadlineIsoString = '2026-08-28T00:00:00+00:00';
  job.salaryMin = null;
  job.salaryMax = null;
  job.salaryCurrency = '';
  result.push(job);
});