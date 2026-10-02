if ($('div.job-listing').length > 0) {
    $('div.job-listing').each((index, jobElement) => {
        const job = {};
        job.title = $(jobElement).find('h2.job-title').text().trim();
        job.companyName = $(jobElement).find('div.company-name').text().trim();
        job.description = $(jobElement).find('div.job-description').text().trim();
        job.location = $(jobElement).find('div.job-location').text().trim();
        job.jobType = $(jobElement).find('div.job-type').text().trim().toLowerCase().replace(/\s+/g, '_');
        job.sourceUrl = $(jobElement).find('a.job-link').attr('href');
        job.postedDateIsoString = $(jobElement).find('div.posted-date').text().trim();
        job.deadlineIsoString = $(jobElement).find('div.deadline').text().trim();
        const salaryText = $(jobElement).find('div.salary').text().trim();
        const salaryMatch = salaryText.match(/\b\d[\d,]*\b/g);
        if (salaryMatch) {
            job.salaryMin = parseInt(salaryMatch[0].replace(/,/g, ''), 10);
            job.salaryMax = salaryMatch.length > 1 ? parseInt(salaryMatch[1].replace(/,/g, ''), 10) : undefined;
        }
        job.salaryCurrency = (salaryText.match(/[A-Z]{3}/) || [])[0];
        
        result.push(job);
    });
} else {
    // No job listings found
    result = [];
}