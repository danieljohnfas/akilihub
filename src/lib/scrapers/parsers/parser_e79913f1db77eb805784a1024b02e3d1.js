const jobContainers = $('div.job-listing, article.job-card, li.job-item, .job-opportunity, .career-entry');

jobContainers.each((index, element) => {
    const jobElement = $(element);
    const job = {};

    const titleLink = jobElement.find('h2 a, h3 a, .job-title-link');
    job.title = titleLink.text().trim() || jobElement.find('.job-title, h2, h3').first().text().trim();
    job.sourceUrl = titleLink.attr('href');

    job.companyName = jobElement.find('.company-name, .employer-name').text().trim() || 'Vodacom Group';

    job.location = jobElement.find('.job-location, .location').text().trim();

    job.description = jobElement.find('.job-description, .description-text').text().trim();

    let jobTypeRaw = jobElement.find('.job-type, .employment-type').text().trim().toLowerCase();
    if (jobTypeRaw.includes('full-time')) {
        job.jobType = 'full_time';
    } else if (jobTypeRaw.includes('part-time')) {
        job.jobType = 'part_time';
    } else if (jobTypeRaw.includes('contract')) {
        job.jobType = 'contract';
    } else if (jobTypeRaw.includes('internship') || jobTypeRaw.includes('intern')) {
        job.jobType = 'internship';
    } else if (jobTypeRaw.includes('remote')) {
        job.jobType = 'remote';
    }

    const postedDateText = jobElement.find('.posted-date, .date-posted').text().trim();
    if (postedDateText) {
        try {
            job.postedDateIsoString = new Date(postedDateText).toISOString();
        } catch (e) {
        }
    }

    const salaryText = jobElement.find('.salary, .salary-range').text().trim();
    if (salaryText) {
        const salaryMatch = salaryText.match(/(\$|€|£|R)?\s*([\d,]+(?:\.\d{2})?)\s*(?:[–-]\s*([\d,]+(?:\.\d{2})?))?/i);
        if (salaryMatch) {
            job.salaryCurrency = salaryMatch[1] || null;
            job.salaryMin = parseFloat(salaryMatch[2].replace(/,/g, ''));
            if (salaryMatch[3]) {
                job.salaryMax = parseFloat(salaryMatch[3].replace(/,/g, ''));
            }
        }
    }

    if (job.title) {
        result.push(job);
    }
});