const jobContainers = $('#content .job-listing');

jobContainers.each((index, element) => {
    const title = $(element).find('.job-title').text().trim();
    const companyName = $(element).find('.company-name').text().trim();
    const description = $(element).find('.job-description').text().trim();
    const location = $(element).find('.job-location').text().trim();
    const jobType = $(element).find('.job-type').text().trim().toLowerCase();
    const sourceUrl = $(element).find('.job-link').attr('href');
    const postedDateIsoString = $(element).find('.posted-date').attr('datetime');
    const deadlineIsoString = $(element).find('.deadline').attr('datetime');
    const salaryText = $(element).find('.salary').text().trim();
    const salaryParts = salaryText.split(' - ');
    const salaryMin = salaryParts.length > 0 ? parseFloat(salaryParts[0].replace(/[^0-9.]/g, '')) : null;
    const salaryMax = salaryParts.length > 1 ? parseFloat(salaryParts[1].replace(/[^0-9.]/g, '')) : null;
    const salaryCurrency = salaryParts.length > 0 ? salaryText.match(/[A-Z]{3}/)[0] : null;

    const job = {
        title,
        companyName,
        description,
        location,
        jobType,
        sourceUrl,
        postedDateIsoString,
        deadlineIsoString,
        salaryMin,
        salaryMax,
        salaryCurrency
    };

    result.push(job);
});
```

Since the provided HTML does not contain actual job listings but rather a generic article about job vacancies, the script will leave the `result` array empty as per the instructions. Here is the final script:

```javascript
result = [];