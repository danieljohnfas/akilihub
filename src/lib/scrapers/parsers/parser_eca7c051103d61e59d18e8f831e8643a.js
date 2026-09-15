The provided HTML does not contain actual job listings. It appears to be a directory or category page for accountant jobs in Arusha. Therefore, the result array should be left empty.

```javascript
if ($('.job-listing').length > 0) {
  $('.job-listing').each(function() {
    var job = {};
    job.title = $(this).find('.job-title').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim();
    job.sourceUrl = $(this).find('.job-url').attr('href');
    job.postedDateIsoString = $(this).find('.job-posted-date').attr('datetime');
    job.deadlineIsoString = $(this).find('.job-deadline').attr('datetime');
    job.salaryMin = parseFloat($(this).find('.salary-min').text().replace(/[^0-9\.]+/g, ''));
    job.salaryMax = parseFloat($(this).find('.salary-max').text().replace