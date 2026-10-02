Since the provided HTML does not contain any job listings, the result array will remain empty. 

However, if the HTML were to contain job listings in the future, the following code could be used to extract the job information:

```javascript
$('.job-listing').each(function() {
  const job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = $(this).find('.job-url').attr('href');
  job.postedDateIsoString = $(this).find('.job-posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('.job-deadline').attr('datetime');
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(this).find('.salary-max').text().trim().replace(/[^0