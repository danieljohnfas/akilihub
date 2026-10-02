result = [];

const jobListings = $('.job-listing');

jobListings.each((index, element) => {
    const title = $(element).find('.job-title').text().trim();
    const companyName = $(element).find('.company-name').text().trim();
    const description = $(element).find('.job-description').text().trim();
    const location = $(element).find('.job-location').text().trim();
    const jobType = $(element).find('.job-type').text().trim();
    const sourceUrl = $(element).find('.job-link').attr('href');
    const postedDate = $(element).find('.posted-date').text().trim();
    const deadline = $(element).find('.deadline').text().trim();
    const salaryText = $(element).find('.salary').text().trim();
    const salaryParts = salaryText.split('-');
    const salaryMin = salaryParts[0] ? parseFloat(salaryParts[0].replace(/[^0-9.]/g, '')) : null;
    const salaryMax = salaryParts[1] ? parseFloat(salaryParts[1].replace(/[^0-9.]/g, '')) : null;
    const salaryCurrency = salaryText.match(/[A-Z]{3}/) ? salaryText.match(/[A-Z]{3}/)[0] : null;

    const job = {
        title,
        companyName,
        description,
        location,
        jobType: jobType.toLowerCase(),
        sourceUrl,
        postedDateIsoString: new Date(postedDate).toISOString(),
        deadlineIsoString: new Date(deadline).toISOString(),
        salaryMin,
        salaryMax,
        salaryCurrency
    };

    result.push(job);
});