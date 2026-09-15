Since the provided HTML does not contain any job listings, the result array will be left empty. 

However, I can provide a basic Cheerio script that can be used to extract job listings from a webpage, assuming the job listings are contained within a specific HTML structure. 

```javascript
var jobListings = $('div.job-listing'); // Replace 'div.job-listing' with the actual selector for job listings

jobListings.each(function() {
    var job = {};
    job.title = $(this).find('h2.job-title').text().trim(); // Replace 'h2.job-title' with the actual selector for job title
    job.companyName = $(this).find('span.company-name').text().trim(); // Replace 'span.company-name' with the actual selector for company name
    job.description = $(this).find('div.job-description').text().trim(); // Replace 'div.job-description' with the actual selector for job description
    job.location = $(this).find('span.location').text().trim(); // Replace 'span.location' with the actual selector for location
    job.jobType = $(this).find('span.job-type').text().trim(); // Replace 'span.job-type' with the actual selector for job