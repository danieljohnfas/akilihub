$('.ajzjp-job-grid-item').each(function() {
    const jobElement = $(this);

    const titleElement = jobElement.find('.job-grid-item-title');
    const title = titleElement.text().trim();

    if (!title) {
        return;
    }

    const companyName = jobElement.find('.job-grid-item-company .company-name').text().trim() || null;
    const sourceUrl = jobElement.find('.job-grid-item-title-link').attr('href') || null;

    let location = jobElement.find('.job-grid-item-location').text().trim();
    // Remove potential icon text or leading whitespace
    location = location.replace(/^\s*\S*\s*/, '').trim(); 
    if (location === '') location = null;

    let jobTypeRaw = jobElement.find('.job-grid-item-type').text().trim();
    // Remove potential icon text or leading whitespace
    jobTypeRaw = jobTypeRaw.replace(/^\s*\S*\s*/, '').trim();

    let jobType = null;
    if (jobTypeRaw.toLowerCase().includes('full-time')) {
        jobType = 'full_time';
    } else if (jobTypeRaw.toLowerCase().includes('part-time')) {
        jobType = 'part_time';
    } else if (jobTypeRaw.toLowerCase().includes('contract')) {
        jobType = 'contract';
    } else if (jobTypeRaw.toLowerCase().includes('internship')) {
        jobType = 'internship';
    } else if (jobTypeRaw.toLowerCase().includes('remote')) {
        jobType = 'remote';
    }

    const postedDateText = jobElement.find('.job-grid-item-posted').text().trim();
    let postedDateIsoString = null;
    // For relative dates like "Posted X hours ago", we cannot reliably determine an ISO string without an external context or libraries.
    // Therefore, we leave it null as requested for an IsoString.

    let deadlineIsoString = null;
    const deadlineText = jobElement.find('.job-grid-item-deadline').text().trim();
    if (deadlineText.includes('Deadline:')) {
        const dateString = deadlineText.replace('Deadline:', '').trim();
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                deadlineIsoString = date.toISOString();
            }
        } catch (e) {
            // Error parsing date, leave as null
        }
    }

    const job = {
        title: title,
        companyName: companyName,
        description: null,
        location: location,
        jobType: jobType,
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString,
        deadlineIsoString: deadlineIsoString,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null
    };

    result.push(job);
});