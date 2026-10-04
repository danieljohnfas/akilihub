Since the provided HTML does not contain any job postings, the result array will be left empty. 

However, to fulfill the requirements, here is a script that checks for job postings and extracts the required information if available:

```javascript
var jobContainers = $('.node--type-job');
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('.node__title').text().trim();
    job.companyName = $(this).find('.field--name-field-organization').text().trim();
    job.description = $(this).find('.field--name-body').text().trim();
    job.location = $(this).find('.field--name-field-location').text().trim();
    job.sourceUrl = 'https://tanzania.un.org' + $(this).find('.node__title a').attr('href');
    result.push(job);
  });
}
```