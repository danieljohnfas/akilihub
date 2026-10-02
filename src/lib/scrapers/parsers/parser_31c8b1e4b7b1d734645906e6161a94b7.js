result = [];

// Check if the HTML contains job listings
if ($('div.job-listing').length > 0) {
  $('div.job-listing').each(function() {
    var job = {};

    job.title = $(this).find('h2.job-title').text().trim();
    job.companyName = $(this).find('span.company-name').text().trim();
    job.description = $(this).find('div.job-description').text().trim();
    job.location = $(this).find('span.job-location').text().trim();
    job.jobType = $(this).find('span.job-type').text().trim().toLowerCase();
    job.sourceUrl = $(this).find('a.job-link').attr('href');
    job.postedDateIsoString = $(this).find('span.posted-date').attr('data-posted-date');
    job.deadlineIsoString = $(this).find('span.deadline').attr('data-deadline');
    job.salaryMin = parseInt($(this).find('span.salary-min').text().trim().replace(/[^0-9]/g, ''), 10);
    job.salaryMax = parseInt($(this).find('span.salary-max').text().trim().replace(/[^0-9]/g, ''), 10);
    job.salaryCurrency = $(this).find('span.salary-currency').text().trim();

    result.push(job);
  });
}