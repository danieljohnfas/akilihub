$(document).ready(function() {
    const jobListings = $('.job-listing'); // Adjust the selector to match the actual job listing container

    jobListings.each(function() {
        const job = {};

        job.title = $(this).find('.job-title').text().trim(); // Adjust the selector to match the job title
        job.companyName = $(this).find('.company-name').text().trim(); // Adjust the selector to match the company name
        job.description = $(this).find('.job-description').text().trim(); // Adjust the selector to match the job description
        job.location = $(this).find('.job-location').text().trim(); // Adjust the selector to match the job location
        job.jobType = $(this).find('.job-type').text().toLowerCase().trim(); // Adjust the selector to match the job type
        job.sourceUrl = $(this).find('.job-source a').attr('href'); // Adjust the selector to match the job source URL
        job.postedDateIsoString = $(this).find('.posted-date').data('iso-date'); // Adjust the selector to match the posted date
        job.deadlineIsoString = $(this).find('.deadline').data('iso-date'); // Adjust the selector to match the deadline
        job.salaryMin = parseInt($(this).find('.salary-min').text().replace(/[^0-9]/g, ''), 10); // Adjust the selector to match the minimum salary
        job.salaryMax = parseInt($(this).find('.salary-max').text().replace(/[^0-9]/g, ''), 10); // Adjust the selector to match the maximum salary
        job.salaryCurrency = $(this).find('.salary-currency').text().trim(); // Adjust the selector to match the salary currency

        if (job.title) {
            result.push(job);
        }
    });
});