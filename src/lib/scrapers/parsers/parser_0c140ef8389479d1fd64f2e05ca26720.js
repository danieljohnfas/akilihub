Since the provided HTML does not contain actual job listings, the result array will be left empty. The HTML appears to be a directory of companies or a list of categories, rather than a page containing job postings. 

Therefore, the script will simply check for the presence of job listings and, if none are found, will not attempt to extract any data. 

```javascript
if ($('.job-listing').length > 0 || $('h2:contains("Job")').length > 0) {
  // If job listings are found, extract data
  $('.job-listing').each(function() {
    var job = {};
    job.title = $(this).find('h2').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim();
    job.sourceUrl = $(this).find('.job-url').attr('href');
    job.postedDateIsoString = $(this).find('.job-posted-date').attr('datetime');
    job.deadlineIsoString =