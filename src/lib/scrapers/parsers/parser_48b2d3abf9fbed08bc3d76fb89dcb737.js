Since the provided HTML does not contain any job listings, the result array will be left empty. However, I will provide a general Cheerio script that can be used to extract job listings from a webpage with a similar structure.

```javascript
var jobContainers = $('div.job-container'); // replace with the actual selector for job containers

if (jobContainers.length === 0) {
  // if no job containers are found, try to find other possible selectors
  jobContainers = $('div.job-listing');
  if (jobContainers.length === 0) {
    jobContainers = $('article.job');
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h2.job-title').text().trim();
  if (!job.title) return; // skip if no job title is found

  job.companyName = $(this).find('span.company-name').text().trim();
  job.description = $(this).find('div.job-description').text().trim();
  job.location = $(this).find('span.job-location').text().trim();
  job.jobType = $(this).find('span.job-type').text().trim();
  job.sourceUrl = $(this).find('a.job-url').attr