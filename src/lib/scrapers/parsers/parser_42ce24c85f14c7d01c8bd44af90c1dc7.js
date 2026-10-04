Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, to demonstrate how the script would work if the HTML contained job postings, here's an example of how you could extract job objects:

```javascript
var jobContainers = $('div.job-container'); // Replace with the actual container selector

if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h2.job-title').text().trim(); // Replace with the actual title selector
    job.companyName = $(this).find('span.company-name').text().trim(); // Replace with the actual company name selector
    job.description = $(this).find('div.job-description').text().trim(); // Replace with the actual description selector
    job.location = $(this).find('span.job-location').text().trim(); // Replace with the actual location selector
    job.jobType = $(this).find('span.job-type').text().trim(); // Replace with the actual job type selector
    job.sourceUrl = $(this).find('a.job-url').attr('href'); // Replace with the actual source URL selector
    job.postedDateIsoString = $(