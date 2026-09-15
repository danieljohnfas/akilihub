Since the provided HTML does not contain any job listings, the result array will be left empty. 

```javascript
if ($('.job').length > 0) {
  $('.job').each(function() {
    var job = {};
    job.title = $(this).find('.job-title').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim();
    job.sourceUrl = $(this).find('.job-url').attr('href');
    job.postedDateIsoString = $(this).find('.job-posted-date').text().trim();
    job.deadlineIsoString = $(this).find('.job-deadline').text().trim();
    job.salaryMin = $(this).find('.salary-min').text().trim();
    job.salaryMax = $(this).find('.salary-max').text().trim();
    job.salaryCurrency = $(this).find('.salary-currency').text().trim();
    result.push(job);
  });
} else {
  result = [];
}