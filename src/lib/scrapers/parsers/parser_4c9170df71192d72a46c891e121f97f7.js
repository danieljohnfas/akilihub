var jobContainers = $('.job-listing, .posting, .job-card, .listing, .job-item');
jobContainers.each(function() {
    var $container = $(this);
    var job = {};

    var title = $container.find('h2, h3, h4, h5, h6, h1').first().text().trim();
    if (title) job.title = title;

    var company = $container.find('.company, .org, .employer').first().text().trim();
    if (company) job.companyName = company;

    var description = $container.find('p, div, li').first().text().trim();
    if (description) job.description = description;

    var location = $container.find('.location, .city, .place').first().text().trim();
    if (location) job.location = location;

    var jobType = $container.find('.job-type, .position-type').first().text().trim();
    if (jobType) job.jobType = jobType;

    var sourceUrl = $container.attr('href') || $container.find('a').first().attr('href');
    if (sourceUrl) job.sourceUrl = sourceUrl;

    var postedDate = $container.find('.posted-date, .date, .published').first().text().trim();
    if (postedDate) job.postedDateIsoString = postedDate;

    var deadline = $container.find('.deadline, .end-date').first().text().trim();
    if (deadline) job.deadlineIsoString = deadline;

    var salaryMinText = $container.find('.salary-min, .min-salary').first().text().trim();
    var salaryMaxText = $container.find('.salary-max, .max-salary').first().text().trim();

    if (salaryMinText) job.salaryMin = parseFloat(salaryMinText);
    if (salaryMaxText) job.salaryMax = parseFloat(salaryMaxText);

    if (job.title) {
        result.push(job);
    }
});