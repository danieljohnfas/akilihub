const jobContainers = $('.single-post');

jobContainers.each((index, container) => {
    const job = {};

    job.title = $(container).find('.entry-title').text().trim();
    job.companyName = $(container).find('meta[property="og:site_name"]').attr('content');
    job.description = $(container).find('.entry-content').text().trim();
    job.location = $(container).find('.job-location').text().trim();
    job.jobType = $(container).find('.job-type').text().trim().toLowerCase();
    job.sourceUrl = $(container).find('meta[property="og:url"]').attr('content');
    job.postedDateIsoString = $(container).find('meta[property="article:published_time"]').attr('content');
    job.deadlineIsoString = $(container).find('.job-deadline').text().trim();
    job.salaryMin = parseInt($(container).find('.job-salary-min').text().trim().replace(/[^0-9]/g, ''));
    job.salaryMax = parseInt($(container).find('.job-salary-max').text().trim().replace(/[^0-9]/g, ''));
    job.salaryCurrency = $(container).find('.job-salary-currency').text().trim();

    result.push(job);
});