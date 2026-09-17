$('.job-listing, .job-item, .job-card').each((index, element) => {
    const job = $(element);

    const titleElement = job.find('.job-title a, .job-heading a, h2 a, h3 a').first();
    const titleText = titleElement.text().trim();
    const sourceUrl = titleElement.attr('href') || job.find('a[href]').attr('href') || '';

    // If there's no clear title, it's likely not a job posting.
    if (!titleText) {
        return;
    }

    const description = job.find('.job-description, .description, p').first().text().trim();
    const location = job.find('.job-location, .location-text, .location').first().text().trim();
    const jobType = job.find('.job-type, .type').first().text().trim();
    const postedDateText = job.find('.posted-date, .date-posted').first().text().trim();

    let postedDateIsoString = '';
    if (postedDateText) {
        try {
            const date = new Date(postedDateText);
            if (!isNaN(date.getTime())) {
                postedDateIsoString = date.toISOString();
            }
        } catch (e) {
            // Ignore parsing errors
        }
    }

    // Default company name from page title, or try to find it within the job item
    const companyName = job.find('.company-name, .company').first().text().trim() || 'Pathfinder International';

    // Basic type normalization
    let normalizedJobType = '';
    if (jobType) {
        const lowerCaseType = jobType.toLowerCase();
        if (lowerCaseType.includes('full-time')) {
            normalizedJobType = 'full_time';
        } else if (lowerCaseType.includes('part-time')) {
            normalizedJobType = 'part_time';
        } else if (lowerCaseType.includes('contract')) {
            normalizedJobType = 'contract';
        } else if (lowerCaseType.includes('internship')) {
            normalizedJobType = 'internship';
        } else if (lowerCaseType.includes('remote')) {
            normalizedJobType = 'remote';
        }
    }

    result.push({
        title: titleText,
        companyName: companyName,
        description: description,
        location: location,
        jobType: normalizedJobType,
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString,
        deadlineIsoString: '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
    });
});