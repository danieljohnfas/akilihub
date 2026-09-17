$('.job-item, .career-opportunity, .job-listing, .opening-item').each((index, element) => {
    const job = {};
    const $element = $(element);

    // Title and Source URL
    const titleLink = $element.find('h2 a, h3 a, .job-title a, .career-title a').first();
    let titleText = '';
    let href = '';

    if (titleLink.length) {
        titleText = titleLink.text().trim();
        href = titleLink.attr('href');
    } else {
        // Fallback: Title might be directly in h2/h3/p without a link
        const directTitle = $element.find('h2, h3, .job-title, .career-title').first();
        if (directTitle.length) {
            titleText = directTitle.text().trim();
        }
    }

    if (titleText) {
        job.title = titleText;
    } else {
        // If no clear job title, this is not a valid job posting. Skip.
        return;
    }

    // Source URL
    if (href && href !== '#' && href !== '') {
        if (href.startsWith('http')) {
            job.sourceUrl = href;
        } else if (href.startsWith('/')) {
            // Assuming base URL for relative paths based on provided HTML context (Safaricom.co.ke)
            job.sourceUrl = 'https://www.safaricom.co.ke' + href;
        }
    }

    // Company Name (Deterministically "Safaricom" as it's their career page)
    job.companyName = 'Safaricom';

    // Location
    const locationElement = $element.find('.job-location, .location-text, .job-info span:contains("Location"), p:contains("Location")').first();
    if (locationElement.length) {
        let location = locationElement.text().replace(/Location:?\s*/i, '').trim();
        if (location) {
            job.location = location;
        }
    }

    // Description (often a short summary on the listing page)
    const descriptionElement = $element.find('.job-description, .description-snippet, .job-summary, .career-description').first();
    if (descriptionElement.length) {
        job.description = descriptionElement.text().trim();
    }

    // Job Type (full_time, part_time, contract, internship, remote)
    const jobTypeElement = $element.find('.job-type, .employment-type, .job-info span:contains("Type"), p:contains("Type")').first();
    if (jobTypeElement.length) {
        const typeText = jobTypeElement.text().toLowerCase();
        if (typeText.includes('full-time')) job.jobType = 'full_time';
        else if (typeText.includes('part-time')) job.jobType = 'part_time';
        else if (typeText.includes('contract')) job.jobType = 'contract';
        else if (typeText.includes('internship')) job.jobType = 'internship';
        else if (typeText.includes('remote') || typeText.includes('hybrid')) job.jobType = 'remote'; // Assuming hybrid can be considered remote for type
    }

    // Posted Date
    const postedDateElement = $element.find('.job-posted-date, .posted-on, .date-posted, .job-info span:contains("Posted")').first();
    if (postedDateElement.length) {
        let dateText = postedDateElement.text().replace(/Posted:?\s*/i, '').trim();
        if (dateText) {
            try {
                const date = new Date(dateText);
                if (!isNaN(date.getTime())) { // Check if date is valid
                    job.postedDateIsoString = date.toISOString();
                }
            } catch (e) {
                // Ignore parsing errors, postedDateIsoString remains undefined
            }
        }
    }

    // Salary, deadlineIsoString are generally not available on listing cards without explicit selectors.
    // They will remain undefined if not found, fulfilling the requirement to include if available.

    result.push(job);
});