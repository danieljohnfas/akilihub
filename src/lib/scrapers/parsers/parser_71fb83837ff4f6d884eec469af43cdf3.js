const jobListings = $('article.post, div.job-listing, div.job-card, .listing-item');

jobListings.each((index, element) => {
    const job = {};
    const $el = $(element);

    // Title
    const titleElement = $el.find('h2.entry-title, h3.job-title, .job-title a, .listing-title a').first();
    job.title = titleElement.text().trim();

    // Source URL
    job.sourceUrl = titleElement.attr('href') || '';

    // Company Name
    const companyElement = $el.find('.job-company, .company-name, .entry-meta .byline, .employer-name').first();
    job.companyName = companyElement.text().trim() || '';

    // Location
    const locationElement = $el.find('.job-location, .location, .entry-meta .job-location-meta, .listing-location').first();
    job.location = locationElement.text().trim() || '';

    // Description
    const descriptionElement = $el.find('.job-description, .entry-content p, .job-summary, .listing-content').first();
    job.description = descriptionElement.text().trim() || '';

    // Job Type
    const jobTypeKeywords = {
        'full-time': 'full_time', 'full time': 'full_time',
        'part-time': 'part_time', 'part time': 'part_time',
        'contract': 'contract',
        'internship': 'internship', 'intern': 'internship',
        'remote': 'remote', 'work from home': 'remote'
    };
    let detectedJobType = '';
    const textToCheckForType = ($el.text() + job.title + job.description + job.location).toLowerCase();
    for (const keyword in jobTypeKeywords) {
        if (textToCheckForType.includes(keyword)) {
            detectedJobType = jobTypeKeywords[keyword];
            break;
        }
    }
    job.jobType = detectedJobType;

    // Posted Date
    const dateElement = $el.find('.job-date, .posted-on time, .date-posted, .job-listing-date').first();
    const dateText = dateElement.attr('datetime') || dateElement.text().trim();
    try {
        if (dateText) {
            const date = new Date(dateText);
            if (!isNaN(date.getTime())) {
                job.postedDateIsoString = date.toISOString();
            }
        }
    } catch (e) { /* ignore */ }

    // Deadline Date
    const deadlineElement = $el.find('.job-deadline, .deadline-date, .application-deadline').first();
    const deadlineText = deadlineElement.attr('datetime') || deadlineElement.text().trim();
    try {
        if (deadlineText) {
            const deadlineDate = new Date(deadlineText);
            if (!isNaN(deadlineDate.getTime())) {
                job.deadlineIsoString = deadlineDate.toISOString();
            }
        }
    } catch (e) { /* ignore */ }

    // Salary Min/Max/Currency
    const salaryText = $el.find('.job-salary, .salary-range, .salary, .listing-salary').first().text().trim();
    if (salaryText) {
        const cleanedSalaryText = salaryText.replace(/,/g, ''); // Remove commas for number parsing
        const currencyMatches = cleanedSalaryText.match(/(\$|€|£|Ksh|USD|EUR|GBP|KES)/i);
        if (currencyMatches && currencyMatches[1]) {
            job.salaryCurrency = currencyMatches[1].toUpperCase().replace('KSH', 'KES');
        }

        const numberMatches = cleanedSalaryText.match(/(\d+\.?\d*)\s*(?:-|to)\s*(\d+\.?\d*)/i); // e.g., "1000 - 2000"
        if (numberMatches) {
            job.salaryMin = parseFloat(numberMatches[1]);
            job.salaryMax = parseFloat(numberMatches[2]);
        } else {
            const singleNumberMatch = cleanedSalaryText.match(/(\d+\.?\d*)/); // e.g., "1000"
            if (singleNumberMatch) {
                job.salaryMin = parseFloat(singleNumberMatch[1]);
                job.salaryMax = parseFloat(singleNumberMatch[1]); // Assume if only one, it's min and max
            }
        }
    }

    if (job.title) {
        result.push(job);
    }
});