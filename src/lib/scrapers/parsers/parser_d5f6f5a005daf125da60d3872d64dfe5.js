result = [];

const jobListings = $('div.job-listing');

jobListings.each((index, element) => {
    const job = {};

    job.title = $(element).find('.job-title').text().trim();
    job.companyName = $(element).find('.company-name').text().trim();
    job.description = $(element).find('.job-description').text().trim();
    job.location = $(element).find('.job-location').text().trim();
    job.jobType = $(element).find('.job-type').text().trim().toLowerCase().replace(/ /g, '_');
    job.sourceUrl = $(element).find('.job-link').attr('href');
    job.postedDateIsoString = $(element).find('.posted-date').attr('data-date');
    job.deadlineIsoString = $(element).find('.deadline').attr('data-date');
    job.salaryMin = parseInt($(element).find('.salary-min').text().trim().replace(/[^0-9]/g, ''));
    job.salaryMax = parseInt($(element).find('.salary-max').text().trim().replace(/[^0-9]/g, ''));
    job.salaryCurrency = $(element).find('.salary-currency').text().trim();

    if (job.title) {
        result.push(job);
    }
});