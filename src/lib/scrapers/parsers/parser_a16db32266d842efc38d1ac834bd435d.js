var jobContainers = $('div.job-container, div.job, div.job-listing, div.job-posting, div.job-opening, div.vacancy, div.employment-opportunity');

if (jobContainers.length === 0) {
    var jobTitle = $('h1, h2, h3, h4, h5, h6').filter(function() {
        return $(this).text().trim().toLowerCase().includes('job') || $(this).text().trim().toLowerCase().includes('vacancy') || $(this).text().trim().toLowerCase().includes('employment opportunity');
    });

    if (jobTitle.length > 0) {
        var job = {};
        job.title = jobTitle.text().trim();
        job.companyName = $('span.company-name, span.organization, span.employer').text().trim() || '';
        job.description = $('div.job-description, div.job-details, div.vacancy-description').text().trim() || '';
        job.location = $('span.location, span.job-location').text().trim() || '';
        job.sourceUrl = window.location.href;
        result.push(job);
    }
} else {
    jobContainers.each(function() {
        var job = {};
        job.title = $(this).find