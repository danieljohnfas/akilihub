var jobContainers = $('div.job-container, div.job-listing, div.job-posting, div.job-opening, div.job-vacancy, div.job-ad, article.job, section.job');
if (jobContainers.length > 0) {
    jobContainers.each(function () {
        var jobTitle = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
        if (jobTitle) {
            var job = {
                title: jobTitle,
                companyName: $(this).find('span.company-name, span.employer, span.organization').first().text().trim(),
                description: $(this).find('div.job-description, div.job-summary, div.job-details').first().text().trim(),
                location: $(this).find('span.location, span.job-location, span.work-location').first().text().trim(),
                jobType: $(this).find('span.job-type, span.employment-type, span.contract-type').first().text().trim(),
                sourceUrl: window.location.href,
                postedDateIsoString: $(this).find('span.posted-date, span.published-date').first().text().trim(),
                deadlineIsoString: $(this