try {
    const jobContainers = $('div.job-container, div.job-listing, div.job-item, div.job-post, div.job-opening, div.job-vacancy, div.job-ad');
    if (jobContainers.length === 0) {
        const jobListings = $('div.listing, div.listings, div.job, div.jobs');
        jobContainers.push(...jobListings);
    }
    if (jobContainers.length === 0) {
        result = [];
        return;
    }

    jobContainers.each(function () {
        const job = {};
        const title = $(this).find('h2, h3, h4, h5, h6').first().text().trim();
        if (!title) return;

        job.title = title;

        const companyName = $(this).find('span.company, span.company-name, div.company').text().trim();
        if (companyName) job.companyName = companyName;

        const description = $(this).find('div.description, div.job-description, p.description').text().trim();
        if (description) job.description = description;

        const location = $(this).find('span.location, span.job-location, div.location').text().trim();
        if (location)