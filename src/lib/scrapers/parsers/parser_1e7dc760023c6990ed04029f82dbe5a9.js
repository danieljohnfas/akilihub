Since the provided HTML does not contain any job listings, the result array will be left empty. 

However, I can provide a general Cheerio script that can be used to extract job listings from a webpage. This script assumes that the job listings are contained within a specific HTML element, such as a div with a class of "job-listing".

```javascript
$('.job-listing').each(function() {
  var job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = $(this).find('.job-url').attr('href');
  job.postedDateIsoString = $(this).find('.posted-date').text().trim();
  job.deadlineIsoString = $(this).find('.deadline-date').text().trim();
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim());
  job.salaryMax = parseFloat($(this).find('.salary-max