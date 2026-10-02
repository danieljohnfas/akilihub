result = [];

var jobs = $('article'); // Assuming each job is wrapped in an article tag

jobs.each(function() {
    var job = {};

    job.title = $(this).find('.job-title').text().trim();
    job.companyName = $(this).find('.company-name').text().trim();
    job.description = $(this).find('.job-description').text().trim();
    job.location = $(this).find('.job-location').text().trim();
    job.jobType = $(this).find('.job-type').text().trim().toLowerCase().replace(/ /g, '_');
    job.sourceUrl = $(this).find('.job-link').attr('href').trim();
    job.postedDateIsoString = $(this).find('.posted-date').attr('datetime').trim();
    job.deadlineIsoString = $(this).find('.deadline').attr('datetime').trim();
    job.salaryMin = parseInt($(this).find('.salary-min').text().trim().replace(/[^0-9]/g, ''), 10);
    job.salaryMax = parseInt($(this).find('.salary-max').text().trim().replace(/[^0-9]/g, ''), 10);
    job.salaryCurrency = $(this).find('.salary-currency').text().trim();

    if (job.title) {
        result.push(job);
    }
});