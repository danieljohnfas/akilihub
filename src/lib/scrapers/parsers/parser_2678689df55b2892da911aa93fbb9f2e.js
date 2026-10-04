Since the provided HTML does not contain actual job listings with clear job titles, the result array should be left empty. 

However, to fulfill the requirement of providing a Cheerio script, here is a basic script that checks for job listings and extracts relevant information if available:

```javascript
var jobListings = $('div.job-listing'); // assuming job listings are in divs with class 'job-listing'

if (jobListings.length > 0) {
  jobListings.each(function() {
    var job = {};
    job.title = $(this).find('h2.job-title').text().trim();
    job.companyName = $(this).find('span.company-name').text().trim();
    job.description = $(this).find('div.job-description').text().trim();
    job.location = $(this).find('span.location').text().trim();
    job.jobType = $(this).find('span.job-type').text().trim();
    job.sourceUrl = $(this).find('a.job-url').attr('href');
    job.postedDateIsoString = $(this).find('span.posted-date').attr('datetime');
    job.deadlineIsoString = $(this).find('span.deadline').attr('datetime');
    job