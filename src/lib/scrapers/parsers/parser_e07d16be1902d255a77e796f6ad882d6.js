try {
    var jobContainers = $('div.job-container, div.job-listing, div.job-post, div.job-opening');
    if (jobContainers.length === 0) {
        jobContainers = $('article.job, section.job, li.job');
    }
    jobContainers.each(function () {
        var job = {};
        job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
        if (!job.title) return;
        job.companyName = $(this).find('span.company, span.employer, span.organization').text().trim();
        job.description = $(this).find('div.description, div.job-description, p.description').text().trim();
        job.location = $(this).find('span.location, span.place, span.city').text().trim();
        job.jobType = $(this).find('span.type, span.category, span.job-type').text().trim();
        job.sourceUrl = $(this).find('a').attr('href');
        job.postedDateIsoString = $(this).find('span.date, span.posted, span.published').text().trim();
        job.deadlineIsoString = $(this).find('