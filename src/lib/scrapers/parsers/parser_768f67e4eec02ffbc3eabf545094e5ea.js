const jobContainers = $('div.job-listing');

if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    const job = {};
    job.title = $(this).find('h2.job-title').text().trim();
    job.companyName = $(this).find('span.company-name').text().trim();
    job.description = $(this).find('div.job-description').text().trim();
    job.location = $(this).find('span.location').text().trim();
    job.jobType = $(this).find('span.job-type').text().trim();
    job.sourceUrl = 'https://kazipro.co.tz' + $(this).find('a.job-url').attr('href');
    job.postedDateIsoString = $(this).find('span.posted-date').text().trim();
    job.deadlineIsoString = $(this).find('span.deadline').text().trim();
    job.salaryMin = parseFloat($(this).find('span.salary-min').text().trim().replace(/[^0-9.]/g, ''));
    job.salaryMax = parseFloat($(this).find('span.salary-max').text().trim().replace(/[^0-9.