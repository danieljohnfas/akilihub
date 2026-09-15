Since the provided HTML does not contain any job listings, the result array will be left empty. 

However, to demonstrate how the script would work if the HTML did contain job listings, here is a sample script:

```javascript
var jobContainers = $('div.job-listing'); // assuming job listings are contained in divs with class 'job-listing'

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
    job.salaryMin = parseFloat($(this).find('span.salary-min').