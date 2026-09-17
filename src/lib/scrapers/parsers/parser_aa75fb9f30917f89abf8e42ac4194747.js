var $jobs = $('.job-listing');
for (var i = 0; i < $jobs.length; i++) {
  var $job = $jobs.eq(i);
  var title = $job.find('.job-title').text().trim();
  var companyName = $job.find('.company-name').text().trim();
  var location = $job.find('.location').text().trim();
  var jobType = $job.find('.job-type').text().trim();
  var description = $job.find('.description').text().trim();
  var sourceUrl = $job.find('a').attr('href') || window.location.href;
  var postedDateIsoString = $job.find('.posted-date').attr('datetime') || $job.find('.posted-date').text().trim();
  var deadlineIsoString = $job.find('.deadline-date').attr('datetime') || $job.find('.deadline-date').text().trim();
  var salaryMin = parseFloat($job.find('.salary-min').text()) || 0;
  var salaryMax = parseFloat($job.find('.salary-max').text()) || 0;
  var salaryCurrency = $job.find('.salary-currency').text().trim();
  result.push({
    title: title,
    companyName: companyName,
    description: description,
    location: location,
    jobType: jobType,
    sourceUrl: sourceUrl,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency
  });
}