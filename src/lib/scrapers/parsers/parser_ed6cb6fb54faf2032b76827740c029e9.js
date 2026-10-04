try {
    const jobContainers = $('div.job-container, div.job, div.job-listing, div.job-post, div.job-opening');
    if (jobContainers.length === 0) {
        const jobListings = $('div, li, article');
        jobContainers.push(...jobListings.filter(function() {
            return $(this).find('h2, h3, h4, h5, h6').text().trim().toLowerCase().includes('job') || 
                   $(this).find('p, span').text().trim().toLowerCase().includes('job') || 
                   $(this).find('a').text().trim().toLowerCase().includes('job');
        }));
    }
    jobContainers.each(function() {
        const job = {};
        job.title = $(this).find('h2, h3, h4, h5, h6').first().text().trim();
        if (!job.title) return;
        job.companyName = $(this).find('span.company, span.employer, p.company').text().trim();
        job.description = $(this).find('div.description, p.description, div.job-description').text().trim();
        job.location = $(this).find('span.location, p.location