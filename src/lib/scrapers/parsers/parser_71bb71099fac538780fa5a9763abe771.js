Since the provided HTML does not contain any job listings, the result array will be left empty. 

However, to fulfill the requirements, here's a script that checks for job listings and extracts relevant information if available:

```javascript
var jobContainers = $('div.job'); // Assuming job listings are contained within divs with class 'job'
if (jobContainers.length === 0) {
  jobContainers = $('article.job'); // Try another possible container
  if (jobContainers.length === 0) {
    jobContainers = $('li.job'); // Try another possible container
  }
}

jobContainers.each(function() {
  var job = {};
  job.title = $(this).find('h2.job-title').text().trim() || $(this).find('h1.job-title').text().trim();
  if (!job.title) return; // Skip if no job title is found

  job.companyName = $(this).find('span.company-name').text().trim() || $(this).find('div.company').text().trim();
  job.description = $(this).find('div.job-description').text().trim() || $(this).find('p.description').text().trim();
  job.location = $(this).find('span.location').text().