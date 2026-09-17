const jobContainers = $('div.job-listing, article.job-card, .job-item, [data-automation-id="job-listing"], .careers-list__item');

jobContainers.each((index, element) => {
    const $job = $(element);

    const title = $job.find('h2.job-title, h3.job-title, .job-title-link, [data-qa="job-title"]').first().text().trim();

    if (title) {
        const companyName = $job.find('.company-name, .job-company').first().text().trim() || null;
        const description = $job.find('.job-description, .description-text').first().text().trim() || null;
        const location = $job.find('.job-location, .location-text').first().text().trim() || null;
        const jobTypeText = $job.find('.job-type, .employment-type').first().text().trim().toLowerCase();
        const sourceUrlRelative = $job.find('a[href*="/jobs/"], a[data-qa="job-link"]').attr('href');

        let jobType = null;
        if (jobTypeText.includes('full-time')) jobType = 'full_time';
        else if (jobTypeText.includes('part-time')) jobType = 'part_time';
        else if (jobTypeText.includes('contract')) jobType = 'contract';
        else if (jobTypeText.includes('internship')) jobType = 'internship';
        else if (jobTypeText.includes('remote')) jobType = 'remote';

        // These fields are not present in the provided HTML structure or require complex parsing not supported by the sample.
        const postedDateIsoString = null;
        const deadlineIsoString = null;
        const salaryMin = null;
        const salaryMax = null;
        const salaryCurrency = null;

        const sourceUrl = sourceUrlRelative ? new URL(sourceUrlRelative, 'https://ke.kcbgroup.com/careers').href : null;

        result.push({
            title: title,
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