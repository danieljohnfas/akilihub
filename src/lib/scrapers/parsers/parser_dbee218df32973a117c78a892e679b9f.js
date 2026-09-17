$('.job-listing-item').each((i, el) => {
    const job = $(el);

    const titleElement = job.find('.job-title a, .job-title');
    const title = titleElement.text().trim() || null;

    if (!title) {
        return;
    }

    const companyName = job.find('.company-name').text().trim() || null;
    const location = job.find('.job-location').text().trim() || null;
    const description = job.find('.job-description').text().trim() || null;
    const sourceUrl = titleElement.attr('href') ? new URL(titleElement.attr('href'), 'https://example.com').href : null;

    let jobType = null;
    const typeText = job.find('.job-type').text().trim().toLowerCase();
    if (typeText.includes('full-time')) jobType = 'full_time';
    else if (typeText.includes('part-time')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('internship')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    let postedDateIsoString = null;
    const dateText = job.find('.posted-date').text().trim();
    try {
        if (dateText) {
            const date = new Date(dateText);
            if (!isNaN(date.getTime())) {
                postedDateIsoString = date.toISOString();
            }
        }
    } catch (e) { /* Swallowing parsing errors */ }

    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;
    const salaryText = job.find('.salary').text().trim();
    const salaryMatch = salaryText.match(/\$?([0-9,]+)\s*(?:-\s*\$?([0-9,]+))?/);
    if (salaryMatch && salaryMatch[1]) {
        salaryCurrency = salaryText.includes('$') ? '$' : null;
        salaryMin = parseFloat(salaryMatch[1].replace(/,/g, ''));
        if (salaryMatch[2]) {
            salaryMax = parseFloat(salaryMatch[2].replace(/,/g, ''));
        } else {
            // If only one number is found, it might be both min and max (e.g., "Salary: $50000")
            // Or just a single value without a range. We'll set max to min in this case for simplicity
            salaryMax = salaryMin;
        }
    }


    result.push({
        title,
        companyName,
        description,
        location,
        jobType,
        sourceUrl,
        postedDateIsoString,
        deadlineIsoString: null,
        salaryMin,
        salaryMax,
        salaryCurrency,
    });
});