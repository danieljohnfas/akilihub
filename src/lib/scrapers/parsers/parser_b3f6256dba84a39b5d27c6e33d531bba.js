Since the provided HTML does not contain any job listings, the result array will be left empty. 

However, for the sake of completeness, here's a basic Cheerio script that would extract job listings if they were present in the HTML:

```javascript
var jobListings = $('article, .job, .job-listing, .job-posting');

if (jobListings.length > 0) {
  jobListings.each(function() {
    var job = {};
    job.title = $(this).find('h1, h2, h3, .job-title').text().trim();
    job.companyName = $(this).find('.company-name, .company').text().trim();
    job.description = $(this).find('.job-description, .description').text().trim();
    job.location = $(this).find('.job-location, .location').text().trim();
    job.jobType = $(this).find('.job-type, .type').text().trim();
    job.sourceUrl = $('link[rel="canonical"]').attr('href');
    job.postedDateIsoString = $(this).find('.posted-date, .date').text().trim();
    job.deadlineIsoString = $(this).find('.deadline, .application-de