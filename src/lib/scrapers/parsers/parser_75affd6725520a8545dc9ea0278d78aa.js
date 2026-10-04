Since the provided HTML does not contain any job postings, the result array will be left empty. 

```javascript
if ($('.job').length > 0 || $('h2:contains("Job")').length > 0 || $('h2:contains("Vacancy")').length > 0) {
    $('.job').each(function() {
        var job = {};
        job.title = $(this).find('h2').text().trim();
        job.companyName = $(this).find('.company').text().trim();
        job.description = $(this).find('.description').text().trim();
        job.location = $(this).find('.location').text().trim();
        job.jobType = $(this).find('.job-type').text().trim();
        job.sourceUrl = 'https://legalalphabet.com' + $(this).find('a').attr('href');
        job.postedDateIsoString = $(this).find('.posted-date').attr('datetime');
        job.deadlineIsoString = $(this).find('.deadline').attr('datetime');
        job.salaryMin = parseFloat($(this).find('.salary-min').text().trim().replace(/[^\d.-]/g, ''));
        job.salaryMax = parseFloat($(this).find('.