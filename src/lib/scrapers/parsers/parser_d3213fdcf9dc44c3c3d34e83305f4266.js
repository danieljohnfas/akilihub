result = [];
if ($('div.job-listing').length) {
    $('div.job-listing').each((index, jobListing) => {
        const job = {};
        job.title = $(jobListing).find('h2.job-title').text().trim();
        job.companyName = $(jobListing).find('span.company-name').text().trim();
        job.description = $(jobListing).find('div.job-description').text().trim();
        job.location = $(jobListing).find('span.job-location').text().trim();
        job.jobType = $(jobListing).find('span.job-type').text().trim().toLowerCase().replace(/ /g, '_');
        job.sourceUrl = $(jobListing).find('a.job-link').attr('href');
        job.postedDateIsoString = $(jobListing).find('time.posted-date').attr('datetime');
        job.deadlineIsoString = $(jobListing).find('time.deadline').attr('datetime');
        const salaryText = $(jobListing).find('span.salary').text().trim();
        const salaryMatch = salaryText.match(/(\d+)[\-\–\—](\d+)/);
        if (salaryMatch) {
            job.salaryMin = parseInt(salaryMatch[1].replace(/[\$,]/g, ''), 10);
            job.salaryMax = parseInt(salaryMatch[2].replace(/[\$,]/g, ''), 10);
            job.salaryCurrency = salaryText.match(/[A-Z]{3}/)[0];
        }
        result.push(job);
    });
}