Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, if the HTML structure were to contain job postings, the script to extract the job details would look something like this:

```javascript
var jobContainers = $('div.job-container'); // Assuming job containers have this class

if (jobContainers.length > 0) {
    jobContainers.each(function() {
        var job = {};

        job.title = $(this).find('h2.job-title').text().trim();
        job.companyName = $(this).find('span.company-name').text().trim();
        job.description = $(this).find('div.job-description').text().trim();
        job.location = $(this).find('span.job-location').text().trim();
        job.jobType = $(this).find('span.job-type').text().trim();
        job.sourceUrl = $(this).find('a.job-url').attr('href');
        job.postedDateIsoString = $(this).find('span.posted-date').text().trim();
        job.deadlineIsoString = $(this).find('span.deadline').text().trim();
        job.salaryMin = parseFloat($(this).find('span.salary-min').text().trim().replace(/