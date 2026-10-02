Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, I will provide a general script that can be used to extract job listings from a webpage with a similar structure. This script assumes that each job listing is contained within an element with a class of "job-listing".

```javascript
$('.job-listing').each(function() {
  var job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = $(this).find('.job-url').attr('href');
  job.postedDateIsoString = $(this).find('.job-posted-date').text().trim();
  job.deadlineIsoString = $(this).find('.job-deadline').text().trim();
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job