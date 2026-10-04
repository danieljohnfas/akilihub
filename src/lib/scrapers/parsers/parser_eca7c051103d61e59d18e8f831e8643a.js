var jobContainers = $('article, li, div').filter(function(element) {
    return $(element).find('h2, h3, .job, .post').length > 0;
});
if (jobContainers.length > 0) {
    jobContainers.each(function() {
        var title = $(this).find('h2, h3, .title').first().text().trim();
        var company = $(this).find('.company, .org-name').first().text().trim();
        var description = $(this).find('.description, .job-desc').first().text().substring(0, 100);
        var location = $(this).find('.location, .city').first().text().trim();
        var jobType = $(this).find('.type, .job-type').first().text().trim();
        var sourceUrl = $(this).attr('href') || $(this).find('a[href]').first().attr('href');
        var postedDate = $(this).find('.date, .posted-date').first().text().trim();
        var deadline = $(this).find('.deadline, .end-date').first().text().trim();
        var salaryMinText = $(this).find('.salary-min').text().replace(/[^0-9.-]/g, '');
        var salaryMaxText = $(this).find('.salary-max').text().replace(/[^0-9.-]/g, '');
        var salaryCurrency = $(this).find('.currency').text().trim();
        if (title) {
            result.push({
                title: title,
                companyName: company,
                description: description,
                location: location,
                jobType: jobType,
                sourceUrl: sourceUrl,
                postedDateIsoString: postedDate,
                deadlineIsoString: deadline,
                salaryMin: parseFloat(salaryMinText),
                salaryMax: parseFloat(salaryMaxText),
                salaryCurrency: salaryCurrency
            });
        }
    });
}