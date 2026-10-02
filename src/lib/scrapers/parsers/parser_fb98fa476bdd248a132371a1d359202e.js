Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, I will provide a general Cheerio script that can be used to extract jobs from a webpage with a specific HTML structure. This script assumes that each job posting is contained within an element with a class of "job-posting".

```javascript
$('.job-posting').each(function() {
  var job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = window.location.href;
  job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(this).find('.salary-max