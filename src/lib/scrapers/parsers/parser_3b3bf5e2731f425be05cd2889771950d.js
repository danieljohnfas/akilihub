Since the provided HTML does not contain any actual job listings, the result array will be left empty. 

However, to demonstrate how the script would work if the HTML did contain job listings, here is an example of how you might structure the script:

```javascript
var jobListings = $('div.job-listing'); // Replace with the actual selector for job listings

if (jobListings.length === 0) {
  // If no job listings are found, leave the result array empty
} else {
  jobListings.each(function() {
    var job = {};
    
    // Extract job title
    job.title = $(this).find('h2.job-title').text().trim();
    
    // Extract company name
    job.companyName = $(this).find('span.company-name').text().trim();
    
    // Extract job description
    job.description = $(this).find('div.job-description').text().trim();
    
    // Extract location
    job.location = $(this).find('span.location').text().trim();
    
    // Extract job type
    var jobTypeText = $(this).find('span.job-type').text().trim();
    if (jobTypeText === 'Full-time') {
      job.jobType = '