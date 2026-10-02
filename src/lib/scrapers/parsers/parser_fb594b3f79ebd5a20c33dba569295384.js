result = [];

// Check if the HTML contains job listings
const jobListings = $('div.job-listing');

if (jobListings.length > 0) {
    jobListings.each((index, jobElement) => {
        const job = {};
        
        job.title = $(jobElement).find('h2.job-title').text().trim();
        job.companyName = $(jobElement).find('span.company-name').text().trim();
        job.description = $(jobElement).find('p.job-description').text().trim();
        job.location = $(jobElement).find('span.job-location').text().trim();
        job.jobType = $(jobElement).find('span.job-type').text().trim().toLowerCase();
        job.sourceUrl = $(jobElement).find('a.job-link').attr('href');
        job.postedDateIsoString = $(jobElement).find('span.posted-date').data('iso-date');
        job.deadlineIsoString = $(jobElement).find('span.deadline-date').data('iso-date');
        job.salaryMin = $(jobElement).find('span.salary-min').text().trim().replace(/[^0-9]/g, '');
        job.salaryMax = $(jobElement).find('span.salary-max').text().trim().replace(/[^0-9]/g, '');
        job.salaryCurrency = $(jobElement).find('span.salary-currency').text().trim();

        // Push the job object to the result array
        result.push(job);
    });
}