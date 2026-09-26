$( '.job' ).each(function() {
  var job = {};
  job.title = $(this).find('h2').text().trim();
  job.companyName = $(this).find('.company').text().trim();
  job.description = $(this).find('.description').text().trim();
  job.location = $(this).find('.location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim().toLowerCase().replace(' ', '_');
  job.sourceUrl = 'https://makeyourmove.co.tz' + $(this).find('a').attr('href');
  job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
  var salaryText = $(this).find('.salary').text().trim();
  if (salaryText) {
    var salaryMatch = salaryText.match(/(\d+)\/(\d+)/);
    if (salaryMatch) {
      job.salaryMin = parseInt(salaryMatch[1]);
      job.salaryMax = parseInt(salaryMatch[2]);
      job.salaryCurrency = 'TZS';
    }
  }
  if (job.title && job