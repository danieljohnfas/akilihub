const jobContainers = $('div.job-container, div.job, div.job-posting, div.job-listing, div.job-item');

if (jobContainers.length === 0) {
    const jobTitle = $('title').text();
    const jobDescription = $('div.job-description, div.job-detail, div.job-content').text();
    const companyName = $('span.company-name, div.company, div.employer').text();
    const location = $('span.location, div.location, div.job-location').text();
    const jobType = $('span.job-type, div.job-type, div.employment-type').text();
    const sourceUrl = $('meta[property="og:url"]').attr('content');
    const postedDateIsoString = $('span.posted-date, div.posted-date, div.job-posted').text();
    const deadlineIsoString = $('span.deadline, div.deadline, div.job-deadline').text();
    const salaryMin = $('span.salary-min, div.salary-min, div.min-salary').text();
    const salaryMax = $('span.salary-max, div.salary-max, div.max-salary').text();
    const salaryCurrency = $('span.salary-currency, div.salary-currency, div.currency').text();

    if (job