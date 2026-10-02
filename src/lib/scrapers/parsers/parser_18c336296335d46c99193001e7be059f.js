Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, to demonstrate how the script would work if the HTML did contain job postings, here is an example of how you could extract job data:

```javascript
$('.job-listing').each(function() {
  var job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = 'https://mitu.or.tz' + $(this).find('.job-link').attr('href');
  job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(this).find('.salary-max