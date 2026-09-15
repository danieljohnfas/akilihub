Since the provided HTML does not contain actual job postings, the result array will be left empty. 

However, I can provide a general template of how the Cheerio script could be structured if the HTML contained job listings:

```javascript
$('.job-listing').each(function() {
  const job = {};
  job.title = $(this).find('.job-title').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description').text().trim();
  job.location = $(this).find('.job-location').text().trim();
  job.jobType = $(this).find('.job-type').text().trim();
  job.sourceUrl = $(this).find('.job-url').attr('href');
  job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
  job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
  job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^0-9.]/g, ''));
  job.salaryMax = parseFloat($(this).find('.salary-max').text().trim().replace(/[^0-9.]/g,