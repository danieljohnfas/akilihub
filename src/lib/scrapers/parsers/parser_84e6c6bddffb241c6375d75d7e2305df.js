const jobContainers = $('div.job-listing');

jobContainers.each((index, element) => {
  const job = {};

  job.title = $(element).find('h2.job-title').text().trim();
  job.companyName = $(element).find('span.company-name').text().trim();
  job.description = $(element).find('div.job-description').text().trim();
  job.location = $(element).find('span.job-location').text().trim();
  job.jobType = $(element).find('span.job-type').text().toLowerCase().trim().replace(/\s+/g, '_');

  const salaryText = $(element).find('span.salary').text().trim();
  if (salaryText) {
    const salaryParts = salaryText.replace(/[^\d-]/g, '').split('-');
    if (salaryParts.length === 2) {
      job.salaryMin = parseInt(salaryParts[0], 10);
      job.salaryMax = parseInt(salaryParts[1], 10);
    }
    job.salaryCurrency = salaryText.match(/[A-Z]{3}/)?.[0] || '';
  }

  job.sourceUrl = $(element).find('a.view-job').attr('href').trim();
  job.postedDateIsoString = $(element).find('span.posted-date').attr('datetime').trim();
  job.deadlineIsoString = $(element).find('span.deadline').attr('datetime').trim();

  if (job.title) {
    result.push(job);
  }
});
```

This script assumes that the HTML structure contains job listings within `div.job-listing` elements, and each job listing has the following structure:
- `h2.job-title` for the job title
- `span.company-name` for the company name
- `div.job-description` for the job description
- `span.job-location` for the job location
- `span.job-type` for the job type (e.g., full_time, part_time, etc.)
- `span.salary` for the salary range
- `a.view-job` for the job URL
- `span.posted-date` for the posted date (with an `datetime` attribute)
- `span.deadline` for the deadline (with an `datetime` attribute)

Ensure that the HTML structure matches these assumptions, or adjust the selectors accordingly. If the HTML does not contain actual job postings, the result array will remain empty.