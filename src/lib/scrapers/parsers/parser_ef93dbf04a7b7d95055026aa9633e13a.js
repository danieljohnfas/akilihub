Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, if the HTML were to contain job postings, here's a sample script that could be used to extract job objects:

```javascript
var jobContainers = $('div.job'); // Assuming job postings are contained within divs with class 'job'

if (jobContainers.length > 0) {
    jobContainers.each(function() {
        var job = {};

        job.title = $(this).find('h2.job-title').text().trim();
        job.companyName = $(this).find('span.company-name').text().trim();
        job.description = $(this).find('div.job-description').text().trim();
        job.location = $(this).find('span.location').text().trim();
        job.jobType = $(this).find('span.job-type').text().trim();
        job.sourceUrl = $(this).find('a.job-url').attr('href');
        job.postedDateIsoString = $(this).find('span.posted-date').attr('datetime');
        job.deadlineIsoString = $(this).find('span.deadline').attr('datetime');
        job.salaryMin = parseFloat($(this).find('span.salary-min').text().