Since the provided HTML does not contain any job postings, the result array will be left empty. 

```javascript
if ($('.job').length > 0 || $('.job-listing').length > 0 || $('.job-posting').length > 0) {
  $('.job, .job-listing, .job-posting').each(function() {
    var job = {};
    job.title = $(this).find('.job-title').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim();
    job.sourceUrl = $(this).find('.job-url').attr('href');
    job.postedDateIsoString = $(this).find('.job-posted-date').attr('datetime');
    job.deadlineIsoString = $(this).find('.job-deadline').attr('datetime');
    job.salaryMin = $(this).find('.salary-min').text().trim();
    job.salaryMax = $(this).find('.salary-max').text().trim();
    job.salary