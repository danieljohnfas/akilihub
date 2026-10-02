const jobContainers = $('.job-listing');

jobContainers.each((index, element) => {
    const job = {};

    job.title = $(element).find('.job-title').text().trim();
    job.companyName = $(element).find('.company-name').text().trim();
    job.description = $(element).find('.job-description').text().trim();
    job.location = $(element).find('.job-location').text().trim();
    job.jobType = $(element).find('.job-type').text().trim();
    job.sourceUrl = $(element).find('.job-link').attr('href');
    job.postedDateIsoString = $(element).find('.posted-date').attr('data-iso-date');
    job.deadlineIsoString = $(element).find('.deadline').attr('data-iso-date');
    job.salaryMin = parseInt($(element).find('.salary-min').text().trim().replace(/[^0-9]/g, ''));
    job.salaryMax = parseInt($(element).find('.salary-max').text().trim().replace(/[^0-9]/g, ''));
    job.salaryCurrency = $(element).find('.salary-currency').text().trim();

    if (job.title) {
        result.push(job);
    }
});
```

This script assumes that the HTML structure contains elements with classes like `.job-listing`, `.job-title`, `.company-name`, etc., which are used to extract job details. If the HTML does not contain actual job listings, the result array will remain empty. This script is deterministic and will only populate the `result` array with valid job objects.