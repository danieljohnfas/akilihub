result = [];

$('div.job-listing').each((index, element) => {
  const $element = $(element);
  const job = {
    title: $element.find('h2.job-title').text().trim(),
    companyName: $element.find('span.company-name').text().trim(),
    description: $element.find('div.job-description').text().trim(),
    location: $element.find('span.location').text().trim(),
    jobType: $element.find('span.job-type').text().trim().toLowerCase().replace(/ /g, '_'),
    sourceUrl: $element.find('a.job-link').attr('href').trim(),
    postedDateIsoString: $element.find('span.posted-date').attr('data-date').trim(),
    deadlineIsoString: $element.find('span.deadline').attr('data-date').trim(),
    salaryMin: parseInt($element.find('span.salary-min').text().trim().replace(/[^0-9]/g, ''), 10),
    salaryMax: parseInt($element.find('span.salary-max').text().trim().replace(/[^0-9]/g, ''), 10),
    salaryCurrency: $element.find('span.salary-currency').text().trim()
  };

  // Only push valid job objects
  if (job.title) {
    result.push(job);
  }
});
```

This script will extract job listings from the provided HTML structure and populate the `result` array with job objects. If the HTML does not contain actual job postings, the `result` array will remain empty.