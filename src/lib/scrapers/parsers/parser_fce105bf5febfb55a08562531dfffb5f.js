result = [];

// Check if the HTML contains actual job postings
const jobListings = $('div.job-listing');

if (jobListings.length > 0) {
    jobListings.each((index, element) => {
        const job = $(element);

        const title = job.find('.job-title').text().trim();
        const companyName = job.find('.company-name').text().trim();
        const description = job.find('.job-description').text().trim();
        const location = job.find('.job-location').text().trim();
        const jobType = job.find('.job-type').text().trim().toLowerCase();
        const sourceUrl = job.find('.job-link').attr('href');
        const postedDateIsoString = job.find('.posted-date').data('iso-date');
        const deadlineIsoString = job.find('.deadline-date').data('iso-date');
        const salaryMin = job.find('.salary-min').text().trim();
        const salaryMax = job.find('.salary-max').text().trim();
        const salaryCurrency = job.find('.salary-currency').text().trim();

        const jobObject = {
            title: title,
            companyName: companyName,
            description: description,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDateIsoString,
            deadlineIsoString: deadlineIsoString,
            salaryMin: salaryMin ? parseFloat(salaryMin) : null,
            salaryMax: salaryMax ? parseFloat(salaryMax) : null,
            salaryCurrency: salaryCurrency
        };

        result.push(jobObject);
    });
}