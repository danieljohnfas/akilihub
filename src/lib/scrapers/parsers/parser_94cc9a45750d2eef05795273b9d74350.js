const jobListings = $('.entry-content ul li').map((i, el) => {
    const job = {};
    const text = $(el).text().trim();

    const match = text.match(/(.*?) at (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+?), (.+)/);
    if (match) {
        job.title = match[1].trim();
        job.companyName = match[2].trim();
        job.location = match[3].trim();
        job.jobType = 'full_time'; // Assuming full-time by default, adjust if necessary
        job.sourceUrl = 'https://www.elimuyako.co.tz/2026/09/226-teaching-vacancies-at-ajira-portal-september-2026/';
        job.postedDateIsoString = '2026-09-04T15:36:11+00:00'; // Extracted from meta property
        job.deadlineIsoString = ''; // Assuming not provided in the sample HTML
        job.salaryMin = null;
        job.salaryMax = null;
        job.salaryCurrency = null;
    }

    return job;
}).get();

jobListings.forEach(job => {
    if (job.title) {
        result.push(job);
    }
});