Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, if the HTML contained job postings, the following script would extract the job details:

```javascript
var jobContainers = $('div.job-container'); // Replace with the actual container class or id

if (jobContainers.length > 0) {
    jobContainers.each(function() {
        var job = {};
        job.title = $(this).find('h2.job-title').text().trim(); // Replace with the actual title class or id
        job.companyName = $(this).find('span.company-name').text().trim(); // Replace with the actual company name class or id
        job.description = $(this).find('div.job-description').text().trim(); // Replace with the actual description class or id
        job.location = $(this).find('span.job-location').text().trim(); // Replace with the actual location class or id
        job.jobType = $(this).find('span.job-type').text().trim(); // Replace with the actual job type class or id
        job.sourceUrl = window.location.href;
        job.postedDateIsoString = $(this).find('span.posted-date').text().trim(); // Replace with