result = [];
const jobContainers = $('.post-content').find('.entry-content').find('.job-listing');

jobContainers.each((index, element) => {
    const jobTitle = $(element).find('.job-title').text().trim();
    const companyName = $(element).find('.company-name').text().trim();
    const description = $(element).find('.job-description').text().trim();
    const location = $(element).find('.job-location').text().trim();
    const jobType = $(element).find('.job-type').text().trim().toLowerCase();
    const sourceUrl = $(element).find('.job-link').attr('href');
    const postedDateIsoString = $(element).find('.posted-date').attr('datetime');
    const deadlineIsoString = $(element).find('.deadline').attr('datetime');
    const salaryMin = parseInt($(element).find('.salary-min').text().trim().replace(/[^0-9]/g, ''));
    const salaryMax = parseInt($(element).find('.salary-max').text().trim().replace(/[^0-9]/g, ''));
    const salaryCurrency = $(element).find('.salary-currency').text().trim();

    if (jobTitle) {
        result.push({
            title: jobTitle,
            companyName: companyName,
            description: description,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDateIsoString,
            deadlineIsoString: deadlineIsoString,
            salaryMin: salaryMin,
            salaryMax: salaryMax,
            salaryCurrency: salaryCurrency
        });
    }
});