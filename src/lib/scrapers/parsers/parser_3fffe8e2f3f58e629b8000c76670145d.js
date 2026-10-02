const jobs = $('.header').toArray().map(jobElement => {
    const $job = $(jobElement);
    const title = $job.find('.title').text().trim();
    const companyName = $job.find('.job-heading').text().trim();
    const location = $job.find('.header-content p').text().split(' - ')[0].trim();
    const dates = $job.find('.header-content p').text().split(' - ')[1].trim().split(' ');
    const postedDate = new Date(dates[0].replace(/\//g, '-') + 'T00:00:00Z').toISOString();
    const deadline = new Date(dates[1].replace(/\//g, '-') + 'T00:00:00Z').toISOString();
    const description = $job.closest('.content').find('.content-container').text().trim();

    return {
        title,
        companyName,
        description,
        location,
        postedDateIsoString: postedDate,
        deadlineIsoString: deadline,
        jobType: 'full_time', // Assuming full-time based on the context
        sourceUrl: 'https://example.com/job-url', // Replace with actual URL if available
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null
    };
});

jobs.forEach(job => result.push(job));