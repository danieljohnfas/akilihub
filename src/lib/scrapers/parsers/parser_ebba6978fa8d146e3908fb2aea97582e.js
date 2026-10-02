Since the provided HTML does not contain any job listings, the result array will be left empty. 

However, if the HTML structure were to contain job listings in the future, here's a sample Cheerio script that could be used to extract job objects:

```javascript
$('.job-listing').each(function() {
  const job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = 'https://tanzaniatimes.net' + $(this).find('.job-link').attr('href');
  job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(this).find