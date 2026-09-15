Since the provided HTML does not contain any job listings with a clear job title, the result array will be left empty. 

However, to demonstrate how the script would work if the HTML contained job listings, here is a sample script:

```javascript
const jobContainers = $('div.job-listing'); // assuming job listings are contained in divs with class 'job-listing'

if (jobContainers.length === 0) {
  // if no job listings are found, try to find them in other possible containers
  jobContainers = $('div.job').add('div.job-posting').add('div.job-opening');
}

jobContainers.each(function() {
  const job = {};
  
  // extract job title
  job.title = $(this).find('h2.job-title').text().trim();
  
  if (!job.title) {
    // if no job title is found, skip this job listing
    return;
  }
  
  // extract company name
  job.companyName = $(this).find('span.company-name').text().trim();
  
  // extract job description
  job.description = $(this).find('div.job-description').text().trim();
  
  // extract location
  job.location = $(this).find('span.location').