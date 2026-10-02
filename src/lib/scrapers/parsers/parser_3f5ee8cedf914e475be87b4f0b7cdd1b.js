Since the provided HTML sample does not contain any job postings, the result array will be left empty. 

However, I can provide a general script that can be used to extract job postings from an HTML structure. This script assumes that the job postings are contained within elements with a specific class or ID.

```javascript
$('.job-posting').each(function() {
  var job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = $(this).find('.job-url').attr('href');
  job.postedDateIsoString = $(this).find('.posted-date').text().trim();
  job.deadlineIsoString = $(this).find('.deadline').text().trim();
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(this).find('.salary