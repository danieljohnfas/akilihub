Since the provided HTML does not contain any job postings, the result array will be left empty. 

```javascript
if ($('.job').length > 0 || $('h2:contains("Job")').length > 0 || $('h2:contains("Career")').length > 0) {
    $('.job').each(function() {
        var job = {};
        job.title = $(this).find('h2').text().trim();
        job.companyName = $(this).find('.company').text().trim();
        job.description = $(this).find('.description').text().trim();
        job.location = $(this).find('.location').text().trim();
        job.jobType = $(this).find('.job-type').text().trim();
        job.sourceUrl = 'https://kcbbank.co.tz' + $(this).find('a').attr('href');
        job.postedDateIsoString = $(this).find('.posted-date').text().trim();
        job.deadlineIsoString = $(this).find('.deadline').text().trim();
        job.salaryMin = parseFloat($(this).find('.salary-min').text().trim());
        job.salaryMax = parseFloat($(this).find('.salary-max').text().trim());