Since the provided HTML does not contain real job postings but rather a directory or listing page for jobs, the result array should be left empty as per the instructions. 

However, to demonstrate how one might approach extracting job listings if they were present, here's a basic structure for a Cheerio script. This script assumes job listings are contained within elements with a specific class or identifier, which is not present in the given HTML sample.

```javascript
if ($('.job-listing').length > 0) {
  $('.job-listing').each(function() {
    var job = {};
    job.title = $(this).find('.job-title').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim();
    job.sourceUrl = $(this).find('.job-url').attr('href');
    job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
    job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
    job