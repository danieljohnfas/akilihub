try {
    var jobContainers = $('div.job-container, div.job, div.job-listing, div.job-post, div.job-opening');
    if (jobContainers.length === 0) {
        jobContainers = $('article, div.post, div.listing');
    }
    jobContainers.each(function() {
        var job = {};
        job.title = $(this).find('h2, h3, h4, h5, h6').first().text().trim();
        if (!job.title) return;
        job.companyName = $(this).find('span.company, span.employer, span.organization').text().trim();
        job.description = $(this).find('div.description, div.job-description, div.post-content').text().trim();
        job.location = $(this).find('span.location, span.place, span.city').text().trim();
        job.jobType = $(this).find('span.type, span.category, span.job-type').text().trim().toLowerCase();
        if (job.jobType === 'full time' || job.jobType === 'full-time') job.jobType = 'full_time';
        else if (job.jobType === 'part time' || job.jobType === 'part-time') job.jobType