Since the provided HTML does not contain real job postings, the result array will be left empty. 

```javascript
if ($('.job-listing').length > 0 || $('h2:contains("Job")').length > 0 || $('h2:contains("Vacancy")').length > 0) {
  // If job listings are found, extract them
  $('.job-listing').each(function() {
    var job = {};
    job.title = $(this).find('h2').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim();
    job.sourceUrl = $(this).find('a').attr('href');
    job.postedDateIsoString = $(this).find('.posted-date').text().trim();
    job.deadlineIsoString = $(this).find('.deadline').text().trim();
    job.salaryMin = $(this).find('.salary-min').text().trim();
    job.salaryMax = $(this).find('.salary-max').